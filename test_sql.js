const initSqlJs = require('./node_modules/sql.js/dist/sql-wasm.js');
const fs = require('fs');
const path = require('path');

const dbPath = 'c:/Users/lenovo/OneDrive/Documents/db/data/restaurant_pos.db';
const wasmPath = path.join(__dirname, 'node_modules/sql.js/dist/sql-wasm.wasm');
const wasmBinary = fs.readFileSync(wasmPath);

async function test() {
  try {
    const SQL = await initSqlJs({ wasmBinary });
    const fileBuffer = fs.readFileSync(dbPath);
    const db = new SQL.Database(fileBuffer);
    
    // Test the exact query
    const date = '2026-02-26';
    const query = `
      SELECT 
        ? as date,
        COUNT(CASE WHEN status != 'cancelled' THEN 1 END) as total_orders,
        COALESCE(SUM(CASE WHEN status != 'cancelled' THEN total_amount ELSE 0 END), 0) as total_revenue,
        COALESCE(SUM(CASE WHEN status != 'cancelled' THEN tax_amount ELSE 0 END), 0) as total_tax,
        COALESCE(SUM(CASE WHEN status != 'cancelled' THEN discount_amount ELSE 0 END), 0) as total_discount,
        
        COALESCE(SUM(CASE WHEN payment_method = 'cash' AND status IN ('completed', 'active') THEN total_amount ELSE 0 END), 0) +
        COALESCE((SELECT SUM(amount) FROM order_payments op JOIN orders o2 ON op.order_id = o2.id WHERE op.payment_method = 'cash' AND o2.payment_method = 'mixed' AND DATE(o2.created_at, 'localtime') = ? AND o2.status IN ('completed', 'active') AND o2.is_deleted = 0 AND op.is_deleted = 0), 0) as cash_amount,
        
        COALESCE(SUM(CASE WHEN payment_method = 'card' AND status IN ('completed', 'active') THEN total_amount ELSE 0 END), 0) +
        COALESCE((SELECT SUM(amount) FROM order_payments op JOIN orders o2 ON op.order_id = o2.id WHERE op.payment_method = 'card' AND o2.payment_method = 'mixed' AND DATE(o2.created_at, 'localtime') = ? AND o2.status IN ('completed', 'active') AND o2.is_deleted = 0 AND op.is_deleted = 0), 0) as card_amount,
        
        COALESCE(SUM(CASE WHEN payment_method = 'upi' AND status IN ('completed', 'active') THEN total_amount ELSE 0 END), 0) +
        COALESCE((SELECT SUM(amount) FROM order_payments op JOIN orders o2 ON op.order_id = o2.id WHERE op.payment_method = 'upi' AND o2.payment_method = 'mixed' AND DATE(o2.created_at, 'localtime') = ? AND o2.status IN ('completed', 'active') AND o2.is_deleted = 0 AND op.is_deleted = 0), 0) as upi_amount,
        
        COALESCE(SUM(CASE WHEN payment_method = 'mixed' AND status IN ('completed', 'active') THEN total_amount ELSE 0 END), 0) as mixed_amount,
        
        COALESCE(SUM(CASE WHEN payment_method = 'due' AND status IN ('completed', 'active') THEN total_amount ELSE 0 END), 0) +
        COALESCE((SELECT SUM(amount) FROM order_payments op JOIN orders o2 ON op.order_id = o2.id WHERE op.payment_method = 'due' AND o2.payment_method = 'mixed' AND DATE(o2.created_at, 'localtime') = ? AND o2.status IN ('completed', 'active') AND o2.is_deleted = 0 AND op.is_deleted = 0), 0) as due_amount
        
      FROM orders 
      WHERE DATE(created_at, 'localtime') = ? 
        AND is_deleted = 0
    `;
    
    const stmt = db.prepare(query);
    stmt.bind([date, date, date, date, date, date]);
    
    const result = [];
    while (stmt.step()) {
      result.push(stmt.getAsObject());
    }
    stmt.free();
    
    console.log("SUCCESS:", result);
  } catch (err) {
    console.error("SQL_ERROR:", err.message);
  }
}

test();
