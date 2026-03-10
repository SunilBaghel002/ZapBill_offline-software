const sqlite3 = require('sqlite3').verbose();
const dbPath = 'C:\\Users\\lenovo\\OneDrive\\Documents\\db\\data\\restaurant_pos.db';
const db = new sqlite3.Database(dbPath);

console.log('--- STATIONS ---');
db.all('SELECT id, name FROM printer_stations', [], (err, rows) => {
  if (err) throw err;
  console.log(rows);
});

console.log('--- CATEGORIES ---');
db.all('SELECT id, name FROM categories', [], (err, rows) => {
  if (err) throw err;
  console.log(rows);
});

console.log('--- MAP ---');
db.all('SELECT * FROM category_station_map', [], (err, rows) => {
  if (err) throw err;
  console.log(rows);
});

console.log('--- ORDER DATA 260309008 ---');
db.all('SELECT id FROM orders WHERE order_number = ?', ['260309008'], (err, rows) => {
  if (err) throw err;
  if (rows.length > 0) {
    const orderId = rows[0].id;
    db.all(`
      SELECT oi.item_name, mi.category_id, c.name as category_name
      FROM order_items oi
      LEFT JOIN menu_items mi ON oi.menu_item_id = mi.id
      LEFT JOIN categories c ON mi.category_id = c.id
      WHERE oi.order_id = ?
    `, [orderId], (err, items) => {
      if (err) throw err;
      console.log(items);
    });
  } else {
    console.log('Order not found');
  }
});
