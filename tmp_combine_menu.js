const fs = require('fs');
const path = require('path');

// 1. Parse Addons CSV
function parseAddonsCSV(content) {
    const lines = content.split('\n').filter(line => line.trim());
    const header = lines[1].split(',').map(h => h.trim());
    const data = [];
    for (let i = 2; i < lines.length; i++) {
        const values = [];
        let current = '';
        let inQuotes = false;
        for (let char of lines[i]) {
            if (char === '"') inQuotes = !inQuotes;
            else if (char === ',' && !inQuotes) { values.push(current.trim()); current = ''; }
            else { current += char; }
        }
        values.push(current.trim());
        const obj = {};
        header.forEach((h, index) => { obj[h] = values[index]; });
        data.push(obj);
    }
    return data;
}

const addonData = parseAddonsCSV(fs.readFileSync('c:/Users/lenovo/OneDrive/Desktop/Projects/FlashBill_offline-software/menu/client_add_ons.csv', 'utf8'));

// Group by name
const addonGroups = {};
addonData.forEach(row => {
    const gName = row.Addon_Group_Name;
    if (!gName) return;
    if (!addonGroups[gName]) addonGroups[gName] = [];
    addonGroups[gName].push({
        name: row.Addon_Item_Name,
        price: row.Addon_Item_Price,
        type: (row.Attribute || 'veg').toLowerCase()
    });
});

// 2. Parse Menu CSV
function parseMenuCSV(content) {
    const lines = content.split('\n').filter(line => line.trim());
    const header = lines[0].split(',').map(h => h.trim());
    const data = [];
    for (let i = 1; i < lines.length; i++) {
        const values = [];
        let current = '';
        let inQuotes = false;
        for (let char of lines[i]) {
            if (char === '"') inQuotes = !inQuotes;
            else if (char === ',' && !inQuotes) { values.push(current.trim()); current = ''; }
            else { current += char; }
        }
        values.push(current.trim());
        const obj = {};
        header.forEach((h, index) => { obj[h] = values[index]; });
        data.push(obj);
    }
    return data;
}

const menuItems = parseMenuCSV(fs.readFileSync('c:/Users/lenovo/OneDrive/Desktop/Projects/FlashBill_offline-software/menu/flashbill_menu_import.csv', 'utf8'));

// 3. Mapping Logic
const updatedMenu = menuItems.map(item => {
    const name = item['Item Name'] || '';
    const category = (item['Category'] || '').toLowerCase();
    const variants = (item['Variants'] || '').toLowerCase();
    
    let masterAddons = [];
    
    if (category.includes('pizza')) {
        if (variants.includes('small') || name.includes('Small')) masterAddons.push('Small');
        if (variants.includes('medium') || name.includes('Medium')) masterAddons.push('Medium');
        if (variants.includes('large') || name.includes('Large')) masterAddons.push('Large');
        if (category.includes('paneer')) masterAddons.push('Add Veggies Large');
        masterAddons.push('Add On');
    } else if (category.includes('burger')) {
        masterAddons.push('Add On');
        masterAddons.push('Cheese Slice');
        masterAddons.push('Make It A Meal');
    } else if (category.includes('fries')) {
        masterAddons.push('Add On');
    } else if (category.includes('chinese') || category.includes('noodles') || category.includes('rice')) {
        masterAddons.push('Add On');
    }
    
    item['Master Addons'] = masterAddons.join(', ');
    return item;
});

// 4. Generate Output CSV
const headers = ['Item Name', 'Category', 'Price', 'Tax Rate', 'Type', 'Description', 'Variants', 'Master Addons'];
let output = headers.join(',') + '\n';

updatedMenu.forEach(item => {
    const row = headers.map(h => {
        let val = item[h] || '';
        if (val.includes(',') || val.includes('"')) return `"${val.replace(/"/g, '""')}"`;
        return val;
    });
    output += row.join(',') + '\n';
});

fs.writeFileSync('c:/Users/lenovo/OneDrive/Desktop/Projects/FlashBill_offline-software/menu/flashbill_menu_import_combined.csv', output);

// 5. Output Group Seeding Code for user
console.log('--- ADDON GROUPS DEFINITIONS ---');
Object.keys(addonGroups).forEach(gName => {
    console.log(`Group: ${gName}`);
    addonGroups[gName].forEach(i => console.log(`  - ${i.name} (₹${i.price}, ${i.type})`));
});
