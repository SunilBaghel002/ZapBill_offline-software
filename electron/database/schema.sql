-- Restaurant POS Database Schema
-- SQLite database with offline-first architecture

-- Enable foreign keys
PRAGMA foreign_keys = ON;

-- Users & Authentication
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT CHECK(role IN ('admin', 'cashier', 'kitchen')) NOT NULL,
    full_name TEXT NOT NULL,
    pin_code TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    synced_at TEXT,
    is_deleted INTEGER DEFAULT 0
);

-- Menu Categories
CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    display_order INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    synced_at TEXT,
    is_deleted INTEGER DEFAULT 0
);

-- Menu Items
CREATE TABLE IF NOT EXISTS menu_items (
    id TEXT PRIMARY KEY,
    category_id TEXT REFERENCES categories(id),
    name TEXT NOT NULL,
    description TEXT,
    price REAL NOT NULL,
    cost_price REAL,
    tax_rate REAL DEFAULT 0,
    is_vegetarian INTEGER DEFAULT 0,
    is_available INTEGER DEFAULT 1,
    image_path TEXT,
    preparation_time INTEGER,
    display_order INTEGER DEFAULT 0,
    variants TEXT, -- JSON array of {name, price}
    addons TEXT, -- JSON array of {name, price, type}
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    synced_at TEXT,
    is_deleted INTEGER DEFAULT 0
);

-- Global Add-ons
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
);

-- Inventory Items
CREATE TABLE IF NOT EXISTS inventory (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    unit TEXT NOT NULL,
    current_stock REAL DEFAULT 0,
    minimum_stock REAL DEFAULT 0,
    cost_per_unit REAL,
    supplier TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    synced_at TEXT,
    is_deleted INTEGER DEFAULT 0
);

-- Inventory usage per menu item
CREATE TABLE IF NOT EXISTS menu_inventory (
    id TEXT PRIMARY KEY,
    menu_item_id TEXT REFERENCES menu_items(id),
    inventory_id TEXT REFERENCES inventory(id),
    quantity_used REAL NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Inventory Transactions (History)
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
);

-- Orders (Bills)
CREATE TABLE IF NOT EXISTS orders (
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
    is_hold INTEGER DEFAULT 0, -- 1 for held orders
    notes TEXT,
    urgency TEXT CHECK(urgency IN ('normal', 'urgent', 'critical')) DEFAULT 'normal',
    chef_instructions TEXT,
    cashier_id TEXT REFERENCES users(id),
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    completed_at TEXT,
    synced_at TEXT,
    is_deleted INTEGER DEFAULT 0
);

-- Order Items
CREATE TABLE IF NOT EXISTS order_items (
    id TEXT PRIMARY KEY,
    order_id TEXT REFERENCES orders(id) ON DELETE CASCADE,
    menu_item_id TEXT REFERENCES menu_items(id),
    item_name TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price REAL NOT NULL,
    item_total REAL NOT NULL,
    tax_rate REAL DEFAULT 0,
    variant TEXT, -- JSON {name, price}
    addons TEXT, -- JSON array of {name, price}
    special_instructions TEXT,
    kot_status TEXT CHECK(kot_status IN ('pending', 'preparing', 'ready', 'served')) DEFAULT 'pending',
    kot_printed_at TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    is_deleted INTEGER DEFAULT 0
);

-- Sync Queue (Offline-First Architecture)
CREATE TABLE IF NOT EXISTS sync_queue (
    id TEXT PRIMARY KEY,
    table_name TEXT NOT NULL,
    record_id TEXT NOT NULL,
    operation TEXT CHECK(operation IN ('INSERT', 'UPDATE', 'DELETE')) NOT NULL,
    payload TEXT NOT NULL,
    priority INTEGER DEFAULT 1,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 5,
    last_error TEXT,
    status TEXT CHECK(status IN ('pending', 'processing', 'completed', 'failed')) DEFAULT 'pending',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    processed_at TEXT
);

-- Daily Sales Summary (for quick reports)
CREATE TABLE IF NOT EXISTS daily_sales (
    id TEXT PRIMARY KEY,
    date TEXT UNIQUE NOT NULL,
    total_orders INTEGER DEFAULT 0,
    total_revenue REAL DEFAULT 0,
    total_tax REAL DEFAULT 0,
    total_discount REAL DEFAULT 0,
    cash_amount REAL DEFAULT 0,
    card_amount REAL DEFAULT 0,
    upi_amount REAL DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    synced_at TEXT
);

-- Session logs for audit
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id),
    login_time TEXT DEFAULT CURRENT_TIMESTAMP,
    logout_time TEXT,
    device_info TEXT
);

