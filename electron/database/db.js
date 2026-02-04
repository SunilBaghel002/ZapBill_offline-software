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
    this.dbPath = path.join(userDataPath, 'restaurant_pos.db');
    
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
    
    // Save to disk
    this.save();
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
    return this.insert('sync_queue', {
      id: uuidv4(),
      table_name: entityType,
      record_id: entityId,
      operation: operation.toUpperCase(),
      payload: JSON.stringify(data),
      status: 'pending',
      retry_count: 0,
      created_at: new Date().toISOString(),
    });
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

  // ===== Order Operations =====
  createOrder(order, items, userId) {
    const orderId = uuidv4();
    const orderNumber = this.getNextOrderNumber();
    const now = new Date().toISOString();

    // Insert order
    this.insert('orders', {
      id: orderId,
      order_number: orderNumber,
      order_type: order.order_type || 'dine_in',
      table_number: order.table_number,
      customer_name: order.customer_name,
      customer_phone: order.customer_phone,
      subtotal: order.subtotal,
      tax_amount: order.tax_amount,
      discount_amount: order.discount_amount || 0,
      total_amount: order.total_amount,
      status: 'active',
      cashier_id: userId,
      created_at: now,
      updated_at: now,
    });

    // Insert order items
    for (const item of items) {
      this.insert('order_items', {
        id: uuidv4(),
        order_id: orderId,
        menu_item_id: item.menu_item_id,
        item_name: item.name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        item_total: item.quantity * item.unit_price,
        special_instructions: item.special_instructions,
        kot_status: 'pending',
        created_at: now,
      });
    }

    // Add to sync queue
    this.addToSyncQueue('order', orderId, 'create', {
      ...order,
      id: orderId,
      order_number: orderNumber,
      items,
    });

    return { id: orderId, orderNumber };
  }

  getNextOrderNumber() {
    const today = new Date().toISOString().split('T')[0];
    
    const results = this.execute(
      `SELECT current_value FROM sequences WHERE sequence_name = 'order_number' AND date = ?`,
      [today]
    );
    
    if (results.length > 0) {
      const nextValue = results[0].current_value + 1;
      this.run(
        `UPDATE sequences SET current_value = ? WHERE sequence_name = 'order_number' AND date = ?`,
        [nextValue, today]
      );
      return nextValue;
    } else {
      this.insert('sequences', {
        sequence_name: 'order_number',
        date: today,
        current_value: 1,
      });
      return 1;
    }
  }

  getOrders(date = null, status = null) {
    let query = `SELECT * FROM orders WHERE 1=1`;
    const params = [];

    if (date) {
      query += ` AND DATE(created_at) = ?`;
      params.push(date);
    }

    if (status) {
      query += ` AND status = ?`;
      params.push(status);
    }

    query += ` ORDER BY created_at DESC`;
    return this.execute(query, params);
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
      completed_at: now,
      updated_at: now,
    }, { id });

    // Update daily sales
    const order = this.getOrderById(id);
    if (order) {
      this.updateDailySales(order, paymentMethod);
    }

    this.addToSyncQueue('order', id, 'update', { status: 'completed', paymentMethod });
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
    // Soft delete the order
    const now = new Date().toISOString();
    
    this.update('orders', {
      is_deleted: 1,
      updated_at: now,
    }, { id });

    this.addToSyncQueue('order', id, 'delete', { id });
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

  updateDailySales(order, paymentMethod) {
    const today = new Date().toISOString().split('T')[0];
    
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
      SELECT oi.*, o.order_number, o.table_number, o.order_type, o.created_at as order_time
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      WHERE oi.kot_status != 'served' AND o.status != 'cancelled'
      ORDER BY o.created_at ASC
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
      
      return item.id;
    } else {
      const id = uuidv4();
      this.insert('inventory', {
        id,
        name: item.name,
        unit: item.unit,
        current_stock: item.current_stock || 0,
        minimum_stock: item.minimum_stock || 0,
        cost_per_unit: item.cost_per_unit,
        supplier: item.supplier,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_deleted: 0,
      });
      
      return id;
    }
  }

  updateInventoryStock(id, quantity, operation) {
    const items = this.execute(`SELECT current_stock FROM inventory WHERE id = ?`, [id]);
    if (items.length === 0) return;
    
    const currentStock = items[0].current_stock;
    const newStock = operation === 'add' 
      ? currentStock + quantity 
      : currentStock - quantity;
    
    this.update('inventory', { 
      current_stock: Math.max(0, newStock),
      updated_at: new Date().toISOString()
    }, { id });
  }

  // ===== Reports =====
  getDailyReport(date) {
    const sales = this.execute(`SELECT * FROM daily_sales WHERE date = ?`, [date]);
    const orders = this.execute(`SELECT * FROM orders WHERE DATE(created_at) = ? ORDER BY created_at DESC`, [date]);
    const topItems = this.execute(`
      SELECT oi.item_name, SUM(oi.quantity) as total_quantity, SUM(oi.total_price) as total_revenue
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      WHERE DATE(o.created_at) = ? AND o.status = 'completed'
      GROUP BY oi.item_name
      ORDER BY total_quantity DESC
      LIMIT 10
    `, [date]);

    return {
      sales: sales[0] || null,
      orders,
      topItems,
    };
  }

  getWeeklyReport(startDate) {
    return this.execute(`
      SELECT * FROM daily_sales 
      WHERE date >= ? AND date < date(?, '+7 days')
      ORDER BY date ASC
    `, [startDate, startDate]);
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
}

module.exports = { Database };
