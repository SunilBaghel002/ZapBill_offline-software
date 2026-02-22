const fs = require('fs');
const initSqlJs = require('sql.js');
const path = require('path');
const os = require('os');

async function verify() {
    const SQL = await initSqlJs();
    
    // The path from the user's terminal log!
    const dbPath = 'C:\\Users\\lenovo\\OneDrive\\Documents\\db\\restaurant_pos.db';

    if (!fs.existsSync(dbPath)) {
        console.log('DB not found at', dbPath);
        return;
    }

    console.log('Found DB at:', dbPath);
    const fileBuffer = fs.readFileSync(dbPath);
    const db = new SQL.Database(fileBuffer);

    console.log('--- SYSTEM INFO ---');
    try {
        const menus = db.exec("SELECT id, name, is_active FROM menus WHERE is_deleted = 0");
        console.log('Menus:', JSON.stringify(menus, null, 2));

        const activeMenu = db.exec("SELECT * FROM menus WHERE is_active = 1 AND is_deleted = 0");
        if (activeMenu.length > 0 && activeMenu[0].values.length > 0) {
            const menuId = activeMenu[0].values[0][0]; 
            console.log('Active Menu ID:', menuId);

            const itemsCount = db.exec(`SELECT COUNT(*) FROM menu_items WHERE menu_id = '${menuId}' AND is_deleted = 0`);
            console.log(`Total items in active menu:`, itemsCount[0].values[0][0]);

            const availabilityCheck = db.exec(`SELECT is_available, COUNT(*) FROM menu_items WHERE menu_id = '${menuId}' AND is_deleted = 0 GROUP BY is_available`);
            console.log('Availability Stats:', JSON.stringify(availabilityCheck, null, 2));

            const samples = db.exec(`SELECT name, is_available, menu_id FROM menu_items WHERE menu_id = '${menuId}' AND is_deleted = 0 LIMIT 10`);
            console.log('Sample Items:', JSON.stringify(samples, null, 2));
        } else {
            console.log('No active menu found.');
        }
    } catch (e) {
        console.error('Error querying DB:', e.message);
    }
}

verify();
