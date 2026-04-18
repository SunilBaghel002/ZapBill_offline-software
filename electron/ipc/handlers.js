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
};
