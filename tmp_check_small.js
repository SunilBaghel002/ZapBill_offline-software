const fs = require('fs');

function parseCSV(content) {
    const lines = content.split('\n').filter(line => line.trim());
    if (lines.length < 2) return [];
    
    // Skip the first row "Can not change"
    const header = lines[1].split(',').map(h => h.trim());
    const data = [];
    
    for (let i = 2; i < lines.length; i++) {
        const values = [];
        let current = '';
        let inQuotes = false;
        
        for (let char of lines[i]) {
            if (char === '"') inQuotes = !inQuotes;
            else if (char === ',' && !inQuotes) {
                values.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        values.push(current.trim());
        
        const obj = {};
        header.forEach((h, index) => {
            obj[h] = values[index];
        });
        data.push(obj);
    }
    return data;
}

const addonCSV = fs.readFileSync('c:/Users/lenovo/OneDrive/Desktop/Projects/ZapBill_offline-software/menu/client_add_ons.csv', 'utf8');
const addons = parseCSV(addonCSV);

const groups = {};

addons.forEach(item => {
    const groupName = item.Addon_Group_Name;
    if (!groupName) return;
    
    if (!groups[groupName]) {
        groups[groupName] = { 
            name: groupName, 
            min: parseInt(item.Addon_Min) || 0, 
            max: parseInt(item.Addon_Max) || 0, 
            selection: item.Addon_Item_Selection, 
            items: [] 
        };
    }
    
    groups[groupName].items.push({ 
        name: item.Addon_Item_Name, 
        price: parseFloat(item.Addon_Item_Price) || 0, 
        type: (item.Attribute || 'veg').toLowerCase() 
    });
});

console.log('GROUP: Small');
console.log(JSON.stringify(groups['Small'], null, 2));
