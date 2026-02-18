// sql.js database wrapper for Electron
// sql.js is a pure JavaScript SQLite implementation that doesn't require native compilation
const initSqlJs = require('sql.js');
const { app } = require('electron');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

class Database {
  constructor() {
    this.db = null;
    this.dbPath = null;
  }

  async initialize() {
    // Get the WASM file path from node_modules
    const wasmPath = path.join(
      require.resolve('sql.js'),
      '..',
      'sql-wasm.wasm'
    );
    
    // Read the WASM file as a buffer
    const wasmBinary = fs.readFileSync(wasmPath);
    
    // Initialize sql.js with the WASM binary
    const SQL = await initSqlJs({
      wasmBinary
    });

    // Database path in user data directory
    const userDataPath = app.getPath('userData');
    const configPath = path.join(userDataPath, 'config.json');
    
    // Check for custom path in config
    let dbFolder = userDataPath;
    try {
      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        if (config.dbPath && fs.existsSync(config.dbPath)) {
          dbFolder = config.dbPath;
        }
      }
    } catch (error) {
      console.error('Error reading config.json:', error);
    }

    this.dbPath = path.join(dbFolder, 'restaurant_pos.db');
    
    // Load existing database or create new one
    if (fs.existsSync(this.dbPath)) {
      const fileBuffer = fs.readFileSync(this.dbPath);
      this.db = new SQL.Database(fileBuffer);
    } else {
      this.db = new SQL.Database();
    }
    
    // Initialize schema
    await this.initSchema();
    
