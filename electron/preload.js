const { contextBridge, ipcRenderer, webFrame } = require('electron');

// Define valid channels for security
const validInvokeChannels = [
  // Auth
  'auth:login',
  'auth:loginWithPin',
  'auth:logout',
  'auth:getCurrentUser',
  // Database
  'db:query',
  'db:getPath',
  'db:movePath',
  'dialog:selectFile',
  // Menu
  'menu:getCategories',
  'menu:getItems',
  'menu:saveCategory',
  'menu:saveItem',
  'menu:deleteItem',
  'menu:getAddons',
  'menu:saveAddon',
  'menu:deleteAddon',
  'menu:toggleFavorite',
  'menu:getMenus',
  'menu:getActiveMenu',
  'menu:setActiveMenu',
  'menu:saveMenu',
  'menu:deleteMenu',
  'menu:duplicateMenu',
  'menu:deleteCategory',
  'menu:getMasterAddons',
  'menu:saveMasterAddon',
  'menu:deleteMasterAddon',
  // Orders
  'order:create',
  'order:update',
  'order:updateItem',
  'order:getActive',
  'order:getAll',
  'order:getRecent',
  'order:getById',
  'order:complete',
  'order:getActiveCount',
  'order:cancel',
  'order:delete',
  'order:getHeld',
  'order:resume',
  'order:getByPhone',
  // KOT
  'kot:getPending',
  'kot:updateStatus',
  // Inventory
  'inventory:getAll',
  'inventory:updateStock',
  'inventory:save',
  'inventory:getHistory',
  'inventory:delete',
  // Expenses
  'expenses:create',
  'expenses:getByDate',
  'expenses:delete',
  // Reports
  'reports:daily',
  'reports:weekly',
  'reports:monthly',
  'reports:salesSummary',
  'reports:billerDaily',
  'reports:dailyDetailed',
  'reports:allBillers',
  // Advanced Reports
  'reports:itemWiseSales',
  'reports:addonSales',
  'reports:categoryWiseSales',
  'reports:hourlySales',
  'reports:cancelledOrders',
  'reports:discounts',
  'reports:gst',
  'reports:stockLevel',
  'reports:inventoryHistory',
  'reports:customerVisitFrequency',
  'reports:customerOrderHistory',
  'reports:staffPerformance',
  'reports:paymentMode',
  // Users
  'users:getAll',
  'users:save',
  'users:delete',
  // Customers
  'customer:search',
  'customer:getHistory',
  'customer:getDueStatus',
  // Data Import
  'data:importMenu',
  'data:importInventory',
  // Printing
  'print:receipt',
  'print:kot',
  'print:testPrint',
  'print:getPrinters',
  'print:kotStation',
  'print:kotRouted',
  'print:voidKOT',
  'print:reprint',
  'print:selectLogo',
  // Printer Stations & KOT
  'printer:getStations',
  'printer:saveStation',
  'printer:deleteStation',
  'printer:getCategoryMap',
  'printer:saveCategoryMap',
  'kot:log',
  'kot:getLogs',
  // Settings
  'settings:getAll',
  'settings:get',
  'settings:update',
  // Shift Management
  'shifts:start',
  'shifts:end',
  'shifts:getStatus',
  'shifts:getReport',
  'shifts:getByDate',
  // Day Management
  'day:getStatus',
  'day:open',
  'day:addBalance',
  // App
  'app:getVersion',
  'app:checkForUpdates',
  // Discounts
  'discounts:getAll',
  'discounts:getActive',
  'discounts:add',
  'discounts:update',
  'discounts:delete',
];

const validOnChannels = [
  'update:available',
  'update:downloaded',
];

// Expose protected APIs to renderer
contextBridge.exposeInMainWorld('electronAPI', {
  // Invoke IPC channel (request-response pattern)
  invoke: (channel, data) => {
    if (validInvokeChannels.includes(channel)) {
      return ipcRenderer.invoke(channel, data);
    }
    console.error(`Invalid invoke channel: ${channel}`);
    return Promise.reject(new Error(`Invalid channel: ${channel}`));
  },

  // Listen to IPC channel (event pattern)
  on: (channel, callback) => {
    if (validOnChannels.includes(channel)) {
      const subscription = (event, ...args) => callback(...args);
      ipcRenderer.on(channel, subscription);
      // Return unsubscribe function
      return () => {
        ipcRenderer.removeListener(channel, subscription);
      };
    }
    console.error(`Invalid on channel: ${channel}`);
    return () => {};
  },

  // One-time listener
  once: (channel, callback) => {
    if (validOnChannels.includes(channel)) {
      ipcRenderer.once(channel, (event, ...args) => callback(...args));
    } else {
      console.error(`Invalid once channel: ${channel}`);
    }
  },

  // Remove all listeners for a channel
  removeAllListeners: (channel) => {
    if (validOnChannels.includes(channel)) {
      ipcRenderer.removeAllListeners(channel);
    }
  },

  // Zoom factor
  setZoomFactor: (factor) => {
    if (typeof factor === 'number') {
      webFrame.setZoomFactor(factor);
    }
  },
  getZoomFactor: () => webFrame.getZoomFactor(),
});

// Expose platform info
contextBridge.exposeInMainWorld('platform', {
  isWindows: process.platform === 'win32',
  isMac: process.platform === 'darwin',
  isLinux: process.platform === 'linux',
});
