const { contextBridge, ipcRenderer, webFrame } = require('electron');

// Define valid channels for security
// Define valid channels for security
const validInvokeChannels = [
  // License
  'license:getHardwareId',
  'license:getLicense',
  'license:activate',
  'license:sync',
  
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
  'menu:assignGlobalAddonToItems',
  'menu:assignMasterAddonToItems',
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
  'order:deleteMultiple',
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
  'data:importAddonGroups',
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
  'print:summaryReport',
  'print:qr',
  // Printer Stations & KOT
  'printer:getStations',
  'printer:saveStation',
  'printer:deleteStation',
  'printer:getCategoryMap',
  'printer:saveCategoryMap',
  'printer:getItemMap',
  'printer:saveItemMap',
  'printer:getKotExcludedItems',
  'printer:toggleKotExcludedItem',
  'printer:saveKotExcludedItems',
  'printer:getMenuItemsByCategory',
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
  'app:restart',
  // Discounts
  'discounts:getAll',
  'discounts:getActive',
  'discounts:add',
  'discounts:update',
  'discounts:delete',
  // QR Orders
  'qr:getServerStatus',
  'qr:getPendingOrders',
  'qr:getAllOrders',
  'qr:confirmOrder',
  'qr:confirmOnly',
  'qr:rejectOrder',
  'qr:generateQR',
  'qr:getNetworkInfo',
  // Email Reports
  'email:getConfig',
  'email:saveConfig',
  'email:getLogs',
  'email:checkInternet',
  'email:sendReportNow',
  'email:getMenuItemsForPicker',
  'email:getCategoriesForPicker',
  'email:getAddonsForPicker',
  'network:getConfig',
  'network:saveConfig',
  'network:checkPorts',
  'network:scanPortConflicts',
  'network:getInterfaces',
  'websiteOrders:getConfig',
  'websiteOrders:saveConfig',
  'websiteOrders:testConnection',
  'websiteOrders:getOrders',
  'websiteOrders:getCounts',
  'websiteOrders:getPollingStatus',
  'websiteOrders:getLogs',
  'websiteOrders:clearLogs',
  'websiteOrders:acknowledge',
  'websiteOrders:updateStatus',
  'websiteOrders:startPolling',
  'websiteOrders:stopPolling',
  'websiteOrders:pollNow'
];

const validOnChannels = [
  'update:available',
  'update:downloaded',
  'qr:newOrder',
  'websiteOrders:newOrder',
  'websiteOrders:connectionError',
  'admin:forceLogout',
  'admin:amcUpdated',
  'admin:activated',
  'license:revoked',
  'license:updated',
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

// ZapBill Cloud specific APIs
contextBridge.exposeInMainWorld('zapbillCloud', {
  // License methods
  activateLicense: (licenseKey, licenseSecret) => ipcRenderer.invoke('zapbillCloud:activateLicense', { licenseKey, licenseSecret }),
  getLicenseStatus: () => ipcRenderer.invoke('zapbillCloud:getLicenseStatus'),
  testConnection: () => ipcRenderer.invoke('zapbillCloud:testConnection'),
  heartbeatNow: () => ipcRenderer.invoke('zapbillCloud:heartbeatNow'),

  // Order methods
  checkOrdersNow: () => ipcRenderer.invoke('zapbillCloud:checkOrdersNow'),
  acceptOrder: (orderId, estimatedMinutes, message) => ipcRenderer.invoke('zapbillCloud:acceptOrder', { orderId, estimatedMinutes, message }),
  rejectOrder: (orderId, reason, message) => ipcRenderer.invoke('zapbillCloud:rejectOrder', { orderId, reason, message }),
  updateOrderStatus: (orderId, status, message) => ipcRenderer.invoke('zapbillCloud:updateOrderStatus', { orderId, status, message }),
  pauseOrderPolling: () => ipcRenderer.invoke('zapbillCloud:pauseOrderPolling'),
  resumeOrderPolling: () => ipcRenderer.invoke('zapbillCloud:resumeOrderPolling'),

  // Menu/Coupon sync
  syncMenuNow: (menuData) => ipcRenderer.invoke('zapbillCloud:syncMenuNow', { menuData }),
  syncCouponsNow: (couponsData) => ipcRenderer.invoke('zapbillCloud:syncCouponsNow', { couponsData }),

  // Network methods
  getNetworkStatus: () => ipcRenderer.invoke('zapbillCloud:getNetworkStatus'),

  // Event listeners
  onNewOrder: (callback) => {
    const subscription = (event, order) => callback(order);
    ipcRenderer.on('websiteOrders:newOrder', subscription);
    return () => ipcRenderer.removeListener('websiteOrders:newOrder', subscription);
  },
  onFeaturesChanged: (callback) => {
    const subscription = (event, features) => callback(features);
    ipcRenderer.on('features-changed', subscription);
    return () => ipcRenderer.removeListener('features-changed', subscription);
  },
  onServerMessages: (callback) => {
    const subscription = (event, messages) => callback(messages);
    ipcRenderer.on('server-messages', subscription);
    return () => ipcRenderer.removeListener('server-messages', subscription);
  },
  onGoingOffline: (callback) => {
    const subscription = () => callback(true);
    ipcRenderer.on('gone-offline', subscription);
    return () => ipcRenderer.removeListener('gone-offline', subscription);
  },
  onBackOnline: (callback) => {
    const subscription = () => callback(true);
    ipcRenderer.on('back-online', subscription);
    return () => ipcRenderer.removeListener('back-online', subscription);
  }
});
