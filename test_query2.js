const sqlite3 = require('./node_modules/better-sqlite3');
const db = new sqlite3('c:/Users/lenovo/OneDrive/Documents/db/data/restaurant_pos.db');

try {
  const date = '2026-02-26';
  const stmt = db.prepare(`
    SELECT 
      ? as date,
      COUNT(CASE WHEN status != 'cancelled' THEN 1 END) as total_orders,
      COALESCE(SUM(CASE WHEN status != 'cancelled' THEN total_amount ELSE 0 END), 0) as total_revenue,
      
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
  `);
  const result = stmt.get([date, date, date, date, date, date]);
  console.log("TEST QUERY RESULT:", result);

  const orders = db.prepare('SELECT id, created_at, status, is_deleted, total_amount, payment_method FROM orders WHERE is_deleted = 0 ORDER BY created_at DESC LIMIT 5').all();
  console.log("RECENT ORDERS:", orders);
} catch (e) {
  console.error("ERROR:", e);
}
