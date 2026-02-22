const fs = require('fs');
const initSqlJs = require('sql.js');
const path = require('path');
const os = require('os');

async function verify() {
    const SQL = await initSqlJs();
    const dbPath = 'C:\\Users\\lenovo\\OneDrive\\Documents\\db\\restaurant_pos.db';

    if (!fs.existsSync(dbPath)) {
        console.log('DB not found at', dbPath);
        return;
    }

    const fileBuffer = fs.readFileSync(dbPath);
    const db = new SQL.Database(fileBuffer);

    console.log('--- ALL ITEMS ---');
    try {
        const total = db.exec("SELECT COUNT(*) FROM menu_items");
        const withMenuId = db.exec("SELECT menu_id, COUNT(*) FROM menu_items GROUP BY menu_id");
        const deleted = db.exec("SELECT is_deleted, COUNT(*) FROM menu_items GROUP BY is_deleted");
        
        console.log('Total items in table:', total[0].values[0][0]);
        console.log('Items by menu_id:', JSON.stringify(withMenuId, null, 2));
        console.log('Items by is_deleted:', JSON.stringify(deleted, null, 2));
        
        const samples = db.exec("SELECT name, menu_id, is_deleted FROM menu_items LIMIT 5");
        console.log('Samples:', JSON.stringify(samples, null, 2));

        const catsCount = db.exec("SELECT COUNT(*) FROM categories");
        console.log('Total categories:', catsCount[0].values[0][0]);
    } catch (e) {
        console.error('Error:', e.message);
    }
}

verify();
