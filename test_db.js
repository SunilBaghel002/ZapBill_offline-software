const { Database } = require('./electron/database/db');
const db = new Database();

const printers = db.getPrinterStations();
console.log("PRINTERS:", printers);

const map = db.getCategoryStationMap();
console.log("CATEGORY MAP:", map);

const menuItems = db.execute('SELECT id, name, category_id FROM menu_items LIMIT 5');
console.log("MENU ITEMS SAMPLE:", menuItems);

const testCart = db.execute(`
      SELECT oi.*, mi.category_id 
      FROM order_items oi
      LEFT JOIN menu_items mi ON oi.menu_item_id = mi.id
      LIMIT 10
`);
console.log("ORDER ITEMS SAMPLE:", testCart);
