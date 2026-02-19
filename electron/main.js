const { app, BrowserWindow, ipcMain, Menu, Tray, dialog } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');
const { Database } = require('./database/db');
const AuthService = require('./services/auth.service');
const PrinterService = require('./services/printer.service');
const dataImporter = require('./services/dataImporter');
const fs = require('fs');

// Configure logging
log.transports.file.level = 'info';
autoUpdater.logger = log;

// Keep a global reference of the window object
let mainWindow = null;
let tray = null;
let db = null;
let authService = null;
let printerService = null;

// Determine if in development mode
const isDev = !app.isPackaged;

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    title: 'ZapBill POS',
    icon: path.join(__dirname, '../public/icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      devTools: isDev,
    },
    show: false, // Don't show until ready
    autoHideMenuBar: true, // Hide default menu bar
  });

  // Load the app
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Prevent navigation to external URLs
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('http://localhost') && !url.startsWith('file://')) {
      event.preventDefault();
    }
  });
}

function createTray() {
  try {
    const iconPath = path.join(__dirname, '../public/icon.png');
    const fs = require('fs');
    
    if (!fs.existsSync(iconPath)) {
      log.warn('Tray icon not found, skipping tray creation');
      return;
    }
    
    tray = new Tray(iconPath);
    
    const contextMenu = Menu.buildFromTemplate([
      { 
        label: 'Open POS', 
        click: () => {
          if (mainWindow) {
            mainWindow.show();
            mainWindow.focus();
          }
        }
      },
      { type: 'separator' },
      { 
        label: 'Quit', 
        click: () => {
          app.quit();
        }
      }
    ]);
    
    tray.setToolTip('Restaurant POS');
    tray.setContextMenu(contextMenu);
    
    tray.on('double-click', () => {
      if (mainWindow) {
        mainWindow.show();
        mainWindow.focus();
      }
    });
  } catch (error) {
    log.warn('Failed to create tray:', error.message);
  }
}

async function initializeServices() {
  // Initialize database (async for sql.js)
  db = new Database();
  await db.initialize();
  
  // Ensure printing tables exist (migration for existing databases)
  try { db.ensurePrintingTables(); } catch (e) { log.warn('ensurePrintingTables:', e.message); }
  
  // Initialize services (fully offline - no sync)
  authService = new AuthService(db);
  printerService = new PrinterService();
  
  log.info('Services initialized successfully (offline mode)');
}

