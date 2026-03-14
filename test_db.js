const fs = require('fs');
const initSqlJs = require('sql.js');
const path = require('path');

async function test() {
  const dbPath = 'C:\\Users\\lenovo\\AppData\\Roaming\\restaurant-pos\\restaurant_pos.db';
  const fileBuffer = fs.readFileSync(dbPath);
  
  const wasmPath = path.join(
    require.resolve('sql.js'),
    '..',
    'sql-wasm.wasm'
  );
  
  const SQL = await initSqlJs({
    wasmBinary: fs.readFileSync(wasmPath)
  });
  
  const db = new SQL.Database(fileBuffer);
  
  try {
    const results = [];
    const limit = 50;
    const stmt = db.prepare(`
      SELECT o.*, u.full_name as cashier_name
      FROM orders o
      LEFT JOIN users u ON o.cashier_id = u.id
      WHERE o.is_deleted = 0
      ORDER BY o.created_at DESC
      LIMIT ?
    `);
    stmt.bind([limit]);
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();
    console.log('Orders found:', results.length);
    if (results.length > 0) {
      console.log('Sample order:', results[0]);
    }
  } catch (err) {
    console.error('SQL Error:', err);
  }
}
test();
