const { app, BrowserWindow, ipcMain, Menu, Tray } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');
const { Database } = require('./database/db');
const AuthService = require('./services/auth.service');
const PrinterService = require('./services/printer.service');

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
    title: 'Restaurant POS',
    icon: path.join(__dirname, '../public/icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      devTools: isDev,
    },
    show: false, // Don't show until ready
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
        receiptFooter: settings.receipt_footer
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
