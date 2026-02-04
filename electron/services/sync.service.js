const https = require('https');
const http = require('http');
const dns = require('dns');
const log = require('electron-log');
const { BrowserWindow } = require('electron');

class SyncService {
  constructor(db) {
    this.db = db;
    this.isOnline = false;
    this.isSyncing = false;
    this.syncInterval = null;
    this.networkCheckInterval = null;
    this.cloudApiUrl = null;
    this.syncIntervalMs = 30000; // 30 seconds
  }

  initialize() {
    // Load settings
    this.cloudApiUrl = this.db.getSetting('cloud_api_url');
    const syncIntervalSetting = this.db.getSetting('sync_interval');
    if (syncIntervalSetting) {
      this.syncIntervalMs = parseInt(syncIntervalSetting, 10);
    }

    // Start network monitoring
    this.startNetworkMonitoring();

    log.info('Sync service initialized');
  }

  startNetworkMonitoring() {
    // Check network status immediately
    this.checkNetworkStatus();

    // Periodically check network status
    this.networkCheckInterval = setInterval(() => {
      this.checkNetworkStatus();
    }, 10000); // Check every 10 seconds
  }

  async checkNetworkStatus() {
    try {
      // Try to resolve a known DNS
      await new Promise((resolve, reject) => {
        dns.lookup('google.com', (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      if (!this.isOnline) {
        this.isOnline = true;
        this.onNetworkOnline();
      }
    } catch (error) {
      if (this.isOnline) {
        this.isOnline = false;
        this.onNetworkOffline();
      }
    }
  }

  onNetworkOnline() {
    log.info('Network is online, starting sync');
    this.notifyRenderer('network:statusChanged', { online: true });
    this.startSync();
  }

  onNetworkOffline() {
    log.info('Network is offline, stopping sync');
    this.notifyRenderer('network:statusChanged', { online: false });
    this.stopSync();
  }

  startSync() {
    if (!this.cloudApiUrl) {
      log.warn('Cloud API URL not configured, sync disabled');
      return;
    }

    // Immediate sync attempt
    this.processSyncQueue();

    // Start periodic sync
    this.syncInterval = setInterval(() => {
      this.processSyncQueue();
    }, this.syncIntervalMs);
  }

  stopSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  stop() {
    this.stopSync();
    if (this.networkCheckInterval) {
      clearInterval(this.networkCheckInterval);
      this.networkCheckInterval = null;
    }
    log.info('Sync service stopped');
  }

  async processSyncQueue() {
    if (this.isSyncing || !this.isOnline) {
      return;
    }

    this.isSyncing = true;
    this.notifyRenderer('sync:statusChanged', { syncing: true });

    try {
      const pendingItems = this.db.getPendingSyncItems();

      if (pendingItems.length === 0) {
        log.debug('No pending items to sync');
        return;
      }

      log.info(`Processing ${pendingItems.length} sync items`);

      // Batch sync for efficiency
      const batchPayload = pendingItems.map(item => ({
        localId: item.id,
        table: item.table_name,
        operation: item.operation,
        record: JSON.parse(item.payload),
        timestamp: item.created_at,
      }));

      const response = await this.sendToCloud('/api/sync/batch', 'POST', batchPayload);

      if (response.success) {
        // Process results
        for (const result of response.results) {
          if (result.status === 'success') {
            this.db.updateSyncItemStatus(result.localId, 'completed');
            
            // Update synced_at on the original record
            const item = pendingItems.find(i => i.id === result.localId);
            if (item) {
              const updateQuery = `UPDATE ${item.table_name} SET synced_at = datetime('now') WHERE id = ?`;
              this.db.db.prepare(updateQuery).run(item.record_id);
            }
          } else if (result.status === 'conflict') {
            log.warn(`Sync conflict for ${result.localId}: ${result.error}`);
            this.db.updateSyncItemStatus(result.localId, 'failed', result.error);
          } else {
            this.db.incrementSyncRetry(result.localId);
          }
        }
      }
    } catch (error) {
      log.error('Sync processing error:', error);
    } finally {
      this.isSyncing = false;
      this.notifyRenderer('sync:statusChanged', { syncing: false });
    }
  }

  async forceSync() {
    if (!this.isOnline) {
      return { success: false, error: 'No network connection' };
    }

    await this.processSyncQueue();
    return { success: true };
  }

  async sendToCloud(endpoint, method, data) {
    return new Promise((resolve, reject) => {
      const url = new URL(endpoint, this.cloudApiUrl);
      const isHttps = url.protocol === 'https:';
      const client = isHttps ? https : http;

      const options = {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname,
        method: method,
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      };

      const req = client.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            resolve(parsed);
          } catch (e) {
            resolve({ success: false, error: 'Invalid response' });
          }
        });
      });

      req.on('error', (error) => {
        log.error('Cloud API error:', error);
        reject(error);
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      if (data) {
        req.write(JSON.stringify(data));
      }

      req.end();
    });
  }

  getStatus() {
    const pendingCount = this.db.getPendingSyncItems().length;
    return {
      online: this.isOnline,
      syncing: this.isSyncing,
      pendingCount,
      cloudConfigured: !!this.cloudApiUrl,
    };
  }

  notifyRenderer(channel, data) {
    const windows = BrowserWindow.getAllWindows();
    windows.forEach(window => {
      if (!window.isDestroyed()) {
        window.webContents.send(channel, data);
      }
    });
  }
}

module.exports = SyncService;