-- Settings table for app configuration
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Order number sequence
CREATE TABLE IF NOT EXISTS sequences (
    sequence_name TEXT PRIMARY KEY,
    current_value INTEGER DEFAULT 0,
    date TEXT
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_date ON orders(date(created_at));
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_kot_status ON order_items(kot_status);
CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue(status);
CREATE INDEX IF NOT EXISTS idx_sync_queue_priority ON sync_queue(priority DESC);
CREATE INDEX IF NOT EXISTS idx_menu_items_category ON menu_items(category_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_available ON menu_items(is_available);
CREATE INDEX IF NOT EXISTS idx_inventory_stock ON inventory(current_stock);

-- Insert default admin user (password: admin123)
INSERT OR IGNORE INTO users (id, username, password_hash, role, full_name, pin_code, is_active)
VALUES (
    'usr_admin_001',
    'admin',
    '$2a$10$0uZiVEU0btARWqNbwsIJauVMawnh43ZMJRVjHym36tG0UKkRXP6qG',
    'admin',
    'Administrator',
    '1234',
    1
);

-- Insert default categories
INSERT OR IGNORE INTO categories (id, name, description, display_order, is_active)
VALUES 
    ('cat_001', 'Starters', 'Appetizers and starters', 1, 1),
    ('cat_002', 'Main Course', 'Main dishes', 2, 1),
    ('cat_003', 'Beverages', 'Drinks and beverages', 3, 1),
    ('cat_004', 'Desserts', 'Sweet dishes and desserts', 4, 1);

-- Insert sample menu items
INSERT OR IGNORE INTO menu_items (id, category_id, name, description, price, tax_rate, is_vegetarian, is_available, display_order)
VALUES 
    ('item_001', 'cat_001', 'Spring Rolls', 'Crispy vegetable spring rolls', 120.00, 5, 1, 1, 1),
    ('item_002', 'cat_001', 'Chicken Wings', 'Spicy chicken wings', 180.00, 5, 0, 1, 2),
    ('item_003', 'cat_002', 'Butter Chicken', 'Creamy butter chicken curry', 280.00, 5, 0, 1, 1),
    ('item_004', 'cat_002', 'Paneer Tikka Masala', 'Cottage cheese in spicy gravy', 240.00, 5, 1, 1, 2),
    ('item_005', 'cat_003', 'Fresh Lime Soda', 'Refreshing lime soda', 60.00, 5, 1, 1, 1),
    ('item_006', 'cat_003', 'Mango Lassi', 'Sweet mango yogurt drink', 80.00, 5, 1, 1, 2),
    ('item_007', 'cat_004', 'Gulab Jamun', 'Sweet milk dumplings', 100.00, 5, 1, 1, 1),
    ('item_008', 'cat_004', 'Ice Cream', 'Vanilla ice cream', 80.00, 5, 1, 1, 2);

-- Initialize order sequence
INSERT OR IGNORE INTO sequences (sequence_name, current_value, date)
VALUES ('order_number', 0, date('now'));

-- Default settings
INSERT OR IGNORE INTO settings (key, value)
VALUES 
    ('restaurant_name', 'My Restaurant'),
    ('restaurant_address', '123 Main Street'),
    ('restaurant_phone', '+91 1234567890'),
    ('gst_number', ''),
    ('currency_symbol', '₹'),
    ('tax_enabled', 'true'),
    ('default_tax_rate', '5'),
    ('printer_name', ''),
    ('printer_type', 'thermal'),
    ('receipt_footer', 'Thank you for dining with us!'),
    ('cloud_api_url', ''),
    ('sync_enabled', 'true'),
    ('sync_interval', '30000');

-- Seed Global Addons
INSERT OR IGNORE INTO addons (id, name, price, type, is_available) VALUES 
('addon-1', 'Extra Cheese', 30.00, 'veg', 1),
('addon-2', 'Spicy Dip', 20.00, 'veg', 1),
('addon-3', 'Peri Peri Sprinkler', 15.00, 'veg', 1),
('addon-4', 'Mayo', 15.00, 'veg', 1),
('addon-5', 'Extra Chicken', 60.00, 'non-veg', 1),
('addon-6', 'Olives', 25.00, 'veg', 1),
('addon-7', 'Jalapenos', 25.00, 'veg', 1);

-- Seed Categories
INSERT OR IGNORE INTO categories (id, name, display_order) VALUES
('cat-1', 'Pizzas', 1),
('cat-2', 'Burgers', 2),
('cat-3', 'Pastas', 3),
('cat-4', 'Beverages', 4),
('cat-5', 'Chinese', 5),
('cat-6', 'Breads', 6);

-- Seed Items (Basic examples)
INSERT OR IGNORE INTO menu_items (id, category_id, name, description, price, is_vegetarian, is_available, tax_rate) VALUES
('item-1', 'cat-1', 'Margherita Pizza', 'Classic delight with 100% real mozzarella cheese', 199.00, 1, 1, 5.0),
('item-2', 'cat-1', 'Farmhouse Pizza', 'Delightful combination of onion, capsicum, tomato & grilled mushroom', 259.00, 1, 1, 5.0),
('item-3', 'cat-1', 'Chicken Pepperoni', 'A classic American taste! Relish the delectable flavor of Chicken Pepperoni', 319.00, 0, 1, 5.0),
('item-4', 'cat-2', 'Crispy Veg Burger', 'Crispy veg patty with fresh lettuce and mayo', 129.00, 1, 1, 5.0),
('item-5', 'cat-2', 'Chicken Whopper', 'Our signature flame-grilled chicken patty', 179.00, 0, 1, 5.0),
('item-6', 'cat-3', 'White Sauce Pasta', 'Creamy white sauce pasta with corn and capsicum', 229.00, 1, 1, 5.0),
('item-7', 'cat-4', 'Coke (300ml)', 'Refreshing cola drink', 40.00, 1, 1, 18.0),
('item-8', 'cat-4', 'Cold Coffee', 'Rich and creamy cold coffee', 120.00, 1, 1, 5.0);