    console.log('Database initialized at:', this.dbPath);
    return this;
  }

  async initSchema() {
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf-8');
    
    // Execute schema SQL
    this.db.run(schema);

    // Run migrations for existing databases
    this.migrateSchema();
    
    // Create expenses table
    this.db.run(`CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      reason TEXT,
      amount REAL,
      explanation TEXT,
      employee_id TEXT,
      employee_name TEXT,
      paid_from TEXT,
      date TEXT,
      created_at TEXT,
      updated_at TEXT
    )`);

    // Create shifts table
    this.db.run(`CREATE TABLE IF NOT EXISTS shifts (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id),
      start_time TEXT NOT NULL,
      end_time TEXT,
      start_cash REAL DEFAULT 0,
      end_cash REAL,
      status TEXT CHECK(status IN ('active', 'closed')) DEFAULT 'active',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`);

    // Create indexes
    try {
      this.db.run("CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date)");
    } catch (e) {}

    // Save to disk
    this.save();
  }

  migrateSchema() {
    try {
      // Add is_deleted to order_items if missing
      this.db.run("ALTER TABLE order_items ADD COLUMN is_deleted INTEGER DEFAULT 0");
    } catch (error) {
      if (!error.message.includes("duplicate column name")) console.log('Migration note:', error.message);
    }

    try {
      // Add variants/addons to menu_items
      this.db.run("ALTER TABLE menu_items ADD COLUMN variants TEXT");
    } catch (error) { if (!error.message.includes("duplicate column name")) console.log('Migration note:', error.message); }

    try {
      this.db.run("ALTER TABLE menu_items ADD COLUMN addons TEXT");
    } catch (error) { if (!error.message.includes("duplicate column name")) console.log('Migration note:', error.message); }

    try {
      this.db.run("ALTER TABLE menu_items ADD COLUMN is_favorite INTEGER DEFAULT 0");
    } catch (error) { if (!error.message.includes("duplicate column name")) console.log('Migration note:', error.message); }

    try {
      // Add is_hold to orders
      this.db.run("ALTER TABLE orders ADD COLUMN is_hold INTEGER DEFAULT 0");
    } catch (error) { if (!error.message.includes("duplicate column name")) console.log('Migration note:', error.message); }

    try {
      // Add variant/addons to order_items
      this.db.run("ALTER TABLE order_items ADD COLUMN variant TEXT");
    } catch (error) { if (!error.message.includes("duplicate column name")) console.log('Migration note:', error.message); }

    try {
      this.db.run("ALTER TABLE order_items ADD COLUMN addons TEXT");
    } catch (error) { if (!error.message.includes("duplicate column name")) console.log('Migration note:', error.message); }

    try {
       // Add delivery_charge, container_charge, and customer_paid to orders
       try { this.db.run("ALTER TABLE orders ADD COLUMN delivery_charge REAL DEFAULT 0"); } catch (e) {}
       try { this.db.run("ALTER TABLE orders ADD COLUMN container_charge REAL DEFAULT 0"); } catch (e) {}
       try { this.db.run("ALTER TABLE orders ADD COLUMN customer_paid REAL DEFAULT 0"); } catch (e) {}
    } catch (error) { if (!error.message.includes("duplicate column name")) console.log('Migration note:', error.message); }

    try {
        // Add urgency and chef_instructions to orders
        try { this.db.run("ALTER TABLE orders ADD COLUMN urgency TEXT DEFAULT 'normal'"); } catch (e) {}
        try { this.db.run("ALTER TABLE orders ADD COLUMN chef_instructions TEXT"); } catch (e) {}
     } catch (error) { if (!error.message.includes("duplicate column name")) console.log('Migration note:', error.message); }

    try {
        // Add tax_rate to order_items
        try { this.db.run("ALTER TABLE order_items ADD COLUMN tax_rate REAL DEFAULT 0"); } catch (e) {}
     } catch (error) { if (!error.message.includes("duplicate column name")) console.log('Migration note:', error.message); }

    try {
      // Create addons table if not exists (for existing databases)
      this.db.run(`
        CREATE TABLE IF NOT EXISTS addons (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            price REAL NOT NULL,
            type TEXT CHECK(type IN ('veg', 'non-veg')) DEFAULT 'veg',
            is_available INTEGER DEFAULT 1,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            synced_at TEXT,
            is_deleted INTEGER DEFAULT 0
        )
      `);
    } catch (error) { console.log('Migration note:', error.message); }

    try {
      // Add inventory_transactions table for history
      this.db.run(`
        CREATE TABLE IF NOT EXISTS inventory_transactions (
            id TEXT PRIMARY KEY,
            inventory_id TEXT REFERENCES inventory(id),
            type TEXT CHECK(type IN ('add', 'subtract', 'adjustment')),
            quantity REAL NOT NULL,
            current_stock_snapshot REAL,
            reason TEXT,
            notes TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            is_deleted INTEGER DEFAULT 0
        )
      `);
    } catch (error) { console.log('Migration note:', error.message); }

    // Migrate orders table to support 'held' status in CHECK constraint
    this.migrateOrdersTableForHeldStatus();

    // Migrate orders table to support 'due' payment method in CHECK constraint
    this.migrateOrdersTableForDuePayment();

    // Seed sample products with variants
    this.seedSampleProducts();
  }

  migrateOrdersTableForDuePayment() {
    try {
      // Check if migration is needed by trying to check schema
      const testResult = this.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='orders'");
      // If table exists and SQL doesn't contain 'due' in payment_method check
      if (testResult.length > 0 && testResult[0].sql && !testResult[0].sql.includes("'due'")) {
        console.log('Migrating orders table to support due payment method...');
        
        // Backup existing orders (chk if backup exists first to be safe, drop if so)
        this.db.run(`DROP TABLE IF EXISTS orders_backup_due`);
        this.db.run(`CREATE TABLE orders_backup_due AS SELECT * FROM orders`);
        
        // Drop old table
        this.db.run(`DROP TABLE orders`);
        
        // Create new orders table with updated CHECK constraint for payment_method
        this.db.run(`
          CREATE TABLE orders (
            id TEXT PRIMARY KEY,
            order_number INTEGER NOT NULL,
            order_type TEXT CHECK(order_type IN ('dine_in', 'takeaway', 'delivery')) DEFAULT 'dine_in',
            table_number TEXT,
            customer_name TEXT,
            customer_phone TEXT,
            subtotal REAL NOT NULL,
            tax_amount REAL DEFAULT 0,
            discount_amount REAL DEFAULT 0,
            discount_reason TEXT,
            total_amount REAL NOT NULL,
            delivery_charge REAL DEFAULT 0,
            container_charge REAL DEFAULT 0,
            customer_paid REAL DEFAULT 0,
            payment_method TEXT CHECK(payment_method IN ('cash', 'card', 'upi', 'mixed', 'due')),
            payment_status TEXT CHECK(payment_status IN ('pending', 'partial', 'completed')) DEFAULT 'pending',
            status TEXT CHECK(status IN ('active', 'completed', 'cancelled', 'held')) DEFAULT 'active',
            is_hold INTEGER DEFAULT 0,
            notes TEXT,
            urgency TEXT CHECK(urgency IN ('normal', 'urgent', 'critical')) DEFAULT 'normal',
            chef_instructions TEXT,
            cashier_id TEXT REFERENCES users(id),
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            completed_at TEXT,
            synced_at TEXT,
            is_deleted INTEGER DEFAULT 0
          )
        `);
        
        // Restore data
        // We need to list columns explicitly to avoid issues if schema changed order or count invisibly, 
        // but SELECT * is usually fine if structure is identical except constraints.
        // However, safely assuming columns match name-for-name is better.
        // For simplicity in this specific constraint update, we'll use SELECT * as we did in held status migration.
        this.db.run(`INSERT INTO orders SELECT * FROM orders_backup_due`);
        
        // Re-create indexes
        this.db.run(`CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at)`);
        this.db.run(`CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)`);
        this.db.run(`CREATE INDEX IF NOT EXISTS idx_orders_date ON orders(date(created_at))`);

        // Drop backup
        this.db.run(`DROP TABLE orders_backup_due`);
        
        console.log('Orders table migration for due payment completed.');
        this.save();
      }
    } catch (error) {
      console.log('Orders table migration (due payment) note:', error.message);
      // If it fails, restore from backup if main table is gone
      try {
         const checkMain = this.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='orders'");
         if (checkMain.length === 0) {
             console.log('Restoring from backup due to migration failure...');
             this.db.run(`ALTER TABLE orders_backup_due RENAME TO orders`);
         }
      } catch (e) {
          console.error('Critical failure in migration recovery:', e);
      }
    }
  }

  migrateOrdersTableForHeldStatus() {
    try {
      // Check if migration is needed by trying to insert a held status
      const testResult = this.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='orders'");
      if (testResult.length > 0 && testResult[0].sql && !testResult[0].sql.includes("'held'")) {
        console.log('Migrating orders table to support held status...');
        
        // Backup existing orders
        this.db.run(`CREATE TABLE IF NOT EXISTS orders_backup AS SELECT * FROM orders`);
        
        // Drop old table
        this.db.run(`DROP TABLE orders`);
        
        // Create new orders table with updated CHECK constraint
        this.db.run(`
          CREATE TABLE orders (
            id TEXT PRIMARY KEY,
            order_number INTEGER NOT NULL,
            order_type TEXT CHECK(order_type IN ('dine_in', 'takeaway', 'delivery')) DEFAULT 'dine_in',
            table_number TEXT,
            customer_name TEXT,
            customer_phone TEXT,
            subtotal REAL NOT NULL,
            tax_amount REAL DEFAULT 0,
            discount_amount REAL DEFAULT 0,
            discount_reason TEXT,
            total_amount REAL NOT NULL,
            payment_method TEXT CHECK(payment_method IN ('cash', 'card', 'upi', 'mixed')),
            payment_status TEXT CHECK(payment_status IN ('pending', 'partial', 'completed')) DEFAULT 'pending',
            status TEXT CHECK(status IN ('active', 'completed', 'cancelled', 'held')) DEFAULT 'active',
            is_hold INTEGER DEFAULT 0,
            notes TEXT,
            cashier_id TEXT REFERENCES users(id),
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
            synced_at TEXT,
            is_deleted INTEGER DEFAULT 0
          )
        `);
        
        // Restore data
        this.db.run(`INSERT INTO orders SELECT * FROM orders_backup`);
        
        // Drop backup
        this.db.run(`DROP TABLE orders_backup`);
        
        console.log('Orders table migration completed.');
        this.save();
      }
    } catch (error) {
      console.log('Orders table migration note:', error.message);
    }
  }

  seedSampleProducts() {
    try {
      // Check if we already have products with variants
      const existingWithVariants = this.execute("SELECT id FROM menu_items WHERE variants IS NOT NULL AND variants != '' LIMIT 1");
      if (existingWithVariants.length > 0) return; // Already seeded

      console.log('Seeding sample products with variants and add-ons...');

      // Add Pizza category
      const pizzaCatId = 'cat_pizza';
      this.db.run(`INSERT OR IGNORE INTO categories (id, name, description, display_order, is_active) VALUES (?, ?, ?, ?, ?)`,
        [pizzaCatId, 'Pizza', 'Delicious pizzas', 0, 1]);

      // Pizza variants and add-ons
      const pizzaVariants = JSON.stringify([
        { name: 'Small (6")', price: 199 },
        { name: 'Medium (9")', price: 299 },
        { name: 'Large (12")', price: 449 },
        { name: 'Extra Large (14")', price: 599 }
      ]);

      const pizzaAddons = JSON.stringify([
        { name: 'Extra Cheese', price: 50, type: 'veg' },
        { name: 'Jalapenos', price: 30, type: 'veg' },
        { name: 'Olives', price: 40, type: 'veg' },
        { name: 'Mushrooms', price: 35, type: 'veg' },
        { name: 'Chicken Tikka', price: 80, type: 'non-veg' },
        { name: 'Pepperoni', price: 70, type: 'non-veg' }
      ]);

      // Insert pizzas
      const pizzas = [
        { id: 'pizza_001', name: 'Margherita Pizza', desc: 'Classic tomato and mozzarella', price: 199, veg: 1 },
        { id: 'pizza_002', name: 'Pepperoni Pizza', desc: 'Loaded with pepperoni slices', price: 249, veg: 0 },
        { id: 'pizza_003', name: 'Veggie Supreme', desc: 'Loaded with fresh vegetables', price: 229, veg: 1 },
        { id: 'pizza_004', name: 'Chicken BBQ', desc: 'BBQ chicken with onions', price: 279, veg: 0 }
      ];

      for (const pizza of pizzas) {
        this.db.run(`
          INSERT OR IGNORE INTO menu_items (id, category_id, name, description, price, tax_rate, is_vegetarian, is_available, variants, addons)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [pizza.id, pizzaCatId, pizza.name, pizza.desc, pizza.price, 5, pizza.veg, 1, pizzaVariants, pizzaAddons]);
      }

      // Add Burger category with variants
      const burgerCatId = 'cat_burgers';
      this.db.run(`INSERT OR IGNORE INTO categories (id, name, description, display_order, is_active) VALUES (?, ?, ?, ?, ?)`,
        [burgerCatId, 'Burgers', 'Juicy burgers', 1, 1]);

      const burgerVariants = JSON.stringify([
        { name: 'Single Patty', price: 149 },
        { name: 'Double Patty', price: 229 },
        { name: 'Triple Patty', price: 299 }
      ]);

      const burgerAddons = JSON.stringify([
        { name: 'Extra Cheese', price: 25, type: 'veg' },
        { name: 'Bacon', price: 50, type: 'non-veg' },
        { name: 'Fried Egg', price: 30, type: 'non-veg' },
        { name: 'Extra Patty', price: 80, type: 'non-veg' }
      ]);

      const burgers = [
        { id: 'burger_001', name: 'Classic Burger', desc: 'Beef patty with fresh veggies', price: 149, veg: 0 },
        { id: 'burger_002', name: 'Veggie Burger', desc: 'Crispy veg patty', price: 129, veg: 1 },
        { id: 'burger_003', name: 'Chicken Burger', desc: 'Grilled chicken patty', price: 169, veg: 0 }
      ];

      for (const burger of burgers) {
        this.db.run(`
          INSERT OR IGNORE INTO menu_items (id, category_id, name, description, price, tax_rate, is_vegetarian, is_available, variants, addons)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [burger.id, burgerCatId, burger.name, burger.desc, burger.price, 5, burger.veg, 1, burgerVariants, burgerAddons]);
      }

      this.save();
      console.log('Sample products seeded successfully.');
    } catch (error) {
      console.log('Sample product seeding note:', error.message);
    }
  }

  save() {
    if (this.db && this.dbPath) {
      const data = this.db.export();
      const buffer = Buffer.from(data);
      fs.writeFileSync(this.dbPath, buffer);
    }
  }

  close() {
    if (this.db) {
      this.save();
      this.db.close();
    }
  }

  // Generic select method
  select(table, where = {}, orderBy = null) {
    let query = `SELECT * FROM ${table}`;
    const params = [];
    const conditions = [];

    // Build WHERE clause
    for (const [key, value] of Object.entries(where)) {
      conditions.push(`${key} = ?`);
      params.push(value);
    }

    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }

    if (orderBy) {
      query += ` ORDER BY ${orderBy}`;
    }

    const stmt = this.db.prepare(query);
    stmt.bind(params);
    
    const results = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();
    
    return results;
  }

  // Execute raw SQL
  execute(sql, params = []) {
    const stmt = this.db.prepare(sql);
    stmt.bind(params);
    
    const results = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();
    
    this.save();
    return results;
  }

  // Run SQL without returning results
  run(sql, params = []) {
    if (params.length > 0) {
      const stmt = this.db.prepare(sql);
      stmt.run(params);
      stmt.free();
    } else {
      this.db.run(sql);
    }
    this.save();
  }

  // Insert and return last inserted id
  insert(table, data) {
    const columns = Object.keys(data);
    const placeholders = columns.map(() => '?').join(', ');
    const values = Object.values(data);
    
    const query = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`;
    this.db.run(query, values);
    this.save();
    
    // Get last insert rowid
    const result = this.execute('SELECT last_insert_rowid() as id');
    return result[0]?.id;
  }

  // Update records
  update(table, data, where) {
    const setClauses = Object.keys(data).map(k => `${k} = ?`);
    const whereClauses = Object.keys(where).map(k => `${k} = ?`);
    
    const query = `UPDATE ${table} SET ${setClauses.join(', ')} WHERE ${whereClauses.join(' AND ')}`;
    const params = [...Object.values(data), ...Object.values(where)];
    
    this.db.run(query, params);
    this.save();
  }

  // Soft delete records
  delete(table, where) {
    const whereClauses = Object.keys(where).map(k => `${k} = ?`);
    const query = `UPDATE ${table} SET is_deleted = 1 WHERE ${whereClauses.join(' AND ')}`;
    
    this.db.run(query, Object.values(where));
    this.save();
  }

  // ===== Sync Queue Operations =====
  addToSyncQueue(entityType, entityId, operation, data) {
    // Map operation names to valid SQL operations
    const operationMap = {
      'create': 'INSERT',
      'insert': 'INSERT',
      'update': 'UPDATE',
      'delete': 'DELETE',
    };
    const sqlOperation = operationMap[operation.toLowerCase()] || operation.toUpperCase();
    
    return this.insert('sync_queue', {
      id: uuidv4(),
      table_name: entityType,
      record_id: entityId,
      operation: sqlOperation,
      payload: JSON.stringify(data),
      status: 'pending',
      retry_count: 0,
      created_at: new Date().toISOString(),
    });
  }

  getAllOrders(limit = 50) {
    return this.execute(`SELECT * FROM orders WHERE is_deleted = 0 ORDER BY created_at DESC LIMIT ?`, [limit]);
  }

  getRecentOrders(limit = 10) {
    const orders = this.execute(`SELECT * FROM orders WHERE is_deleted = 0 ORDER BY created_at DESC LIMIT ?`, [limit]);
    
    // Enrich with items for display
    for (const order of orders) {
      order.items = this.execute(`
        SELECT * FROM order_items 
        WHERE order_id = ? AND is_deleted = 0
      `, [order.id]);
    }
    
    return orders;
  }

  getPendingSyncItems(limit = 50) {
    return this.execute(
      `SELECT * FROM sync_queue WHERE status = 'pending' ORDER BY created_at ASC LIMIT ?`,
      [limit]
    );
  }

  updateSyncItemStatus(id, status, errorMessage = null) {
    this.update('sync_queue', 
      { status, error_message: errorMessage, synced_at: status === 'completed' ? new Date().toISOString() : null },
      { id }
    );
  }

  incrementSyncRetry(id) {
    this.run(`UPDATE sync_queue SET retry_count = retry_count + 1 WHERE id = ?`, [id]);
  }

  // ===== Menu Operations =====
  getCategories() {
    return this.execute(
      `SELECT * FROM categories WHERE is_deleted = 0 ORDER BY display_order, name`
    );
  }

  saveCategory(category) {
    if (category.id) {
      this.update('categories', {
        name: category.name,
        description: category.description,
        display_order: category.display_order || 0,
        updated_at: new Date().toISOString(),
      }, { id: category.id });
      return category.id;
    } else {
      const id = uuidv4();
      this.insert('categories', {
        id,
        name: category.name,
        description: category.description,
        display_order: category.display_order || 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_deleted: 0,
      });
      this.addToSyncQueue('category', id, 'create', category);
      return id;
    }
  }

  getMenuItems(categoryId = null) {
    let query = `
      SELECT m.*, c.name as category_name 
      FROM menu_items m 
      LEFT JOIN categories c ON m.category_id = c.id 
      WHERE m.is_deleted = 0
    `;
    const params = [];

    if (categoryId) {
      query += ` AND m.category_id = ?`;
      params.push(categoryId);
    }

    query += ` ORDER BY c.display_order, m.name`;
    return this.execute(query, params);
  }

  saveMenuItem(item) {
    // Helper to safely stringify JSON or return null
    const safeStringify = (data) => {
      try {
        if (!data) return null;
        if (typeof data === 'string') return data;
        return JSON.stringify(data);
      } catch (e) {
        return null;
      }
    };

    if (item.id) {
      this.update('menu_items', {
        name: item.name,
        description: item.description,
        category_id: item.category_id,
        price: item.price,
        cost_price: item.cost_price,
        tax_rate: item.tax_rate || 5,
        is_vegetarian: item.is_vegetarian,
        is_available: item.is_available,
        preparation_time: item.preparation_time,
        variants: safeStringify(item.variants),
        addons: safeStringify(item.addons),
        updated_at: new Date().toISOString(),
      }, { id: item.id });
      
      this.addToSyncQueue('menu_item', item.id, 'update', item);
      return item.id;
    } else {
      const id = uuidv4();
      this.insert('menu_items', {
        id,
        name: item.name,
        description: item.description,
        category_id: item.category_id,
        price: item.price,
        cost_price: item.cost_price,
        tax_rate: item.tax_rate || 5,
        is_vegetarian: item.is_vegetarian,
        is_available: item.is_available,
        preparation_time: item.preparation_time,
        variants: safeStringify(item.variants),
        addons: safeStringify(item.addons),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_deleted: 0,
      });
      
      this.addToSyncQueue('menu_item', id, 'create', item);
      return id;
    }
  }

  deleteMenuItem(id) {
    this.delete('menu_items', { id });
    this.addToSyncQueue('menu_item', id, 'delete', { id });
  }

  toggleFavorite(id, isFavorite) {
    this.run('UPDATE menu_items SET is_favorite = ?, updated_at = ? WHERE id = ?', [isFavorite ? 1 : 0, new Date().toISOString(), id]);
    this.addToSyncQueue('menu_item', id, 'update', { id, is_favorite: isFavorite });
    return { success: true };
  }

  importMenu(items) {
    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    this.db.run('BEGIN TRANSACTION');
    try {
      for (const item of items) {
        try {
          // 1. Find or Create Category
          let categoryId;
          const catResult = this.execute('SELECT id FROM categories WHERE name = ? COLLATE NOCASE', [item.category]);
          if (catResult.length > 0) {
            categoryId = catResult[0].id;
          } else {
            categoryId = uuidv4();
            this.run('INSERT INTO categories (id, name, display_order, is_active) VALUES (?, ?, ?, ?, ?)',
              [categoryId, item.category, 99, 1]);
          }

          // 2. Insert or Update Menu Item
          const existing = this.execute('SELECT id FROM menu_items WHERE name = ? COLLATE NOCASE', [item.name]);
          if (existing.length > 0) {
            // Update
            this.run(`
              UPDATE menu_items SET 
                category_id = ?, price = ?, tax_rate = ?, is_vegetarian = ?, description = ?, updated_at = ?
              WHERE id = ?
            `, [categoryId, item.price, item.tax_rate, item.is_vegetarian, item.description, new Date().toISOString(), existing[0].id]);
          } else {
            // Insert
            const id = uuidv4();
            this.run(`
              INSERT INTO menu_items (id, name, category_id, price, tax_rate, is_vegetarian, description, is_available, created_at, updated_at, is_deleted)
              VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, 0)
            `, [id, item.name, categoryId, item.price, item.tax_rate, item.is_vegetarian, item.description, new Date().toISOString(), new Date().toISOString()]);
          }
          successCount++;
        } catch (err) {
          console.error(`Error importing item ${item.name}:`, err);
          errorCount++;
          errors.push(`Failed to import ${item.name}: ${err.message}`);
        }
      }
      this.db.run('COMMIT');
    } catch (e) {
      this.db.run('ROLLBACK');
      throw e;
    }

    return { success: true, successCount, errorCount, errors };
  }

  importInventory(items) {
    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    this.db.run('BEGIN TRANSACTION');
    try {
      for (const item of items) {
        try {
          const existing = this.execute('SELECT id FROM inventory WHERE name = ? COLLATE NOCASE', [item.name]);
          if (existing.length > 0) {
            // Update
            this.run(`
              UPDATE inventory SET 
                unit = ?, current_stock = ?, minimum_stock = ?, cost_per_unit = ?, supplier = ?, updated_at = ?
              WHERE id = ?
            `, [item.unit, item.current_stock, item.minimum_stock, item.cost_per_unit, item.supplier, new Date().toISOString(), existing[0].id]);
          } else {
            // Insert
            const id = uuidv4();
            this.run(`
              INSERT INTO inventory (id, name, unit, current_stock, minimum_stock, cost_per_unit, supplier, created_at, updated_at, is_deleted)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
            `, [id, item.name, item.unit, item.current_stock, item.minimum_stock, item.cost_per_unit, item.supplier, new Date().toISOString(), new Date().toISOString()]);
          }
          successCount++;
        } catch (err) {
          console.error(`Error importing inventory item ${item.name}:`, err);
          errorCount++;
          errors.push(`Failed to import ${item.name}: ${err.message}`);
        }
      }
      this.db.run('COMMIT');
    } catch (e) {
      this.db.run('ROLLBACK');
      throw e;
    }
    return { success: true, successCount, errorCount, errors };
  }

  // ===== Order Operations =====
  getActiveOrderCount() {
    try {
      const result = this.execute(`
        SELECT COUNT(*) as count 
        FROM orders 
        WHERE status IN ('pending', 'in-progress', 'ready')
      `);
      return result[0]?.count || 0;
    } catch (error) {
      console.error('Error fetching active order count:', error);
      return 0;
    }
  }

  // ===== Global Addons Operations =====
  getAddons() {
    return this.execute(
      `SELECT * FROM addons WHERE is_deleted = 0 ORDER BY name`
    );
  }

  saveAddon(addon) {
    if (addon.id) {
      this.update('addons', {
        name: addon.name,
        price: addon.price,
        type: addon.type || 'veg',
        is_available: addon.is_available,
        updated_at: new Date().toISOString(),
      }, { id: addon.id });
      
      this.addToSyncQueue('addon', addon.id, 'update', addon);
      return addon.id;
    } else {
      const id = uuidv4();
      this.insert('addons', {
        id,
        name: addon.name,
        price: addon.price,
        type: addon.type || 'veg',
        is_available: addon.is_available,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_deleted: 0,
      });
      
      this.addToSyncQueue('addon', id, 'create', addon);
      return id;
    }
  }

  deleteAddon(id) {
    this.delete('addons', { id });
    this.addToSyncQueue('addon', id, 'delete', { id });
  }

  // ===== Order Operations =====
  createOrder(order, items, userId) {
    console.log('Creating order with:', JSON.stringify({ order, items, userId }, null, 2));
    
    const orderId = uuidv4();
    const sequence = this.getNextOrderNumber();
    
    // Generate YYMMDDxxx formatted order number
    const now = new Date();
    const yy = now.getFullYear().toString().slice(-2);
    const mm = (now.getMonth() + 1).toString().padStart(2, '0');
    const dd = now.getDate().toString().padStart(2, '0');
    const seq = sequence.toString().padStart(3, '0');
    const orderNumber = parseInt(`${yy}${mm}${dd}${seq}`);
    
    const isoNow = now.toISOString();

    // Insert order - ensure no undefined values
    const orderData = {
      id: orderId,
      order_number: orderNumber,
      order_type: order.order_type || 'dine_in',
      table_number: order.table_number || '',
      customer_name: order.customer_name || '',
      customer_phone: order.customer_phone || '',
      subtotal: order.subtotal || 0,
      tax_amount: order.tax_amount || 0,
      discount_amount: order.discount_amount || 0,
      delivery_charge: order.delivery_charge || 0,
      container_charge: order.container_charge || 0,
      customer_paid: order.customer_paid || 0,
      total_amount: order.total_amount || 0,
      payment_method: order.payment_method || null,
      payment_status: order.payment_status || 'pending',
      notes: order.notes || '',
    urgency: order.urgency || 'normal',
    chef_instructions: order.chef_instructions || '',
      status: order.status || 'active',
      is_hold: order.is_hold || 0,
      cashier_id: userId || null,
      created_at: isoNow,
      updated_at: isoNow,
    };
    
    console.log('Order data:', JSON.stringify(orderData, null, 2));
    this.insert('orders', orderData);

    // Insert order items
    for (const item of items || []) {
      const itemData = {
        id: uuidv4(),
        order_id: orderId,
        menu_item_id: item.menu_item_id || '',
        item_name: item.name || 'Unknown Item',
        quantity: item.quantity || 1,
        unit_price: item.unit_price || 0,
        item_total: (item.quantity || 1) * (item.unit_price || 0),
        tax_rate: item.tax_rate || 0,
        special_instructions: item.special_instructions || '',
        variant: item.variant || null,
        addons: item.addons || null,
        kot_status: 'pending',
        created_at: isoNow,
        is_deleted: 0
      };
      // console.log('Item data:', JSON.stringify(itemData, null, 2));
      this.insert('order_items', itemData);
    }

    // Add to sync queue
    this.addToSyncQueue('order', orderId, 'create', {
      ...order,
      id: orderId,
      order_number: orderNumber,
      items,
    });

    return { id: orderId, orderNumber: orderNumber };
  }

  getNextOrderNumber() {
    const today = new Date().toLocaleDateString('en-CA');
    
    const results = this.execute(
      `SELECT current_value, date FROM sequences WHERE sequence_name = 'order_number'`
    );
    
    if (results.length > 0) {
      // Check if it's a new day - reset the counter
      if (results[0].date !== today) {
        this.run(
          `UPDATE sequences SET current_value = 1, date = ? WHERE sequence_name = 'order_number'`,
          [today]
        );
        return 1;
      } else {
        // Same day - increment
        const nextValue = results[0].current_value + 1;
        this.run(
          `UPDATE sequences SET current_value = ? WHERE sequence_name = 'order_number'`,
          [nextValue]
        );
        return nextValue;
      }
    } else {
      // First order ever - create the sequence
      this.run(
        `INSERT OR REPLACE INTO sequences (sequence_name, current_value, date) VALUES ('order_number', 1, ?)`,
        [today]
      );
      return 1;
    }
  }

  getOrders(date = null, status = null) {
    let query = `SELECT * FROM orders WHERE 1=1`;
    const params = [];

    if (date) {
      query += ` AND DATE(created_at, 'localtime') = ?`;
      params.push(date);
    }

    if (status) {
      query += ` AND status = ?`;
      params.push(status);
    }

    query += ` ORDER BY created_at DESC`;
    return this.execute(query, params);
  }

  getOrdersByPhone(phone) {
    if (!phone) return [];
    
    return this.execute(`
      SELECT o.id, o.order_number, o.total_amount, o.status, o.created_at, o.payment_method
      FROM orders o
      WHERE o.customer_phone LIKE ?
        AND o.is_deleted = 0
        AND o.status = 'completed'
      ORDER BY o.created_at DESC
      LIMIT 10
    `, [`%${phone}%`]);
  }

  getOrderById(id) {
    const orders = this.execute(`SELECT * FROM orders WHERE id = ?`, [id]);
    if (orders.length === 0) return null;

    const order = orders[0];
    order.items = this.execute(
      `SELECT * FROM order_items WHERE order_id = ?`,
      [id]
    );
    return order;
  }

  completeOrder(id, paymentMethod) {
    const now = new Date().toISOString();
    
    this.update('orders', {
      status: 'completed',
      payment_method: paymentMethod,
      payment_status: 'completed',
      updated_at: now,
    }, { id });

    // Update daily sales
    const order = this.getOrderById(id);
    if (order) {
      this.updateDailySales(order, paymentMethod);
    }

    this.addToSyncQueue('order', id, 'update', { status: 'completed', paymentMethod });
    
    // Save to disk to persist changes
    this.save();
    
    return { success: true, order };
  }

  cancelOrder(id) {
    const now = new Date().toISOString();
    
    this.update('orders', {
      status: 'cancelled',
      updated_at: now,
    }, { id });

    this.addToSyncQueue('order', id, 'update', { status: 'cancelled' });
    return { success: true };
  }

  deleteOrder(id) {
    const order = this.getOrderById(id);
    if (!order) return { success: false, error: 'Order not found' };
    if (order.is_deleted) return { success: true }; // Already deleted

    const now = new Date();
    const isoNow = now.toISOString();
    const deletedOrderNumber = order.order_number;
    
    console.log(`[deleteOrder] Deleting order ID: ${id}, Number: ${deletedOrderNumber}`);

    // 1. Soft delete and negate order number immediately
    this.update('orders', {
      is_deleted: 1,
      order_number: -Math.abs(deletedOrderNumber), // Ensure negative
      updated_at: isoNow,
    }, { id });

    // 2. RE-INDEXING STRATEGY: Use ID Prefix to find all orders for this "Day" (Sequence)
    // This avoids Date/Timezone parsing issues by relying on the integer structure YYMMDDxxx
    try {
         const orderNumStr = Math.abs(deletedOrderNumber).toString();
         if (orderNumStr.length === 9) {
             const prefixStr = orderNumStr.substring(0, 6); // "260213"
             const minNum = parseInt(`${prefixStr}000`);
             const maxNum = parseInt(`${prefixStr}999`);
             
             console.log(`[deleteOrder] Re-indexing range: ${minNum} - ${maxNum}`);

             // Fetch all active orders in this ID range
             const dailyOrders = this.execute(`
                SELECT id, order_number, created_at FROM orders 
                WHERE is_deleted = 0 
                AND order_number BETWEEN ? AND ?
                ORDER BY order_number ASC
             `, [minNum, maxNum]);

             console.log(`[deleteOrder] Found ${dailyOrders.length} active orders to re-index.`);

             // Re-assign numbers sequentially starting from prefix + 001
             let needsSequenceUpdate = false;
             
             dailyOrders.forEach((subOrder, index) => {
                 const seqNum = index + 1;
                 const seqStr = seqNum.toString().padStart(3, '0');
                 const expectedNumber = parseInt(`${prefixStr}${seqStr}`);
                 
                 if (subOrder.order_number !== expectedNumber) {
                     console.log(`[deleteOrder] Correcting ${subOrder.order_number} -> ${expectedNumber}`);
                     this.update('orders', {
                         order_number: expectedNumber,
                         updated_at: isoNow
                     }, { id: subOrder.id });
                     
                     this.addToSyncQueue('order', subOrder.id, 'update', { order_number: expectedNumber });
                 }
             });

             // 3. Update the sequence counter
             // We verify if this batch corresponds to "today" before updating the global sequence
             // (Though technically we should update that specific day's sequence regardless)
             const today = new Date();
             const todayYY = today.getFullYear().toString().slice(-2);
             const todayMM = (today.getMonth() + 1).toString().padStart(2, '0');
             const todayDD = today.getDate().toString().padStart(2, '0');
             const todayPrefix = `${todayYY}${todayMM}${todayDD}`;

             if (prefixStr === todayPrefix) {
                 const newCount = dailyOrders.length;
                 const todayDateStr = today.toLocaleDateString('en-CA');
                 
                 console.log(`[deleteOrder] Updating TODAY sequence (${todayDateStr}) to: ${newCount}`);
                 this.run(
                   `UPDATE sequences SET current_value = ? WHERE sequence_name = 'order_number' AND date = ?`,
                   [newCount, todayDateStr]
                 );
             }
         }
    } catch (error) {
      console.error('[deleteOrder] Error during re-indexing:', error);
    }

    this.addToSyncQueue('order', id, 'delete', { id });
    this.save(); 
    return { success: true };
  }

  getAllOrders(limit = 50) {
    return this.execute(`
      SELECT o.*, u.full_name as cashier_name
      FROM orders o
      LEFT JOIN users u ON o.cashier_id = u.id
      WHERE o.is_deleted = 0
      ORDER BY o.created_at DESC
      LIMIT ?
    `, [limit]);
  }

  getActiveOrders() {
    return this.execute(`
      SELECT o.*, u.full_name as cashier_name
      FROM orders o
      LEFT JOIN users u ON o.cashier_id = u.id
      WHERE o.status = 'active' AND o.is_deleted = 0
      ORDER BY o.created_at DESC
    `);
  }

  getHeldOrders() {
    const orders = this.execute(`
      SELECT o.*, u.full_name as cashier_name
      FROM orders o
      LEFT JOIN users u ON o.cashier_id = u.id
      WHERE o.status = 'held' AND o.is_deleted = 0
      ORDER BY o.created_at DESC
    `);

    // Attach items to each order
    return orders.map(order => {
      order.items = this.execute(`
        SELECT oi.*, mi.name as item_name
        FROM order_items oi
        LEFT JOIN menu_items mi ON oi.menu_item_id = mi.id
        WHERE oi.order_id = ?
      `, [order.id]);
      return order;
    });
  }

  resumeHeldOrder(orderId) {
    // Mark the held order as deleted so it doesn't show anymore
    this.execute(`
      UPDATE orders
      SET is_deleted = 1
      WHERE id = ?
    `, [orderId]);
    this.save();
    return { success: true };
  }

  updateDailySales(order, paymentMethod) {
    const today = new Date().toLocaleDateString('en-CA');
    
    const existing = this.execute(
      `SELECT * FROM daily_sales WHERE date = ?`,
      [today]
    );

    if (existing.length > 0) {
      const cashAdd = paymentMethod === 'cash' ? order.total_amount : 0;
      const cardAdd = paymentMethod === 'card' ? order.total_amount : 0;
      const upiAdd = paymentMethod === 'upi' ? order.total_amount : 0;
      
      this.run(`
        UPDATE daily_sales SET
          total_orders = total_orders + 1,
          total_revenue = total_revenue + ?,
          total_tax = total_tax + ?,
          total_discount = total_discount + ?,
          cash_amount = cash_amount + ?,
          card_amount = card_amount + ?,
          upi_amount = upi_amount + ?
        WHERE date = ?
      `, [
        order.total_amount,
        order.tax_amount,
        order.discount_amount || 0,
        cashAdd,
        cardAdd,
        upiAdd,
        today,
      ]);
    } else {
      this.insert('daily_sales', {
        id: uuidv4(),
        date: today,
        total_orders: 1,
        total_revenue: order.total_amount,
        total_tax: order.tax_amount,
        total_discount: order.discount_amount || 0,
        cash_amount: paymentMethod === 'cash' ? order.total_amount : 0,
        card_amount: paymentMethod === 'card' ? order.total_amount : 0,
        upi_amount: paymentMethod === 'upi' ? order.total_amount : 0,
      });
    }
  }

  // ===== KOT Operations =====
  getPendingKOTs() {
    return this.execute(`
      SELECT oi.*, o.order_number, o.table_number, o.order_type, o.created_at as order_time,
             o.customer_name, o.customer_phone, o.notes, o.urgency, o.chef_instructions
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      WHERE oi.kot_status != 'served' AND o.status != 'cancelled' AND o.is_deleted = 0 AND oi.is_deleted = 0
      ORDER BY 
        CASE o.urgency WHEN 'critical' THEN 0 WHEN 'urgent' THEN 1 ELSE 2 END,
        o.created_at ASC
    `);
  }

  updateKOTStatus(orderItemId, status) {
    this.update('order_items', { kot_status: status }, { id: orderItemId });
  }

  // ===== Inventory Operations =====
  getInventory() {
    return this.execute(
      `SELECT * FROM inventory WHERE is_deleted = 0 ORDER BY name`
    );
  }

  getInventoryHistory(inventoryId) {
    return this.execute(`
      SELECT * FROM inventory_transactions 
      WHERE inventory_id = ? AND is_deleted = 0 
      ORDER BY created_at DESC
    `, [inventoryId]);
  }

  saveInventoryItem(item) {
    if (item.id) {
      this.update('inventory', {
        name: item.name,
        unit: item.unit,
        current_stock: item.current_stock,
        minimum_stock: item.minimum_stock,
        cost_per_unit: item.cost_per_unit,
        supplier: item.supplier,
        updated_at: new Date().toISOString(),
      }, { id: item.id });
      
      // If it's an edit that changes stock directly (not recommended but possible via edit modal),
      // we might want to log it as an 'adjustment', but simpler to just update for now.
      
      return item.id;
    } else {
      const id = uuidv4();
      const initialStock = item.current_stock || 0;
      
      this.insert('inventory', {
        id,
        name: item.name,
        unit: item.unit,
        current_stock: initialStock,
        minimum_stock: item.minimum_stock || 0,
        cost_per_unit: item.cost_per_unit,
        supplier: item.supplier,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_deleted: 0,
      });

      // Log initial stock
      if (initialStock > 0) {
        this.logInventoryTransaction(id, 'add', initialStock, initialStock, 'Initial Stock', 'Added during item creation');
      }
      
      return id;
    }
  }

  updateInventoryStock(id, quantity, operation, reason = '', notes = '') {
    const items = this.execute(`SELECT current_stock FROM inventory WHERE id = ?`, [id]);
    if (items.length === 0) return;
    
    const currentStock = items[0].current_stock;
    let newStock = currentStock;
    let type = 'adjustment';

    if (operation === 'add') {
      newStock = currentStock + quantity;
      type = 'add';
    } else if (operation === 'subtract') {
      newStock = Math.max(0, currentStock - quantity);
      type = 'subtract';
    } else if (operation === 'set') {
      newStock = quantity;
      type = 'adjustment'; // Direct set
    }
    
    this.update('inventory', { 
      current_stock: newStock,
      updated_at: new Date().toISOString()
    }, { id });

    // Log transaction
    this.logInventoryTransaction(id, type, quantity, newStock, reason, notes);
    
    return { success: true, newStock };
  }

  logInventoryTransaction(inventoryId, type, quantity, snapshot, reason, notes) {
    this.insert('inventory_transactions', {
      id: uuidv4(),
      inventory_id: inventoryId,
      type,
      quantity,
      current_stock_snapshot: snapshot,
      reason,
      notes,
      created_at: new Date().toISOString(),
      is_deleted: 0
    });
  }

  deleteInventoryItem(id) {
    this.delete('inventory', { id });
    return { success: true };
  }

  // ===== Settings Operations =====
  getSettings() {
    return this.execute(`SELECT * FROM settings`);
  }

  getSetting(key) {
    const results = this.execute(`SELECT value FROM settings WHERE key = ?`, [key]);
    return results[0]?.value || null;
  }

  updateSetting(key, value) {
    const existing = this.execute(`SELECT * FROM settings WHERE key = ?`, [key]);
    if (existing.length > 0) {
      this.run(`UPDATE settings SET value = ?, updated_at = ? WHERE key = ?`, 
        [value, new Date().toISOString(), key]);
    } else {
      this.insert('settings', {
        key,
        value,
        updated_at: new Date().toISOString()
      });
    }
    return { success: true };
  }

  // ===== Reports =====
  getDailyReport(date) {
    // Calculate sales directly from orders table for accuracy
    const sales = this.execute(`
      SELECT 
        ? as date,
        COUNT(CASE WHEN status != 'cancelled' THEN 1 END) as total_orders,
        COALESCE(SUM(CASE WHEN status != 'cancelled' THEN total_amount ELSE 0 END), 0) as total_revenue,
        COALESCE(SUM(CASE WHEN status != 'cancelled' THEN tax_amount ELSE 0 END), 0) as total_tax,
        COALESCE(SUM(CASE WHEN status != 'cancelled' THEN discount_amount ELSE 0 END), 0) as total_discount,
        COALESCE(SUM(CASE WHEN payment_method = 'cash' AND status IN ('completed', 'active') THEN total_amount ELSE 0 END), 0) as cash_amount,
        COALESCE(SUM(CASE WHEN payment_method = 'card' AND status IN ('completed', 'active') THEN total_amount ELSE 0 END), 0) as card_amount,
        COALESCE(SUM(CASE WHEN payment_method = 'upi' AND status IN ('completed', 'active') THEN total_amount ELSE 0 END), 0) as upi_amount
      FROM orders 
      WHERE DATE(created_at, 'localtime') = ? 
        AND is_deleted = 0
    `, [date, date]);
    
    const orders = this.execute(`SELECT * FROM orders WHERE DATE(created_at, 'localtime') = ? AND is_deleted = 0 ORDER BY created_at DESC`, [date]);
    
    // Top Items (Include active/served orders too, not just completed)
    const topItems = this.execute(`
      SELECT oi.item_name, SUM(oi.quantity) as total_quantity, SUM(oi.item_total) as total_revenue
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      WHERE DATE(o.created_at, 'localtime') = ? 
        AND o.status != 'cancelled' 
        AND o.is_deleted = 0 
        AND oi.is_deleted = 0
      GROUP BY oi.item_name
      ORDER BY total_quantity DESC
      LIMIT 10
    `, [date]);

    // Category Wise Sales
    const categorySales = this.execute(`
      SELECT c.name as category_name, SUM(oi.item_total) as total_revenue, SUM(oi.quantity) as total_quantity
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      LEFT JOIN menu_items mi ON oi.menu_item_id = mi.id
      LEFT JOIN categories c ON mi.category_id = c.id
      WHERE DATE(o.created_at) = ? AND o.status != 'cancelled'
      GROUP BY c.name
      ORDER BY total_revenue DESC
    `, [date]);

    // Total Expenses for the day
    const expenses = this.execute(`
        SELECT COALESCE(SUM(amount), 0) as total_expenses 
        FROM expenses 
        WHERE date = ?
    `, [date]);
    
    const totalExpenses = expenses[0]?.total_expenses || 0;
    const totalRevenue = sales[0]?.total_revenue || 0;

    return {
      sales: {
        ...sales[0],
        total_expenses: totalExpenses,
        net_revenue: totalRevenue - totalExpenses
      },
      orders,
      topItems,
      categorySales
    };
  }

  // Get report for a specific biller on a given date
  getBillerReport(userId, date) {
    const sales = this.execute(`
      SELECT 
        COUNT(CASE WHEN status != 'cancelled' THEN 1 END) as total_orders,
        COALESCE(SUM(CASE WHEN status != 'cancelled' THEN total_amount ELSE 0 END), 0) as total_revenue,
        COALESCE(SUM(CASE WHEN status != 'cancelled' THEN tax_amount ELSE 0 END), 0) as total_tax,
        COALESCE(SUM(CASE WHEN status != 'cancelled' THEN discount_amount ELSE 0 END), 0) as total_discount,
        COALESCE(SUM(CASE WHEN payment_method = 'cash' AND status = 'completed' THEN total_amount ELSE 0 END), 0) as cash_amount,
        COALESCE(SUM(CASE WHEN payment_method = 'card' AND status = 'completed' THEN total_amount ELSE 0 END), 0) as card_amount,
        COALESCE(SUM(CASE WHEN payment_method = 'upi' AND status = 'completed' THEN total_amount ELSE 0 END), 0) as upi_amount
      FROM orders 
      WHERE DATE(created_at, 'localtime') = ? 
        AND cashier_id = ?
        AND is_deleted = 0
    `, [date, userId]);

    const orders = this.execute(`
      SELECT * FROM orders 
      WHERE DATE(created_at, 'localtime') = ? AND cashier_id = ? AND is_deleted = 0 
      ORDER BY created_at DESC
    `, [date, userId]);

    return {
      sales: sales[0] || { total_orders: 0, total_revenue: 0, cash_amount: 0, card_amount: 0, upi_amount: 0 },
      orders,
    };
  }

  // Get performance summary for all billers on a given date
  getAllBillersReport(date) {
    return this.execute(`
      SELECT 
        u.id as user_id,
        u.full_name,
        u.username,
        u.role,
        COUNT(CASE WHEN o.status != 'cancelled' THEN 1 END) as total_orders,
        COALESCE(SUM(CASE WHEN o.status != 'cancelled' THEN o.total_amount ELSE 0 END), 0) as total_revenue,
        COALESCE(SUM(CASE WHEN o.payment_method = 'cash' AND o.status = 'completed' THEN o.total_amount ELSE 0 END), 0) as cash_amount,
        COALESCE(SUM(CASE WHEN o.payment_method = 'card' AND o.status = 'completed' THEN o.total_amount ELSE 0 END), 0) as card_amount,
        COALESCE(SUM(CASE WHEN o.payment_method = 'upi' AND o.status = 'completed' THEN o.total_amount ELSE 0 END), 0) as upi_amount
      FROM users u
      LEFT JOIN orders o ON o.cashier_id = u.id 
        AND DATE(o.created_at, 'localtime') = ? 
        AND o.is_deleted = 0
      WHERE u.is_deleted = 0 AND u.is_active = 1 AND u.role IN ('cashier', 'admin')
      GROUP BY u.id
      ORDER BY total_revenue DESC
    `, [date]);
  }

  // Get custom date range report with add-on statistics
  getCustomReport(startDate, endDate) {
    // 1. Sales Summary
    const sales = this.execute(`
      SELECT 
        COUNT(CASE WHEN status != 'cancelled' THEN 1 END) as total_orders,
        COALESCE(SUM(CASE WHEN status != 'cancelled' THEN total_amount ELSE 0 END), 0) as total_revenue,
        COALESCE(SUM(CASE WHEN status != 'cancelled' THEN tax_amount ELSE 0 END), 0) as total_tax,
        COALESCE(SUM(CASE WHEN status != 'cancelled' THEN discount_amount ELSE 0 END), 0) as total_discount,
        COALESCE(SUM(CASE WHEN payment_method = 'cash' AND status IN ('completed', 'active') THEN total_amount ELSE 0 END), 0) as cash_amount,
        COALESCE(SUM(CASE WHEN payment_method = 'card' AND status IN ('completed', 'active') THEN total_amount ELSE 0 END), 0) as card_amount,
        COALESCE(SUM(CASE WHEN payment_method = 'upi' AND status IN ('completed', 'active') THEN total_amount ELSE 0 END), 0) as upi_amount
      FROM orders 
      WHERE DATE(created_at, 'localtime') BETWEEN ? AND ?
        AND is_deleted = 0
    `, [startDate, endDate]);

    // 2. Top Items
    const topItems = this.execute(`
      SELECT oi.item_name, SUM(oi.quantity) as total_quantity, SUM(oi.item_total) as total_revenue
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      WHERE DATE(o.created_at, 'localtime') BETWEEN ? AND ?
        AND o.status != 'cancelled' 
        AND o.is_deleted = 0 
        AND oi.is_deleted = 0
      GROUP BY oi.item_name
      ORDER BY total_quantity DESC
      LIMIT 10
    `, [startDate, endDate]);

    // 3. Category Sales
    const categorySales = this.execute(`
      SELECT c.name as category_name, SUM(oi.item_total) as total_revenue, SUM(oi.quantity) as total_quantity
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      LEFT JOIN menu_items mi ON oi.menu_item_id = mi.id
      LEFT JOIN categories c ON mi.category_id = c.id
      WHERE DATE(o.created_at, 'localtime') BETWEEN ? AND ? 
        AND o.status != 'cancelled'
      GROUP BY c.name
      ORDER BY total_revenue DESC
    `, [startDate, endDate]);

    // 4. Add-on Statistics
    // Fetch all order items with addons in the date range
    const itemsWithAddons = this.execute(`
      SELECT oi.addons, oi.quantity
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      WHERE DATE(o.created_at, 'localtime') BETWEEN ? AND ?
        AND o.status != 'cancelled'
        AND oi.addons IS NOT NULL 
        AND oi.addons != ''
        AND oi.addons != '[]'
    `, [startDate, endDate]);

    const addonStats = {};
    let totalAddonRevenue = 0;

    itemsWithAddons.forEach(row => {
      try {
        const addons = JSON.parse(row.addons);
        if (Array.isArray(addons)) {
          addons.forEach(addon => {
            const name = addon.name;
            const price = parseFloat(addon.price || 0);
            const qty = row.quantity; // Addon quantity matches item quantity usually
            
            if (!addonStats[name]) {
              addonStats[name] = { name, quantity: 0, revenue: 0 };
            }
            addonStats[name].quantity += qty;
            addonStats[name].revenue += (price * qty);
            totalAddonRevenue += (price * qty);
          });
        }
      } catch (e) {
        // Ignore parse errors
      }
    });

    const topAddons = Object.values(addonStats)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);

    return {
      sales: { ...sales[0], total_addon_revenue: totalAddonRevenue },
      topItems,
      categorySales,
      topAddons
    };
  }

  // ===== Shift Management =====
  startShift(userId, startCash) {
    // Check if user already has an active shift
    const existing = this.execute(`
      SELECT * FROM shifts WHERE user_id = ? AND status = 'active'
    `, [userId]);

    if (existing.length > 0) {
      throw new Error('User already has an active shift');
    }

    const id = uuidv4();
    const startTime = new Date().toISOString();

    this.db.run(`
      INSERT INTO shifts (id, user_id, start_time, start_cash, status)
      VALUES (?, ?, ?, ?, 'active')
    `, [id, userId, startTime, startCash]);

    return { id, userId, startTime, startCash, status: 'active' };
  }

  endShift(userId, endCash) {
    const shift = this.getActiveShift(userId);
    if (!shift) {
      throw new Error('No active shift found for user');
    }

    const endTime = new Date().toISOString();
    
    this.db.run(`
      UPDATE shifts 
      SET end_time = ?, end_cash = ?, status = 'closed', updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [endTime, endCash, shift.id]);

    return { ...shift, endTime, endCash, status: 'closed' };
  }

  getActiveShift(userId) {
    const shifts = this.execute(`
      SELECT * FROM shifts WHERE user_id = ? AND status = 'active'
    `, [userId]);
    return shifts[0] || null;
  }

  autoCloseShifts() {
    // Close any shifts that are still active from previous days
    // This is a simple logic: if start_time is not today, close it.
    // In a real scenario, we might want more complex logic (e.g. shifts spanning midnight)
    // For now, we'll just close shifts started before today 00:00
    
    const today = new Date().toISOString().split('T')[0];
    
    this.db.run(`
      UPDATE shifts 
      SET status = 'closed', end_time = datetime('now'), end_cash = 0, updated_at = CURRENT_TIMESTAMP
      WHERE status = 'active' AND date(start_time) < ?
    `, [today]);
  }

  getShiftReport(shiftId) {
    const shift = this.execute(`SELECT * FROM shifts WHERE id = ?`, [shiftId])[0];
    if (!shift) return null;

    // Get orders within this shift window
    // If shift is active, use current time as end time for report
    const endTime = shift.end_time || new Date().toISOString();

    const sales = this.execute(`
      SELECT 
        COUNT(*) as total_orders,
        COALESCE(SUM(total_amount), 0) as total_revenue,
        COALESCE(SUM(CASE WHEN payment_method = 'cash' THEN total_amount ELSE 0 END), 0) as cash_sales,
        COALESCE(SUM(CASE WHEN payment_method = 'card' THEN total_amount ELSE 0 END), 0) as card_sales,
        COALESCE(SUM(CASE WHEN payment_method = 'upi' THEN total_amount ELSE 0 END), 0) as upi_sales
      FROM orders
      WHERE cashier_id = ? 
        AND created_at >= ? 
        AND created_at <= ?
        AND status != 'cancelled'
        AND is_deleted = 0
    `, [shift.user_id, shift.start_time, endTime])[0];

    return {
      shift,
      sales: sales || { total_orders: 0, total_revenue: 0, cash_sales: 0, card_sales: 0, upi_sales: 0 }
    };
  }

  getShiftsByDate(date) {
    // date format: YYYY-MM-DD
    // Get all shifts that started on this date
    const shifts = this.execute(`
      SELECT s.*, u.full_name as user_name, u.role as user_role
      FROM shifts s
      JOIN users u ON s.user_id = u.id
      WHERE date(s.start_time, 'localtime') = ?
      ORDER BY s.start_time DESC
    `, [date]);

    // For each shift, calculate the sales summary
    return shifts.map(shift => {
      const endTime = shift.end_time || new Date().toISOString();
      const sales = this.execute(`
        SELECT 
          COUNT(*) as total_orders,
          COALESCE(SUM(total_amount), 0) as total_revenue
        FROM orders
        WHERE cashier_id = ? 
          AND created_at >= ? 
          AND created_at <= ?
          AND status != 'cancelled'
          AND is_deleted = 0
      `, [shift.user_id, shift.start_time, endTime])[0];
      
      return {
        ...shift,
        sales: sales || { total_orders: 0, total_revenue: 0 }
      };
    });
  }

  // Get detailed daily export (User-wise product sales with all details)
  getDetailedDailyExport(date) {
    return this.execute(`
      SELECT 
        o.order_number,
        o.id as order_id,
        COALESCE(u.full_name, u.username, 'Unknown') as cashier_name,
        oi.item_name,
        oi.quantity,
        oi.unit_price,
        oi.item_total,
        oi.addons,
        DATE(o.created_at, 'localtime') as order_date,
        TIME(o.created_at, 'localtime') as order_time,
        o.customer_name,
        o.customer_phone,
        o.payment_method,
        o.order_type,
        o.table_number,
        o.total_amount as order_total,
        o.tax_amount,
        o.discount_amount,
        o.status
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      LEFT JOIN users u ON o.cashier_id = u.id
      WHERE DATE(o.created_at, 'localtime') = ?
        AND o.status != 'cancelled'
        AND o.is_deleted = 0
        AND oi.is_deleted = 0
      ORDER BY o.created_at DESC, o.order_number
    `, [date]);
  }

  getWeeklyReport(startDate) {
    // 1. Daily Trend
    const dailyTrend = this.execute(`
      SELECT 
        DATE(created_at, 'localtime') as date,
        COUNT(CASE WHEN status != 'cancelled' THEN 1 END) as total_orders,
        COALESCE(SUM(CASE WHEN status != 'cancelled' THEN total_amount ELSE 0 END), 0) as total_revenue,
        COALESCE(SUM(CASE WHEN status != 'cancelled' THEN tax_amount ELSE 0 END), 0) as total_tax,
        COALESCE(SUM(CASE WHEN status != 'cancelled' THEN discount_amount ELSE 0 END), 0) as total_discount
      FROM orders 
      WHERE DATE(created_at, 'localtime') >= ? 
        AND DATE(created_at, 'localtime') < date(?, '+7 days')
        AND is_deleted = 0
      GROUP BY DATE(created_at, 'localtime')
      ORDER BY date ASC
    `, [startDate, startDate]);

    // 2. Top Items (Weekly)
    const topItems = this.execute(`
      SELECT oi.item_name, SUM(oi.quantity) as total_quantity, SUM(oi.item_total) as total_revenue
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      WHERE DATE(o.created_at, 'localtime') >= ? 
        AND DATE(o.created_at, 'localtime') < date(?, '+7 days')
        AND o.status != 'cancelled' 
        AND o.is_deleted = 0 
        AND oi.is_deleted = 0
      GROUP BY oi.item_name
      ORDER BY total_quantity DESC
      LIMIT 10
    `, [startDate, startDate]);

    // 3. Category Sales (Weekly)
    const categorySales = this.execute(`
      SELECT c.name as category_name, SUM(oi.quantity) as total_quantity, SUM(oi.item_total) as total_revenue
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      LEFT JOIN menu_items mi ON oi.menu_item_id = mi.id
      LEFT JOIN categories c ON mi.category_id = c.id
      WHERE DATE(o.created_at, 'localtime') >= ? 
        AND DATE(o.created_at, 'localtime') < date(?, '+7 days')
        AND o.status != 'cancelled'
        AND o.is_deleted = 0
        AND oi.is_deleted = 0
      GROUP BY c.name
      ORDER BY total_revenue DESC
    `, [startDate, startDate]);

    // 4. Total Sales Summary
    const sales = this.execute(`
      SELECT 
        COUNT(CASE WHEN status != 'cancelled' THEN 1 END) as total_orders,
        COALESCE(SUM(CASE WHEN status != 'cancelled' THEN total_amount ELSE 0 END), 0) as total_revenue,
        COALESCE(SUM(CASE WHEN status != 'cancelled' THEN tax_amount ELSE 0 END), 0) as total_tax,
        COALESCE(SUM(CASE WHEN status != 'cancelled' THEN discount_amount ELSE 0 END), 0) as total_discount
      FROM orders 
      WHERE DATE(created_at, 'localtime') >= ? 
        AND DATE(created_at, 'localtime') < date(?, '+7 days')
        AND is_deleted = 0
    `, [startDate, startDate])[0];

    // Weekly Expenses
    const weeklyExpenses = this.execute(`
      SELECT COALESCE(SUM(amount), 0) as total_expenses 
      FROM expenses 
      WHERE date >= ? AND date < date(?, '+7 days')
    `, [startDate, startDate]);

    const totalExpenses = weeklyExpenses[0]?.total_expenses || 0;
    const totalRevenue = (sales && sales.total_revenue) || 0;

    return {
      sales: {
        ...(sales || { total_orders: 0, total_revenue: 0 }),
        total_expenses: totalExpenses,
        net_revenue: totalRevenue - totalExpenses
      },
      dailyTrend,
      topItems,
      categorySales
    };
  }

  getMonthlyReport(monthStr) {
    // monthStr format: 'YYYY-MM'
    
    // 1. Daily Trend
    const dailyTrend = this.execute(`
      SELECT 
        DATE(created_at, 'localtime') as date,
        COUNT(CASE WHEN status != 'cancelled' THEN 1 END) as total_orders,
        COALESCE(SUM(CASE WHEN status != 'cancelled' THEN total_amount ELSE 0 END), 0) as total_revenue,
        COALESCE(SUM(CASE WHEN status != 'cancelled' THEN tax_amount ELSE 0 END), 0) as total_tax,
        COALESCE(SUM(CASE WHEN status != 'cancelled' THEN discount_amount ELSE 0 END), 0) as total_discount
      FROM orders 
      WHERE strftime('%Y-%m', created_at, 'localtime') = ?
        AND is_deleted = 0
      GROUP BY DATE(created_at, 'localtime')
      ORDER BY date ASC
    `, [monthStr]);

    // 2. Top Items (Monthly)
    const topItems = this.execute(`
      SELECT oi.item_name, SUM(oi.quantity) as total_quantity, SUM(oi.item_total) as total_revenue
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      WHERE strftime('%Y-%m', o.created_at, 'localtime') = ?
        AND o.status != 'cancelled' 
        AND o.is_deleted = 0 
        AND oi.is_deleted = 0
      GROUP BY oi.item_name
      ORDER BY total_quantity DESC
      LIMIT 10
    `, [monthStr]);

    // 3. Category Sales (Monthly)
    const categorySales = this.execute(`
      SELECT c.name as category_name, SUM(oi.quantity) as total_quantity, SUM(oi.item_total) as total_revenue
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      LEFT JOIN menu_items mi ON oi.menu_item_id = mi.id
      LEFT JOIN categories c ON mi.category_id = c.id
      WHERE strftime('%Y-%m', o.created_at, 'localtime') = ?
        AND o.status != 'cancelled'
        AND o.is_deleted = 0
        AND oi.is_deleted = 0
      GROUP BY c.name
      ORDER BY total_revenue DESC
    `, [monthStr]);

    // 4. Total Sales Summary
    const sales = this.execute(`
      SELECT 
        COUNT(CASE WHEN status != 'cancelled' THEN 1 END) as total_orders,
        COALESCE(SUM(CASE WHEN status != 'cancelled' THEN total_amount ELSE 0 END), 0) as total_revenue,
        COALESCE(SUM(CASE WHEN status != 'cancelled' THEN tax_amount ELSE 0 END), 0) as total_tax,
        COALESCE(SUM(CASE WHEN status != 'cancelled' THEN discount_amount ELSE 0 END), 0) as total_discount,
        COALESCE(SUM(CASE WHEN payment_method = 'cash' AND status IN ('completed', 'active') THEN total_amount ELSE 0 END), 0) as cash_amount,
        COALESCE(SUM(CASE WHEN payment_method = 'card' AND status IN ('completed', 'active') THEN total_amount ELSE 0 END), 0) as card_amount,
        COALESCE(SUM(CASE WHEN payment_method = 'upi' AND status IN ('completed', 'active') THEN total_amount ELSE 0 END), 0) as upi_amount
      FROM orders 
      WHERE strftime('%Y-%m', created_at, 'localtime') = ?
        AND is_deleted = 0
    `, [monthStr])[0];

    // Monthly Expenses
    const monthlyExpenses = this.execute(`
      SELECT COALESCE(SUM(amount), 0) as total_expenses 
      FROM expenses 
      WHERE strftime('%Y-%m', date) = ?
    `, [monthStr]);

    const totalExpenses = monthlyExpenses[0]?.total_expenses || 0;
    const totalRevenue = (sales && sales.total_revenue) || 0;

    return {
      sales: {
        ...(sales || { total_orders: 0, total_revenue: 0 }),
        total_expenses: totalExpenses,
        net_revenue: totalRevenue - totalExpenses
      },
      dailyTrend,
      topItems,
      categorySales
    };
  }

  // ===== Users =====
  getUsers() {
    return this.execute(
      `SELECT id, username, full_name, role, is_active, created_at FROM users WHERE is_deleted = 0 ORDER BY full_name`
    );
  }

  getUserById(id) {
    const users = this.execute(`SELECT * FROM users WHERE id = ?`, [id]);
    return users[0] || null;
  }

  getUserByUsername(username) {
    const users = this.execute(`SELECT * FROM users WHERE username = ? AND is_deleted = 0`, [username]);
    return users[0] || null;
  }

  getUserByPin(pin) {
    const users = this.execute(`SELECT * FROM users WHERE pin_code = ? AND is_deleted = 0 AND is_active = 1`, [pin]);
    return users[0] || null;
  }

  saveUser(user) {
    if (user.id) {
      const updateData = {
        username: user.username,
        full_name: user.fullName,
        role: user.role,
        is_active: user.isActive ? 1 : 0,
        updated_at: new Date().toISOString(),
      };
      
      if (user.password) {
        updateData.password_hash = user.password;
      }
      if (user.pinCode) {
        updateData.pin_code = user.pinCode;
      }
      
      this.update('users', updateData, { id: user.id });
      return user.id;
    } else {
      const id = uuidv4();
      this.insert('users', {
        id,
        username: user.username,
        password_hash: user.password,
        full_name: user.fullName,
        role: user.role,
        pin_code: user.pinCode || null,
        is_active: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_deleted: 0,
      });
      return id;
    }
  }

  deleteUser(id) {
    this.delete('users', { id });
  }

  // ===== Customer Operations =====
  searchCustomers(query) {
    if (!query) return [];
    const search = `%${query}%`;
    return this.execute(`
      SELECT DISTINCT customer_name, customer_phone 
      FROM orders 
      WHERE (customer_phone LIKE ? OR customer_name LIKE ?) 
        AND customer_phone IS NOT NULL 
        AND customer_phone != ''
      LIMIT 10
    `, [search, search]);
  }

  getOrdersByPhone(phone) {
    const orders = this.execute(`
      SELECT * FROM orders 
      WHERE customer_phone = ? AND is_deleted = 0 
      ORDER BY created_at DESC
    `, [phone]);

    // Enrich with items
    for (const order of orders) {
      order.items = this.execute(`
        SELECT * FROM order_items 
        WHERE order_id = ? AND is_deleted = 0
      `, [order.id]);
    }
    
    return orders;
  }

  // ===== Sessions =====
  logSession(userId, action) {
    this.insert('sessions', {
      id: uuidv4(),
      user_id: userId,
      login_time: action === 'login' ? new Date().toISOString() : null,
      logout_time: action === 'logout' ? new Date().toISOString() : null,
    });
  }

  // ===== Settings =====
  getSetting(key) {
    const results = this.execute(`SELECT value FROM settings WHERE key = ?`, [key]);
    return results[0]?.value || null;
  }

  setSetting(key, value) {
    const existing = this.execute(`SELECT * FROM settings WHERE key = ?`, [key]);
    
    if (existing.length > 0) {
      this.run(`UPDATE settings SET value = ? WHERE key = ?`, [value, key]);
    } else {
      this.insert('settings', { key, value });
    }
  }
  // ===== User Operations =====
  createUser(user) {
    this.insert('users', {
      id: user.id,
      username: user.username,
      password_hash: user.password_hash,
      full_name: user.full_name,
      role: user.role,
      is_active: user.is_active,
      pin_code: user.pin_code,
      created_at: new Date().toISOString()
    });
    return { success: true, id: user.id };
  }

  updateUser(id, updates) {
    this.update('users', updates, { id });
    return { success: true };
  }

  getUserByUsername(username) {
    const users = this.execute('SELECT * FROM users WHERE username = ?', [username]);
    return users[0] || null;
  }

  getUserByPin(pin) {
    const users = this.execute('SELECT * FROM users WHERE pin_code = ? AND is_active = 1', [pin]);
    return users[0] || null;
  }

  logSession(userId, action) {
    // Implementation for session logging if needed
  }
  // ===== Expenses =====
  createExpenses(expenses) {
    const placeholders = expenses.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(',');
    const values = expenses.flatMap(exp => {
      const id = uuidv4();
      const now = new Date().toISOString();
      return [
        id,
        exp.reason,
        exp.amount,
        exp.explanation,
        exp.employee_id,
        exp.employee_name,
        exp.paid_from,
        exp.date,
        now,
        now
      ];
    });

    if (expenses.length > 0) {
      this.db.run(
        `INSERT INTO expenses (id, reason, amount, explanation, employee_id, employee_name, paid_from, date, created_at, updated_at) VALUES ${placeholders}`,
        values
      );
    }
    return { success: true };
  }

  getExpensesByDate(date) {
    return this.execute('SELECT * FROM expenses WHERE date = ? ORDER BY created_at ASC', [date]);
  }

  deleteExpense(id) {
    this.delete('expenses', { id });
    return { success: true };
  }
}

module.exports = { Database };
