const httpClient = require('./httpClient');
const licenseService = require('./license.service');
const log = require('electron-log');

class MenuSyncService {
  async syncMenuToCloud(menuData) {
    try {
      log.info('Syncing menu to cloud...');
      // Build the request using httpClient
      const authHeaders = licenseService.getAuthHeaders();
      const payload = {
        menu_data: menuData,
        item_count: menuData.totalItems || menuData.items?.length || 0
      };
      
      const response = await httpClient.post('/v1/wo/internal/menu/sync', payload, authHeaders);
      log.info('Menu sync successful');
      return { success: true, message: 'Menu synced successfully' };
    } catch (e) {
      log.error('Menu sync failed:', e.message);
      return { success: false, message: e.message };
    }
  }

  async syncCouponsToCloud(couponsData) {
    try {
      log.info('Syncing coupons to cloud...');
      const authHeaders = licenseService.getAuthHeaders();
      const payload = {
        coupons_data: couponsData,
        coupon_count: couponsData.length || 0
      };
      
      const response = await httpClient.post('/v1/wo/internal/coupons/sync', payload, authHeaders);
      log.info('Coupons sync successful');
      return { success: true, message: 'Coupons synced successfully' };
    } catch (e) {
      log.error('Coupons sync failed:', e.message);
      return { success: false, message: e.message };
    }
  }
}

module.exports = new MenuSyncService();
