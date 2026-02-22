const fs = require('fs');
const initSqlJs = require('sql.js');
const path = require('path');

async function inspect() {
    const SQL = await initSqlJs();
    const dbPath = 'c:\\Users\\lenovo\\OneDrive\\Desktop\\Projects\\ZapBill_offline-software\\electron\\database\\restaurant.db';
    
    if (!fs.existsSync(dbPath)) {
        console.log('DB not found at', dbPath);
        return;
    }

    const fileBuffer = fs.readFileSync(dbPath);
    const db = new SQL.Database(fileBuffer);

    console.log('--- MENUS ---');
    const menus = db.exec('SELECT id, name, is_active, is_deleted FROM menus');
    console.log(JSON.stringify(menus, null, 2));

    console.log('--- CATEGORIES ---');
    const cats = db.exec('SELECT id, name, menu_id, is_deleted FROM categories');
    console.log(JSON.stringify(cats, null, 2));

    console.log('--- MENU ITEMS ---');
    const items = db.exec('SELECT id, name, category_id, menu_id, is_deleted, is_available FROM menu_items');
    console.log(JSON.stringify(items, null, 2));
}

inspect();
