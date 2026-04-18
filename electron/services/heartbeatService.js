const { ipcMain, BrowserWindow } = require('electron');
const licenseService = require('./license.service');
const log = require('electron-log');
const config = require('../config');

class HeartbeatService {
  constructor() {
    this.interval = null;
    this.isRunning = false;
    this.consecutiveFailures = 0;
    this.maxOfflineDays = config.OFFLINE_TOKEN_VALID_DAYS || 30;
  }

  start(intervalMinutes = config.HEARTBEAT_INTERVAL_MINUTES || 30) {
    if (this.isRunning) return;
    this.isRunning = true;
    
    // Run immediately
    this.runHeartbeat();
    
    this.interval = setInterval(() => {
      this.runHeartbeat();
    }, intervalMinutes * 60 * 1000);
    
    log.info(`Heartbeat service started (interval: ${intervalMinutes}m)`);
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    this.isRunning = false;
    log.info('Heartbeat service stopped');
  }

  async runHeartbeat() {
    try {
      const result = await licenseService.heartbeat();
      
      if (this.consecutiveFailures >= 3) {
        this.notifyRenderer('back-online', true);
      }
      
      this.consecutiveFailures = 0;
      
      // We can emit events based on the result
      if (result.status === 'success') {
        this.notifyRenderer('features-changed', result.features);
        if (result.messages && result.messages.length > 0) {
          this.notifyRenderer('server-messages', result.messages);
        }
      } else if (result.status === 'revoked') {
        this.notifyRenderer('license:revoked');
      }
      
      return result;
    } catch (e) {
      this.consecutiveFailures++;
      log.warn(`Heartbeat failure #${this.consecutiveFailures}:`, e.message);
      
      if (this.consecutiveFailures === 3) {
        this.notifyRenderer('gone-offline', true);
      }
      
      return { status: 'error', error: e.message };
    }
  }

  notifyRenderer(channel, data) {
    BrowserWindow.getAllWindows().forEach(w => {
      if (!w.isDestroyed()) {
        w.webContents.send(channel, data);
      }
    });
  }
}

module.exports = new HeartbeatService();
