const { ipcMain } = require('electron');
const licenseService = require('../services/license.service');
const heartbeatService = require('../services/heartbeatService');
const menuSyncService = require('../services/menuSyncService');

module.exports = function registerIpcHandlers(websiteOrdersService) {
  ipcMain.handle('zapbillCloud:activateLicense', async (_, { licenseKey, licenseSecret }) => {
    return await licenseService.activate(licenseKey, licenseSecret);
  });

  ipcMain.handle('zapbillCloud:getLicenseStatus', () => {
    return licenseService.getLicenseStatus();
  });

  ipcMain.handle('zapbillCloud:heartbeatNow', async () => {
    return await heartbeatService.runHeartbeat();
  });

  ipcMain.handle('zapbillCloud:testConnection', async () => {
    return await licenseService.testConnection();
  });

  ipcMain.handle('zapbillCloud:checkOrdersNow', async () => {
    if (websiteOrdersService && websiteOrdersService.isPolling === false) {
      await websiteOrdersService._pollOnce();
    }
    return websiteOrdersService ? websiteOrdersService.getOrders({ status: 'pending' }) : [];
  });

  ipcMain.handle('zapbillCloud:acceptOrder', async (_, { orderId, estimatedMinutes, message }) => {
    if (!websiteOrdersService) return { success: false, error: 'Service not initialized' };
    return await websiteOrdersService.acknowledgeOrder(orderId, 'accepted', message);
  });

  ipcMain.handle('zapbillCloud:rejectOrder', async (_, { orderId, reason, message }) => {
    if (!websiteOrdersService) return { success: false, error: 'Service not initialized' };
    return await websiteOrdersService.acknowledgeOrder(orderId, 'rejected', message, reason);
  });

  ipcMain.handle('zapbillCloud:updateOrderStatus', async (_, { orderId, status, message }) => {
    if (!websiteOrdersService) return { success: false, error: 'Service not initialized' };
    return await websiteOrdersService.updateOrderStatus(orderId, status, message);
  });

  ipcMain.handle('zapbillCloud:syncMenuNow', async (_, { menuData }) => {
    return await menuSyncService.syncMenuToCloud(menuData);
  });

  ipcMain.handle('zapbillCloud:syncCouponsNow', async (_, { couponsData }) => {
    return await menuSyncService.syncCouponsToCloud(couponsData);
  });

  ipcMain.handle('zapbillCloud:getNetworkStatus', () => {
    return {
      is_online: heartbeatService.consecutiveFailures < 3,
      last_heartbeat: licenseService.licenseData?.last_sync,
      is_polling_orders: websiteOrdersService ? websiteOrdersService.isPolling || !!websiteOrdersService.pollingTimer : false,
      polling_interval: websiteOrdersService ? websiteOrdersService.config.polling.interval_seconds : 10,
      server_url: websiteOrdersService ? websiteOrdersService.config.server.url : null,
      latency_ms: websiteOrdersService && websiteOrdersService.stats.responseTimes.length > 0 
                  ? websiteOrdersService.stats.responseTimes[websiteOrdersService.stats.responseTimes.length - 1] 
                  : 0
    };
  });

  ipcMain.handle('zapbillCloud:pauseOrderPolling', () => {
    if (websiteOrdersService) websiteOrdersService.stopPolling();
    return { success: true };
  });

  ipcMain.handle('zapbillCloud:resumeOrderPolling', () => {
    if (websiteOrdersService) websiteOrdersService.startPolling();
    return { success: true };
  });

  // ─── DEVICE SYNC IPC HANDLERS ─────────────────────
  const dataSyncService = require('../services/dataSyncService');
  const axios = require('axios');
  const NetworkService = require('../services/network.service');

  // Generate a sync PIN (source device)
  ipcMain.handle('sync:generatePin', () => {
    const pin = dataSyncService.generateSyncPin();
    const ip = NetworkService.getLocalIP();
    const port = websiteOrdersService?.db ? 3000 : 3000; // QR server port
    return { pin, ip, port, deviceName: require('os').hostname() };
  });

  // Get this device's sync info
  ipcMain.handle('sync:getDeviceInfo', () => {
    const ip = NetworkService.getLocalIP();
    return {
      ip,
      port: 3000,
      deviceName: require('os').hostname(),
      manifest: dataSyncService.getTableManifest()
    };
  });

  // Connect to a remote device and authenticate (target device)
  ipcMain.handle('sync:connect', async (_, { ip, port, pin }) => {
    try {
      const url = `http://${ip}:${port}`;
      
      // First check if device is reachable
      const infoRes = await axios.get(`${url}/api/sync/info`, { timeout: 5000 });
      if (!infoRes.data?.ready) {
        return { success: false, error: 'Remote device is not ready for sync' };
      }

      // Authenticate with PIN
      const authRes = await axios.post(`${url}/api/sync/auth`, { pin }, { timeout: 5000 });
      if (!authRes.data?.success) {
        return { success: false, error: authRes.data?.error || 'Authentication failed' };
      }

      return {
        success: true,
        token: authRes.data.token,
        deviceName: authRes.data.deviceName,
        tables: authRes.data.tables,
        serverUrl: url
      };
    } catch (e) {
      const msg = e.code === 'ECONNREFUSED' ? 'Could not connect to device. Check IP and ensure ZapBill is running.'
                : e.code === 'ECONNABORTED' ? 'Connection timed out. Are both devices on the same WiFi?'
                : e.response?.data?.error || e.message;
      return { success: false, error: msg };
    }
  });

  // Pull all data from remote device (target device)
  ipcMain.handle('sync:pullAll', async (_, { serverUrl, token }) => {
    try {
      const res = await axios.get(`${serverUrl}/api/sync/export-all`, {
        headers: { 'x-sync-token': token },
        timeout: 120000, // 2 min for large datasets
        maxContentLength: 500 * 1024 * 1024 // 500MB max
      });

      if (!res.data?.success || !res.data?.data) {
        return { success: false, error: 'Failed to download data from source device' };
      }

      // Import the data
      const result = dataSyncService.importAll(res.data.data);
      return result;
    } catch (e) {
      const msg = e.response?.data?.error || e.message;
      return { success: false, error: `Sync failed: ${msg}`, errors: [{ table: '_network', error: msg }] };
    }
  });

  // Pull a single table from remote device
  ipcMain.handle('sync:pullTable', async (_, { serverUrl, token, tableName }) => {
    try {
      const res = await axios.get(`${serverUrl}/api/sync/export/${tableName}`, {
        headers: { 'x-sync-token': token },
        timeout: 60000
      });

      if (!res.data?.success || !res.data?.data) {
        return { success: false, error: `Failed to download ${tableName}` };
      }

      const result = dataSyncService.importTable(tableName, res.data.data.rows);
      return { success: true, ...result };
    } catch (e) {
      return { success: false, error: e.response?.data?.error || e.message };
    }
  });
};