function setupIpcHandlers() {
  // ============ AUTHENTICATION ============
  ipcMain.handle('auth:login', async (event, { username, password }) => {
    try {
      return await authService.login(username, password);
    } catch (error) {
      log.error('Login error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('auth:loginWithPin', async (event, { pin }) => {
    try {
      return await authService.loginWithPin(pin);
    } catch (error) {
      log.error('PIN login error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('auth:logout', async (event, { userId }) => {
    try {
      return await authService.logout(userId);
    } catch (error) {
      log.error('Logout error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('auth:getCurrentUser', async () => {
    return authService.getCurrentUser();
  });

  // ============ DATABASE OPERATIONS ============
  ipcMain.handle('db:query', async (event, { table, action, data, where }) => {
    try {
      // For settings table, redirect to proper methods
      if (table === 'settings' && action === 'SELECT') {
        return db.getSettings();
      }
      return db.execute(table, action, data, where);
    } catch (error) {
      log.error('Database error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('db:getPath', async () => {
    return db.dbPath;
  });

  ipcMain.handle('db:movePath', async () => {
    try {
      const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory', 'createDirectory'],
        title: 'Select New Database Folder',
        buttonLabel: 'Move Database Here'
      });

      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, cancelled: true };
      }

      const newFolder = result.filePaths[0];
      const oldPath = db.dbPath;
      const newPath = path.join(newFolder, 'restaurant_pos.db');

      if (oldPath === newPath) {
        return { success: false, error: 'Source and destination are the same.' };
      }

      // Close current connection
      db.close();

      // Copy file
      fs.copyFileSync(oldPath, newPath);

      // Update config
      const userDataPath = app.getPath('userData');
      const configPath = path.join(userDataPath, 'config.json');
      fs.writeFileSync(configPath, JSON.stringify({ dbPath: newFolder }));

      return { success: true, newPath };
    } catch (error) {
      log.error('Move DB error:', error);
      // Try to re-open DB if failed
      await db.initialize(); 
      return { success: false, error: error.message };
    }
  });

  // ============ SETTINGS OPERATIONS ============
  ipcMain.handle('settings:getAll', async () => {
    try {
      return db.getSettings();
    } catch (error) {
      log.error('Get settings error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('settings:get', async (event, { key }) => {
    try {
      return db.getSetting(key);
    } catch (error) {
      log.error('Get setting error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('settings:update', async (event, { key, value }) => {
    try {
      return db.updateSetting(key, value);
    } catch (error) {
      log.error('Update setting error:', error);
      return { success: false, error: error.message };
    }
  });

  // ============ MENU OPERATIONS ============
  ipcMain.handle('menu:getCategories', async () => {
    try {
      return db.getCategories();
    } catch (error) {
      log.error('Get categories error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('menu:getItems', async (event, { categoryId }) => {
    try {
      return db.getMenuItems(categoryId);
    } catch (error) {
      log.error('Get menu items error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('menu:saveCategory', async (event, { category }) => {
    try {
      return db.saveCategory(category);
    } catch (error) {
      log.error('Save category error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('menu:saveItem', async (event, { item }) => {
    try {
      return db.saveMenuItem(item);
    } catch (error) {
      log.error('Save menu item error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('menu:deleteItem', async (event, { id }) => {
    try {
      return db.deleteMenuItem(id);
    } catch (error) {
      log.error('Delete menu item error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('menu:toggleFavorite', async (event, { id, isFavorite }) => {
    try {
      return db.toggleFavorite(id, isFavorite);
    } catch (error) {
      log.error('Toggle favorite error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('menu:deleteCategory', async (event, { id }) => {
    try {
      // Check if any items use this category
      const items = db.execute('SELECT id FROM menu_items WHERE category_id = ? AND is_deleted = 0', [id]);
      if (items.length > 0) {
        return { success: false, error: 'Cannot delete category with existing items. Please remove or move checking items first.' };
      }

      // Soft delete category
      db.run('UPDATE categories SET is_deleted = 1 WHERE id = ?', [id]);
      return { success: true };
    } catch (error) {
      log.error('Delete category error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('order:getActiveCount', async () => {
    try {
      return db.getActiveOrderCount();
    } catch (error) {
      log.error('Get active order count error:', error);
      return 0;
    }
  });



  // ============ ADDONS OPERATIONS ============
  ipcMain.handle('menu:getAddons', async () => {
    try {
      return db.getAddons();
    } catch (error) {
      log.error('Get addons error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('menu:saveAddon', async (event, { addon }) => {
    try {
      return db.saveAddon(addon);
    } catch (error) {
      log.error('Save addon error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('menu:deleteAddon', async (event, { id }) => {
    try {
      return db.deleteAddon(id);
    } catch (error) {
      log.error('Delete addon error:', error);
      return { success: false, error: error.message };
    }
  });

  // ============ ORDER OPERATIONS ============
  ipcMain.handle('order:create', async (event, { order, items }) => {
    try {
      const userId = authService.getCurrentUser()?.id;
      return db.createOrder(order, items, userId);
    } catch (error) {
      log.error('Create order error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('order:update', async (event, { id, updates }) => {
    try {
      db.update('orders', updates, { id });
      return { success: true };
    } catch (error) {
      log.error('Update order error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('order:getActive', async () => {
    try {
      return db.getActiveOrders();
    } catch (error) {
      log.error('Get active orders error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('order:getAll', async (event, { limit }) => {
    try {
      return db.getAllOrders(limit || 50);
    } catch (error) {
      log.error('Get all orders error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('order:getRecent', async (event, { limit }) => {
    try {
      return db.getRecentOrders(limit || 10);
    } catch (error) {
      log.error('Get recent orders error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('order:getById', async (event, { id }) => {
    try {
      return db.getOrderById(id);
    } catch (error) {
      log.error('Get order error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('order:complete', async (event, { id, paymentMethod }) => {
    try {
      log.info('Completing order:', id, 'with payment method:', paymentMethod);
      const result = db.completeOrder(id, paymentMethod);
      log.info('Order completion result:', result);
      return result;
    } catch (error) {
      log.error('Complete order error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('order:cancel', async (event, { id }) => {
    try {
      return db.cancelOrder(id);
    } catch (error) {
      log.error('Cancel order error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('order:getHeld', async () => {
    try {
      return db.getHeldOrders();
    } catch (error) {
      log.error('Get held orders error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('order:resume', async (event, { id }) => {
    try {
      return db.resumeHeldOrder(id);
    } catch (error) {
      log.error('Resume order error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('customer:search', async (event, { query }) => {
    try {
      return db.searchCustomers(query);
    } catch (error) {
      log.error('Search customers error:', error);
      return [];
    }
  });

  ipcMain.handle('customer:getHistory', async (event, { phone }) => {
    try {
      return db.getOrdersByPhone(phone);
    } catch (error) {
      log.error('Get customer history error:', error);
      return [];
    }
  });

  ipcMain.handle('order:getByPhone', async (event, { phone }) => {
    try {
      return db.getOrdersByPhone(phone);
    } catch (error) {
      log.error('Get orders by phone error:', error);
      return [];
    }
  });

  ipcMain.handle('order:delete', async (event, { id }) => {
    try {
      // First get the order details to subtract from daily_sales
      const order = db.execute('SELECT * FROM orders WHERE id = ?', [id])[0];
      
      if (order && order.status === 'completed') {
        // Get the date of the order
        const orderDate = order.created_at.split('T')[0];
        
        // Subtract from daily_sales
        db.run(`
          UPDATE daily_sales 
          SET total_orders = total_orders - 1,
              total_revenue = total_revenue - ?,
              total_tax = total_tax - ?,
              total_discount = total_discount - ?,
              cash_amount = CASE WHEN ? = 'cash' THEN cash_amount - ? ELSE cash_amount END,
              card_amount = CASE WHEN ? = 'card' THEN card_amount - ? ELSE card_amount END,
              upi_amount = CASE WHEN ? = 'upi' THEN upi_amount - ? ELSE upi_amount END
          WHERE date = ?
        `, [
          order.total_amount || 0,
          order.tax_amount || 0,
          order.discount_amount || 0,
          order.payment_method, order.total_amount || 0,
          order.payment_method, order.total_amount || 0,
          order.payment_method, order.total_amount || 0,
          orderDate
        ]);
      }
      
      // Soft delete by marking as deleted
      db.run(`UPDATE orders SET is_deleted = 1, updated_at = ? WHERE id = ?`, 
        [new Date().toISOString(), id]);
      db.run(`UPDATE order_items SET is_deleted = 1 WHERE order_id = ?`, [id]);
      return { success: true };
    } catch (error) {
      log.error('Delete order error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('order:updateItem', async (event, { id, updates }) => {
    try {
      db.update('order_items', updates, { id });
      return { success: true };
    } catch (error) {
      log.error('Update order item error:', error);
      return { success: false, error: error.message };
    }
  });

  // ============ KOT OPERATIONS ============
  ipcMain.handle('kot:getPending', async () => {
    try {
      return db.getPendingKOTs();
    } catch (error) {
      log.error('Get pending KOTs error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('kot:updateStatus', async (event, { orderItemId, status }) => {
    try {
      return db.updateKOTStatus(orderItemId, status);
    } catch (error) {
      log.error('Update KOT status error:', error);
      return { success: false, error: error.message };
    }
  });

  // ============ INVENTORY OPERATIONS ============
  ipcMain.handle('inventory:getAll', async () => {
    try {
      return db.getInventory();
    } catch (error) {
      log.error('Get inventory error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('inventory:save', async (event, { item }) => {
    try {
      return db.saveInventoryItem(item);
    } catch (error) {
      log.error('Save inventory error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('inventory:updateStock', async (event, { id, quantity, operation, reason, notes }) => {
    try {
      return db.updateInventoryStock(id, quantity, operation, reason, notes);
    } catch (error) {
      log.error('Update inventory error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('inventory:getHistory', async (event, { id }) => {
    try {
      return db.getInventoryHistory(id);
    } catch (error) {
      log.error('Get inventory history error:', error);
      return [];
    }
  });

  ipcMain.handle('inventory:delete', async (event, { id }) => {
    try {
      return db.deleteInventoryItem(id);
    } catch (error) {
      log.error('Delete inventory error:', error);
      return { success: false, error: error.message };
    }
  });

  // ============ SHIFT MANAGEMENT OPERATIONS ============
  ipcMain.handle('shifts:start', async (event, { userId, startCash }) => {
    try {
      return db.startShift(userId, startCash);
    } catch (error) {
      log.error('Start shift error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('shifts:end', async (event, { userId, endCash }) => {
    try {
      return db.endShift(userId, endCash);
    } catch (error) {
      log.error('End shift error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('shifts:getStatus', async (event, { userId }) => {
    try {
      const shift = db.getActiveShift(userId);
      return { success: true, shift };
    } catch (error) {
      log.error('Get shift status error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('shifts:getReport', async (event, { shiftId }) => {
    try {
      const report = db.getShiftReport(shiftId);
      return { success: true, report };
    } catch (error) {
      log.error('Get shift report error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('shifts:getByDate', async (event, { date }) => {
    try {
      const shifts = db.getShiftsByDate(date);
      return { success: true, shifts };
    } catch (error) {
      log.error('Get shifts by date error:', error);
      return { success: false, error: error.message };
    }
  });

  // Auto-close shifts on startup (optional, but good practice)
  // try {
  //   db.autoCloseShifts();
  // } catch (e) {
  //   log.error('Auto close shifts error:', e);
  // }

  // ============ EXPENSES OPERATIONS ============
  ipcMain.handle('expenses:create', async (event, { expenses }) => {
    try {
      return db.createExpenses(expenses);
    } catch (error) {
      log.error('Create expenses error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('expenses:getByDate', async (event, { date }) => {
    try {
      return db.getExpensesByDate(date);
    } catch (error) {
      log.error('Get expenses error:', error);
      return [];
    }
  });

  ipcMain.handle('expenses:delete', async (event, { id }) => {
    try {
      return db.deleteExpense(id);
    } catch (error) {
      log.error('Delete expense error:', error);
      return { success: false, error: error.message };
    }
  });

  // ============ DATA IMPORT ============
  ipcMain.handle('data:importMenu', async (event, { filePath }) => {
    try {
      const items = dataImporter.parseMenu(filePath);
      return db.importMenu(items);
    } catch (error) {
      log.error('Import menu error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('data:importInventory', async (event, { filePath }) => {
    try {
      const items = dataImporter.parseInventory(filePath);
      return db.importInventory(items);
    } catch (error) {
      log.error('Import inventory error:', error);
      return { success: false, error: error.message };
    }
  });

  // ============ REPORTS ============
  ipcMain.handle('reports:daily', async (event, { date }) => {
    try {
      return db.getDailyReport(date);
    } catch (error) {
      log.error('Get daily report error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('reports:weekly', async (event, { startDate }) => {
    try {
      return db.getWeeklyReport(startDate);
    } catch (error) {
      log.error('Get weekly report error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('reports:monthly', async (event, { month }) => {
    try {
      return db.getMonthlyReport(month);
    } catch (error) {
      log.error('Get monthly report error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('reports:dailyDetailed', async (event, { date }) => {
    try {
      return db.getDetailedDailyExport(date);
    } catch (error) {
      log.error('Get detailed daily report error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('reports:custom', async (event, { startDate, endDate }) => {
    try {
      return db.getCustomReport(startDate, endDate);
    } catch (error) {
      log.error('Get custom report error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('reports:salesSummary', async (event, { from, to }) => {
    try {
      return db.getSalesSummary(from, to);
    } catch (error) {
      log.error('Get sales summary error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('reports:billerDaily', async (event, { userId, date }) => {
    try {
      return db.getBillerReport(userId, date);
    } catch (error) {
      log.error('Get biller report error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('reports:allBillers', async (event, { date }) => {
    try {
      return db.getAllBillersReport(date);
    } catch (error) {
      log.error('Get all billers report error:', error);
      return { success: false, error: error.message };
    }
  });

  // --- Advanced Reports IPC ---
  
  // Sales
  ipcMain.handle('reports:itemWiseSales', async (event, { startDate, endDate }) => {
    try { return db.getItemWiseSales(startDate, endDate); } catch (e) { log.error(e); return []; }
  });

  ipcMain.handle('reports:addonSales', async (event, { startDate, endDate }) => {
    try { return db.getAddonSales(startDate, endDate); } catch (e) { log.error(e); return []; }
  });

  ipcMain.handle('reports:categoryWiseSales', async (event, { startDate, endDate }) => {
    try { return db.getCategoryWiseSales(startDate, endDate); } catch (e) { log.error(e); return []; }
  });

  ipcMain.handle('reports:hourlySales', async (event, { date }) => {
    try { return db.getHourlySales(date); } catch (e) { log.error(e); return []; }
  });

  ipcMain.handle('reports:cancelledOrders', async (event, { startDate, endDate }) => {
    try { return db.getCancelledOrders(startDate, endDate); } catch (e) { log.error(e); return []; }
  });

  ipcMain.handle('reports:discounts', async (event, { startDate, endDate }) => {
    try { return db.getDiscountReport(startDate, endDate); } catch (e) { log.error(e); return []; }
  });

  ipcMain.handle('reports:gst', async (event, { startDate, endDate }) => {
    try { return db.getGSTReport(startDate, endDate); } catch (e) { log.error(e); return []; }
  });

  // Inventory
  ipcMain.handle('reports:stockLevel', async () => {
    try { return db.getStockLevelReport(); } catch (e) { log.error(e); return []; }
  });

  ipcMain.handle('reports:inventoryHistory', async (event, { startDate, endDate }) => {
    try { return db.getInventoryHistory(startDate, endDate); } catch (e) { log.error(e); return []; }
  });

  // CRM
  ipcMain.handle('reports:customerVisitFrequency', async (event, { startDate, endDate }) => {
    try { return db.getCustomerVisitFrequency(startDate, endDate); } catch (e) { log.error(e); return []; }
  });

  ipcMain.handle('reports:customerOrderHistory', async (event, { phone }) => {
    try { return db.getCustomerOrderHistory(phone); } catch (e) { log.error(e); return []; }
  });

  // Staff
  ipcMain.handle('reports:staffPerformance', async (event, { startDate, endDate }) => {
    try { return db.getStaffPerformance(startDate, endDate); } catch (e) { log.error(e); return []; }
  });

  // Payment
  ipcMain.handle('reports:paymentMode', async (event, { startDate, endDate }) => {
    try { return db.getPaymentModeReport(startDate, endDate); } catch (e) { log.error(e); return []; }
  });

  // ============ USER MANAGEMENT ============
  ipcMain.handle('users:getAll', async () => {
    try {
      return db.getUsers();
    } catch (error) {
      log.error('Get users error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('users:save', async (event, { user }) => {
    try {
      return await authService.createOrUpdateUser(user);
    } catch (error) {
      log.error('Save user error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('users:delete', async (event, { id }) => {
    try {
      return db.deleteUser(id);
    } catch (error) {
      log.error('Delete user error:', error);
      return { success: false, error: error.message };
    }
  });

  // ============ PRINTING ============
  ipcMain.handle('print:receipt', async (event, { order }) => {
    try {
      // Fetch settings to enrich receipt and get printer name
      const settingsRows = db.execute('SELECT * FROM settings');
      const settings = {};
      settingsRows.forEach(row => { settings[row.key] = row.value; });
      
      const enrichedOrder = {
        ...order,
        restaurantName: settings.restaurant_name,
        restaurantAddress: settings.restaurant_address,
        restaurantPhone: settings.restaurant_phone,
        gstNumber: settings.gst_number,
        receiptFooter: settings.receipt_footer,
        fssaiNumber: settings.bill_fssai_number,
        showLogo: settings.bill_show_logo === 'true',
        logoPath: settings.bill_logo_path,
        showQR: settings.bill_show_qr === 'true',
        qrUpiId: settings.bill_qr_upi_id,
        showItemwiseTax: settings.bill_show_itemwise_tax === 'true',
        showCustomerDetails: settings.bill_show_customer_details !== 'false',
        paperWidth: settings.bill_paper_width || '80',
        currencySymbol: settings.currency_symbol || '₹'
      };
      
      return await printerService.printReceipt(enrichedOrder, settings.printer_bill);
    } catch (error) {
      log.error('Print receipt error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('print:kot', async (event, { order, items }) => {
    try {
      const printerName = db.getSetting('printer_kot');
      return await printerService.printKOT(order, items, printerName);
    } catch (error) {
      log.error('Print KOT error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('print:testPrint', async (event, { printerName } = {}) => {
    try {
      // If no printer name provided, use default or fetch from settings?
      // For test print, we might want to test a specific printer from settings page
      return await printerService.testPrint(printerName);
    } catch (error) {
      log.error('Test print error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('print:getPrinters', async () => {
    try {
      if (mainWindow) {
        return await mainWindow.webContents.getPrintersAsync();
      }
      return [];
    } catch (error) {
      log.error('Get printers error:', error);
      return [];
    }
  });

  // ============ PRINTER STATIONS & KOT ============
  ipcMain.handle('printer:getStations', async () => {
    try { return db.getPrinterStations(); }
    catch (e) { log.error('Get printer stations error:', e); return []; }
  });

  ipcMain.handle('printer:saveStation', async (event, { station }) => {
    try { return db.savePrinterStation(station); }
    catch (e) { log.error('Save printer station error:', e); return { success: false, error: e.message }; }
  });

  ipcMain.handle('printer:deleteStation', async (event, { id }) => {
    try { return db.deletePrinterStation(id); }
    catch (e) { log.error('Delete printer station error:', e); return { success: false, error: e.message }; }
  });

  ipcMain.handle('printer:getCategoryMap', async () => {
    try { return db.getCategoryStationMap(); }
    catch (e) { log.error('Get category map error:', e); return []; }
  });

  ipcMain.handle('printer:saveCategoryMap', async (event, { categoryId, stationIds }) => {
    try { return db.saveCategoryStationMap(categoryId, stationIds); }
    catch (e) { log.error('Save category map error:', e); return { success: false, error: e.message }; }
  });

  ipcMain.handle('kot:log', async (event, data) => {
    try { return db.logKOT(data); }
    catch (e) { log.error('Log KOT error:', e); return { success: false, error: e.message }; }
  });

  ipcMain.handle('kot:getLogs', async (event, { orderId }) => {
    try { return db.getKOTLogs(orderId); }
    catch (e) { log.error('Get KOT logs error:', e); return []; }
  });

  // Station-wise KOT printing: routes items to correct kitchen station printers
  ipcMain.handle('print:kotStation', async (event, { order, items, stationId, kotNumber }) => {
    try {
      // Get station printer name
      const stations = db.getPrinterStations();
      const station = stations.find(s => s.id === stationId);
      const printerName = station ? station.printer_name : db.getSetting('printer_kot');
      return await printerService.printKOT(order, items, printerName, kotNumber, station?.station_name);
    } catch (e) {
      log.error('Print KOT station error:', e);
      return { success: false, error: e.message };
    }
  });

  // Void KOT
  ipcMain.handle('print:voidKOT', async (event, { order, items, reason, kotNumber }) => {
    try {
      const printerName = db.getSetting('printer_kot');
      return await printerService.printVoidKOT(order, items, reason, printerName, kotNumber);
    } catch (e) {
      log.error('Print void KOT error:', e);
      return { success: false, error: e.message };
    }
  });

  // Reprint receipt (marks as REPRINT)
  ipcMain.handle('print:reprint', async (event, { order, type }) => {
    try {
      const settingsRows = db.execute('SELECT * FROM settings');
      const settings = {};
      settingsRows.forEach(row => { settings[row.key] = row.value; });
      
      const enrichedOrder = {
        ...order,
        restaurantName: settings.restaurant_name,
        restaurantAddress: settings.restaurant_address,
        restaurantPhone: settings.restaurant_phone,
        gstNumber: settings.gst_number,
        receiptFooter: settings.receipt_footer,
        fssaiNumber: settings.bill_fssai_number,
        showLogo: settings.bill_show_logo === 'true',
        logoPath: settings.bill_logo_path,
        showQR: settings.bill_show_qr === 'true',
        qrUpiId: settings.bill_qr_upi_id,
        showItemwiseTax: settings.bill_show_itemwise_tax === 'true',
        showCustomerDetails: settings.bill_show_customer_details === 'true',
        paperWidth: settings.bill_paper_width || '80',
        isReprint: true
      };
      
      const printerName = type === 'kot' ? settings.printer_kot : settings.printer_bill;
      
      if (type === 'kot') {
        return await printerService.printKOT(enrichedOrder, order.items || [], printerName, null, null, true);
      } else {
        return await printerService.printReceipt(enrichedOrder, printerName);
      }
    } catch (e) {
      log.error('Reprint error:', e);
      return { success: false, error: e.message };
    }
  });

  // Logo file picker for bill customization
  ipcMain.handle('print:selectLogo', async () => {
    try {
      const { dialog } = require('electron');
      const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openFile'],
        filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'bmp'] }]
      });
      if (result.canceled || !result.filePaths.length) return { cancelled: true };
      
      // Read file and convert to base64
      const fs = require('fs');
      const filePath = result.filePaths[0];
      const buffer = fs.readFileSync(filePath);
      const ext = require('path').extname(filePath).slice(1).toLowerCase();
      const base64 = `data:image/${ext === 'jpg' ? 'jpeg' : ext};base64,${buffer.toString('base64')}`;
      return { success: true, base64, filePath };
    } catch (e) {
      log.error('Select logo error:', e);
      return { success: false, error: e.message };
    }
  });

  // ============ SYNC STATUS ============
  ipcMain.handle('sync:status', async () => {
    return syncService.getStatus();
  });

  ipcMain.handle('sync:forceSync', async () => {
    try {
      return await syncService.forceSync();
    } catch (error) {
      log.error('Force sync error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('sync:getPending', async () => {
    try {
      return db.getPendingSyncItems();
    } catch (error) {
      log.error('Get pending sync error:', error);
      return { success: false, error: error.message };
    }
  });

  // ============ APP INFO ============
  ipcMain.handle('app:getVersion', async () => {
    return app.getVersion();
  });

  ipcMain.handle('app:checkForUpdates', async () => {
    try {
      return await autoUpdater.checkForUpdatesAndNotify();
    } catch (error) {
      log.error('Check updates error:', error);
      return { success: false, error: error.message };
    }
  });
}

// App event handlers
app.whenReady().then(async () => {
  await initializeServices();
  setupIpcHandlers();
  createWindow();
  createTray();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  // Check for updates (in production only)
  if (!isDev) {
    autoUpdater.checkForUpdatesAndNotify();
  }
});

app.on('window-all-closed', () => {
  // On macOS, keep app running in tray
  if (process.platform !== 'darwin') {
    // Keep running in background on Windows
    // app.quit();
  }
});

app.on('before-quit', () => {
  // Cleanup
  if (db) {
    db.close();
  }
});

// Auto-updater events
autoUpdater.on('update-available', (info) => {
  log.info('Update available:', info);
  if (mainWindow) {
    mainWindow.webContents.send('update:available', info);
  }
});

autoUpdater.on('update-downloaded', (info) => {
  log.info('Update downloaded:', info);
  if (mainWindow) {
    mainWindow.webContents.send('update:downloaded', info);
  }
});

autoUpdater.on('error', (error) => {
  log.error('Auto-updater error:', error);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  log.error('Uncaught exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  log.error('Unhandled rejection at:', promise, 'reason:', reason);
});
