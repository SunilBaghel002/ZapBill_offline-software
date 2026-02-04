const { app, BrowserWindow, ipcMain, Menu, Tray } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');
const { Database } = require('./database/db');
const AuthService = require('./services/auth.service');
const SyncService = require('./services/sync.service');
const PrinterService = require('./services/printer.service');

// Configure logging
log.transports.file.level = 'info';
autoUpdater.logger = log;

// Keep a global reference of the window object
let mainWindow = null;
let tray = null;
let db = null;
let authService = null;
let syncService = null;
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
  
  // Initialize services
  authService = new AuthService(db);
  syncService = new SyncService(db);
  printerService = new PrinterService();
  
  // Start sync service (it will auto-detect network status)
  syncService.initialize();
  
  log.info('Services initialized successfully');
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
      return db.execute(table, action, data, where);
    } catch (error) {
      log.error('Database error:', error);
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
      return db.completeOrder(id, paymentMethod);
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

  ipcMain.handle('order:delete', async (event, { id }) => {
    try {
      return db.deleteOrder(id);
    } catch (error) {
      log.error('Delete order error:', error);
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

  ipcMain.handle('inventory:updateStock', async (event, { id, quantity, operation }) => {
    try {
      return db.updateInventoryStock(id, quantity, operation);
    } catch (error) {
      log.error('Update inventory error:', error);
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

  ipcMain.handle('reports:salesSummary', async (event, { from, to }) => {
    try {
      return db.getSalesSummary(from, to);
    } catch (error) {
      log.error('Get sales summary error:', error);
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
      return await printerService.printReceipt(order);
    } catch (error) {
      log.error('Print receipt error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('print:kot', async (event, { order, items }) => {
    try {
      return await printerService.printKOT(order, items);
    } catch (error) {
      log.error('Print KOT error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('print:testPrint', async () => {
    try {
      return await printerService.testPrint();
    } catch (error) {
      log.error('Test print error:', error);
      return { success: false, error: error.message };
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
  if (syncService) {
    syncService.stop();
  }
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
