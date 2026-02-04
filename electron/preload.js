const { contextBridge, ipcRenderer } = require('electron');

// Define valid channels for security
const validInvokeChannels = [
  // Auth
  'auth:login',
  'auth:loginWithPin',
  'auth:logout',
  'auth:getCurrentUser',
  // Database
  'db:query',
  // Menu
  'menu:getCategories',
  'menu:getItems',
  'menu:saveCategory',
  'menu:saveItem',
  'menu:deleteItem',
  // Orders
  'order:create',
  'order:update',
  'order:getActive',
  'order:getAll',
  'order:getById',
  'order:complete',
  'order:cancel',
  'order:delete',
  // KOT
  'kot:getPending',
  'kot:updateStatus',
  // Inventory
  'inventory:getAll',
  'inventory:updateStock',
  'inventory:save',
  // Reports
  'reports:daily',
  'reports:weekly',
  'reports:salesSummary',
  // Users
  'users:getAll',
  'users:save',
  'users:delete',
  // Printing
  'print:receipt',
  'print:kot',
  'print:testPrint',
  // Sync
  'sync:status',
  'sync:forceSync',
  'sync:getPending',
  // App
  'app:getVersion',
  'app:checkForUpdates',
];

const validOnChannels = [
  'update:available',
  'update:downloaded',
  'sync:statusChanged',
  'network:statusChanged',
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
});

// Expose platform info
contextBridge.exposeInMainWorld('platform', {
  isWindows: process.platform === 'win32',
  isMac: process.platform === 'darwin',
  isLinux: process.platform === 'linux',
});
