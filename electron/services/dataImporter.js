const XLSX = require('xlsx');

const dataImporter = {
  // Parse "Name:Price, Name:Price" → [{name, price}]
  _parseVariants: (raw) => {
    if (!raw || typeof raw !== 'string' || !raw.trim()) return null;
    try {
      const parts = raw.split(',').map(s => s.trim()).filter(Boolean);
      const variants = parts.map(part => {
        const [name, priceStr] = part.split(':').map(s => s.trim());
        return { name, price: parseFloat(priceStr) || 0 };
      }).filter(v => v.name);
      return variants.length > 0 ? variants : null;
    } catch (e) {
      return null;
    }
  },

  // Parse "Name:Price:Type, Name:Price:Type" → [{name, price, type}]
  _parseAddons: (raw) => {
    if (!raw || typeof raw !== 'string' || !raw.trim()) return null;
    try {
      const parts = raw.split(',').map(s => s.trim()).filter(Boolean);
      const addons = parts.map(part => {
        const pieces = part.split(':').map(s => s.trim());
        return {
          name: pieces[0],
          price: parseFloat(pieces[1]) || 0,
          type: (pieces[2] || 'veg').toLowerCase()
        };
      }).filter(a => a.name);
      return addons.length > 0 ? addons : null;
    } catch (e) {
      return null;
    }
  },

  parseMenu: (filePath) => {
    try {
      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(sheet);

      // Map and validate
      return data.map(row => {
        const variants = dataImporter._parseVariants(row['Variants']);
        const addons = dataImporter._parseAddons(row['Addons']);

        return {
          name: row['Item Name'] || row['Name'],
          category: row['Category'] || 'Uncategorized',
          price: parseFloat(row['Price'] || 0),
          tax_rate: parseFloat(row['Tax'] || row['Tax Rate'] || 0),
          type: (row['Type'] || row['Veg/Non-Veg'] || 'veg').toLowerCase(),
          description: row['Description'] || '',
          is_vegetarian: (row['Type'] || row['Veg/Non-Veg'] || 'veg').toLowerCase() === 'veg' ? 1 : 0,
          variants: variants ? JSON.stringify(variants) : null,
          addons: addons ? JSON.stringify(addons) : null
        };
      }).filter(item => item.name); // Filter empty rows
    } catch (error) {
      console.error('Error parsing menu file:', error);
      throw error;
    }
  },

  parseInventory: (filePath) => {
    try {
      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(sheet);

      return data.map(row => ({
        name: row['Item Name'] || row['Name'],
        unit: row['Unit'] || 'pcs',
        current_stock: parseFloat(row['Stock'] || row['Current Stock'] || 0),
        minimum_stock: parseFloat(row['Min Stock'] || row['Minimum Stock'] || 0),
        cost_per_unit: parseFloat(row['Cost'] || row['Cost Price'] || 0),
        supplier: row['Supplier'] || ''
      })).filter(item => item.name);
    } catch (error) {
      console.error('Error parsing inventory file:', error);
      throw error;
    }
  }
};

module.exports = dataImporter;
