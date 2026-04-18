/**
 * Website Orders Service
 * Polls a cloud server for online orders placed via the restaurant's website.
 * Acts as a temporary postbox: once FlashBill pulls and acknowledges an order,
 * the cloud server deletes the order data for privacy.
 */
const fs = require('fs');
const path = require('path');
const { app } = require('electron');
const log = require('electron-log');
const httpClient = require('./httpClient');
const licenseService = require('./license.service');

class WebsiteOrdersService {
  constructor(db, mainWindow) {
    this.db = db;
    this.mainWindow = mainWindow;
    this.configPath = path.join(app.getPath('userData'), 'flashbill-website-orders-config.json');
    this.config = this.loadConfig();
    this.pollingTimer = null;
    this.isPolling = false;

    // Stats (reset daily)
    this.stats = {
      totalChecksToday: 0,
      successfulChecks: 0,
      failedChecks: 0,
      ordersReceivedToday: 0,
      consecutiveFailures: 0,
      lastCheckTime: null,
      avgResponseTime: 0,
      responseTimes: [],
      statsDate: new Date().toDateString()
    };

    // Connection logs (in-memory, last 100)
    this.connectionLogs = [];
  }

  // ─── Config Management ───────────────────────────────────

  loadConfig() {
    try {
      if (fs.existsSync(this.configPath)) {
        return JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
      }
    } catch (e) {
      log.error('WebsiteOrders: Error loading config:', e);
    }
    return this.getDefaultConfig();
  }

  saveConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
    return this.config;
  }

  getDefaultConfig() {
    return {
      server: {
        url: '',
        api_key: '',
        restaurant_id: '',
        endpoints: {
          fetch_orders: '/api/orders/pending',
          acknowledge_order: '/api/orders/acknowledge',
          update_status: '/api/orders/status',
          sync_menu: '/api/menu/update',
          sync_coupons: '/api/coupons/update'
        }
      },
      polling: {
        enabled: false,
        interval_seconds: 10,
        connection_timeout_seconds: 10,
        max_retries: 3
      },
      notifications: {
        sound_enabled: true,
        sound_type: 'bell_ring',
        custom_sound_path: null,
        sound_volume: 80,
        repeat_sound: true,
        repeat_interval_seconds: 10,
        desktop_notification: true,
        flash_taskbar: true,
        badge_count: true,
        fullscreen_alert: false,
        auto_print_kot: false,
        auto_print_bill: false
      },
      processing: {
        auto_accept: false,
        auto_reject_enabled: true,
        auto_reject_minutes: 30,
        order_prefix: 'WEB-',
        delivery_enabled: true,
        pickup_enabled: true,
        dinein_enabled: false,
        min_delivery_amount: 200,
        delivery_charge: 30,
        free_delivery_above: 500,
        max_delivery_distance_km: 5
      },
      sync: {
        menu_sync_mode: 'on_change',
        coupon_sync_mode: 'on_change',
        last_menu_sync: null,
        last_coupon_sync: null,
        menu_item_count: 0,
        active_coupon_count: 0
      }
    };
  }

  // ─── Database Table ────────────────────────────────────────

  ensureTable() {
    try {
      const db = this.db.db || this.db;
      if (db && db.exec) {
        db.exec(`
          CREATE TABLE IF NOT EXISTS website_orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_id TEXT UNIQUE NOT NULL,
            customer_name TEXT,
            customer_phone TEXT,
            customer_email TEXT,
            order_type TEXT DEFAULT 'delivery',
            delivery_address TEXT,
            items TEXT,
            coupon_code TEXT,
            coupon_discount REAL DEFAULT 0,
            subtotal REAL DEFAULT 0,
            delivery_charge REAL DEFAULT 0,
            packaging_charge REAL DEFAULT 0,
            tax_amount REAL DEFAULT 0,
            grand_total REAL DEFAULT 0,
            payment_mode TEXT,
            payment_status TEXT,
            payment_transaction_id TEXT,
            customer_note TEXT,
            status TEXT DEFAULT 'pending',
            reject_reason TEXT,
            order_time TEXT,
            received_time TEXT,
            accepted_time TEXT,
            completed_time TEXT,
            biller_name TEXT,
            raw_data TEXT,
            created_at TEXT DEFAULT (datetime('now', 'localtime'))
          )
        `);
        log.info('WebsiteOrders: Table ensured');
      }
    } catch (e) {
      log.error('WebsiteOrders: Table creation error:', e.message);
    }
  }

  // ─── Polling Engine ────────────────────────────────────────

  startPolling() {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
    }

    if (!this.config.polling.enabled || !this.config.server.url) {
      log.info('WebsiteOrders: Polling not enabled or no server URL configured');
      return;
    }

    const interval = (this.config.polling.interval_seconds || 10) * 1000;
    log.info(`WebsiteOrders: Starting polling every ${this.config.polling.interval_seconds}s to ${this.config.server.url}`);

    // Immediate first check
    this._pollOnce();

    this.pollingTimer = setInterval(() => {
      this._pollOnce();
    }, interval);
  }

  stopPolling() {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }
    this.isPolling = false;
    log.info('WebsiteOrders: Polling stopped');
  }

  async _pollOnce() {
    if (this.isPolling) return; // Prevent overlapping polls
    this.isPolling = true;

    // Reset daily stats if date changed
    const today = new Date().toDateString();
    if (this.stats.statsDate !== today) {
      this.stats = { ...this.stats, totalChecksToday: 0, successfulChecks: 0, failedChecks: 0, ordersReceivedToday: 0, consecutiveFailures: 0, responseTimes: [], statsDate: today };
    }

    const startTime = Date.now();
    this.stats.totalChecksToday++;
    this.stats.lastCheckTime = new Date().toISOString();

    const url = this.config.server.url + this.config.server.endpoints.fetch_orders;

    try {
      const authHeaders = licenseService.getAuthHeaders();
      // Add custom restaurant headers if present in local config
      if (this.config.server.api_key) authHeaders['x-api-key'] = this.config.server.api_key;
      if (this.config.server.restaurant_id) authHeaders['x-restaurant-id'] = this.config.server.restaurant_id;

      // Ensure URL starts with / for relative path since httpClient uses baseURL
      let endpoint = this.config.server.endpoints.fetch_orders;
      if (!endpoint.startsWith('/')) endpoint = '/' + endpoint;

      const data = await httpClient.get('/v1/wo/internal/poll', authHeaders);

      const elapsed = Date.now() - startTime;
      this.stats.responseTimes.push(elapsed);
      if (this.stats.responseTimes.length > 100) this.stats.responseTimes.shift();
      this.stats.avgResponseTime = Math.round(this.stats.responseTimes.reduce((a, b) => a + b, 0) / this.stats.responseTimes.length);

      this.stats.successfulChecks++;
      this.stats.consecutiveFailures = 0;

      const orders = data.orders || [];
      const orderIds = orders.map(o => o.order_id).join(', ');

      this._addLog('success', elapsed, orders.length, orders.length > 0 ? `Orders: ${orderIds}` : 'No new orders');

      if (orders.length > 0) {
        this.stats.ordersReceivedToday += orders.length;
        await this._processNewOrders(orders);
      }

    } catch (err) {
      const elapsed = Date.now() - startTime;
      this.stats.failedChecks++;
      this.stats.consecutiveFailures++;

      const detail = err.name === 'AbortError' ? `Connection timeout after ${this.config.polling.connection_timeout_seconds}s` : err.message;
      this._addLog('error', elapsed, 0, detail);

      // Notify UI only after 5 consecutive failures
      if (this.stats.consecutiveFailures >= 5 && this.mainWindow && !this.mainWindow.isDestroyed()) {
        this.mainWindow.webContents.send('websiteOrders:connectionError', { message: detail, failures: this.stats.consecutiveFailures });
      }
    } finally {
      this.isPolling = false;
    }
  }

  async _processNewOrders(orders) {
    for (const order of orders) {
      try {
        // Store in local database
        this._storeOrder(order);

        // Notify the frontend
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
          this.mainWindow.webContents.send('websiteOrders:newOrder', order);
        }

        // Auto-accept if configured
        if (this.config.processing.auto_accept) {
          await this.acknowledgeOrder(order.order_id, 'accepted', 'Auto-accepted by system');
        }
      } catch (e) {
        log.error(`WebsiteOrders: Error processing order ${order.order_id}:`, e.message);
      }
    }
  }

  _storeOrder(order) {
    try {
      const db = this.db.db || this.db;
      if (!db || !db.run) return;

      const stmt = db.prepare(`
        INSERT OR IGNORE INTO website_orders 
        (order_id, customer_name, customer_phone, customer_email, order_type,
         delivery_address, items, coupon_code, coupon_discount, subtotal,
         delivery_charge, packaging_charge, tax_amount, grand_total,
         payment_mode, payment_status, payment_transaction_id, customer_note,
         status, order_time, received_time, raw_data)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const bill = order.bill_summary || {};
      const payment = order.payment || {};
      const customer = order.customer || {};
      const coupon = order.coupon || {};

      stmt.run([
        order.order_id,
        customer.name || '',
        customer.phone || '',
        customer.email || '',
        order.order_type || 'delivery',
        JSON.stringify(order.delivery_address || {}),
        JSON.stringify(order.items || []),
        coupon.code || '',
        coupon.discount_amount || 0,
        bill.subtotal || 0,
        bill.delivery_charge || 0,
        bill.packaging_charge || 0,
        (bill.cgst || 0) + (bill.sgst || 0),
        bill.grand_total || 0,
        payment.mode || 'cod',
        payment.status || 'pending',
        payment.transaction_id || '',
        order.customer_note || '',
        'pending',
        order.order_time || new Date().toISOString(),
        new Date().toISOString(),
        JSON.stringify(order)
      ]);

      stmt.free();
      if (db.getChanges) db.getChanges();
      // Persist
      if (this.db.save) this.db.save();
    } catch (e) {
      log.error('WebsiteOrders: Store order error:', e.message);
    }
  }

  // ─── Order Actions ─────────────────────────────────────────

  async acknowledgeOrder(orderId, action, message, reason) {
    const authHeaders = licenseService.getAuthHeaders();
    if (this.config.server.api_key) authHeaders['x-api-key'] = this.config.server.api_key;
    if (this.config.server.restaurant_id) authHeaders['x-restaurant-id'] = this.config.server.restaurant_id;

    const body = { order_id: orderId, action, message: message || '' };
    if (reason) body.reason = reason;

    try {
      await httpClient.post('/v1/wo/internal/acknowledge', body, authHeaders);
    } catch (e) {
      log.warn('WebsiteOrders: Acknowledge failed (order still saved locally):', e.message);
    }

    // Update local DB
    this._updateOrderStatus(orderId, action === 'accepted' ? 'accepted' : 'rejected', reason);
    return { success: true };
  }

  async updateOrderStatus(orderId, status, message) {
    const authHeaders = licenseService.getAuthHeaders();
    if (this.config.server.api_key) authHeaders['x-api-key'] = this.config.server.api_key;
    if (this.config.server.restaurant_id) authHeaders['x-restaurant-id'] = this.config.server.restaurant_id;

    try {
      await httpClient.post('/v1/wo/internal/status', { order_id: orderId, status, message: message || '' }, authHeaders);
    } catch (e) {
      log.warn('WebsiteOrders: Status update to cloud failed:', e.message);
    }

    this._updateOrderStatus(orderId, status);
    return { success: true };
  }

  _updateOrderStatus(orderId, status, reason) {
    try {
      const db = this.db.db || this.db;
      if (!db || !db.run) return;

      let sql = `UPDATE website_orders SET status = ?`;
      const params = [status];

      if (status === 'accepted') {
        sql += `, accepted_time = datetime('now', 'localtime')`;
      } else if (status === 'completed' || status === 'delivered') {
        sql += `, completed_time = datetime('now', 'localtime')`;
      }
      if (reason) {
        sql += `, reject_reason = ?`;
        params.push(reason);
      }

      sql += ` WHERE order_id = ?`;
      params.push(orderId);

      db.run(sql, params);
      if (this.db.save) this.db.save();
    } catch (e) {
      log.error('WebsiteOrders: Update status error:', e.message);
    }
  }

  // ─── Query Orders ──────────────────────────────────────────

  getOrders(filters = {}) {
    try {
      const db = this.db.db || this.db;
      if (!db) return [];

      let sql = 'SELECT * FROM website_orders WHERE 1=1';
      const params = [];

      if (filters.status && filters.status !== 'all') {
        sql += ' AND status = ?';
        params.push(filters.status);
      }
      if (filters.order_type && filters.order_type !== 'all') {
        sql += ' AND order_type = ?';
        params.push(filters.order_type);
      }
      if (filters.search) {
        sql += ' AND (customer_name LIKE ? OR customer_phone LIKE ? OR order_id LIKE ?)';
        const s = `%${filters.search}%`;
        params.push(s, s, s);
      }
      if (filters.date_from) {
        sql += ' AND date(order_time) >= date(?)';
        params.push(filters.date_from);
      }
      if (filters.date_to) {
        sql += ' AND date(order_time) <= date(?)';
        params.push(filters.date_to);
      }

      sql += ' ORDER BY created_at DESC';

      if (filters.limit) {
        sql += ' LIMIT ?';
        params.push(filters.limit);
      }

      const stmt = db.prepare(sql);
      if (params.length) stmt.bind(params);

      const results = [];
      while (stmt.step()) {
        const row = stmt.getAsObject();
        // Parse JSON fields
        try { row.items = JSON.parse(row.items); } catch (e) { row.items = []; }
        try { row.delivery_address = JSON.parse(row.delivery_address); } catch (e) { row.delivery_address = {}; }
        try { row.raw_data = JSON.parse(row.raw_data); } catch (e) { row.raw_data = {}; }
        results.push(row);
      }
      stmt.free();
      return results;
    } catch (e) {
      log.error('WebsiteOrders: Query orders error:', e.message);
      return [];
    }
  }

  getOrderCounts() {
    try {
      const db = this.db.db || this.db;
      if (!db) return { pending: 0, accepted: 0, rejected: 0, completed: 0 };

      const today = new Date().toISOString().split('T')[0];

      const counts = { pending: 0, accepted: 0, rejected: 0, completed: 0 };
      const statusList = ['pending', 'accepted', 'rejected', 'completed'];

      for (const s of statusList) {
        let sql = `SELECT COUNT(*) as cnt FROM website_orders WHERE status = ?`;
        const params = [s];
        if (s !== 'pending') {
          sql += ` AND date(created_at) = date(?)`;
          params.push(today);
        }
        const stmt = db.prepare(sql);
        stmt.bind(params);
        if (stmt.step()) {
          counts[s] = stmt.getAsObject().cnt || 0;
        }
        stmt.free();
      }
      return counts;
    } catch (e) {
      log.error('WebsiteOrders: Count error:', e.message);
      return { pending: 0, accepted: 0, rejected: 0, completed: 0 };
    }
  }

  // ─── Connection Test ───────────────────────────────────────

  async testConnection() {
    if (!this.config.server.url) {
      return { success: false, message: 'No server URL configured' };
    }

    const start = Date.now();
    try {
      const authHeaders = licenseService.getAuthHeaders();
      
      await httpClient.get('/ping', authHeaders);

      const latency = Date.now() - start;
      return { success: true, latency, message: `Connected successfully (${latency}ms)` };
    } catch (e) {
      const latency = Date.now() - start;
      return { success: false, latency, message: e.message };
    }
  }

  // ─── Logging ───────────────────────────────────────────────

  _addLog(status, responseTime, ordersReceived, details) {
    const entry = {
      timestamp: new Date().toISOString(),
      status,
      responseTime,
      ordersReceived,
      details
    };
    this.connectionLogs.unshift(entry);
    if (this.connectionLogs.length > 100) this.connectionLogs.pop();
  }

  getLogs(limit = 50) {
    return this.connectionLogs.slice(0, limit);
  }

  clearLogs() {
    this.connectionLogs = [];
  }

  getStats() {
    return { ...this.stats };
  }

  getPollingStatus() {
    return {
      enabled: this.config.polling.enabled,
      active: !!this.pollingTimer,
      lastCheckTime: this.stats.lastCheckTime,
      interval: this.config.polling.interval_seconds,
      ...this.stats
    };
  }

  // ─── Lifecycle ─────────────────────────────────────────────

  setMainWindow(win) {
    this.mainWindow = win;
  }

  initialize() {
    this.ensureTable();
    if (this.config.polling.enabled && this.config.server.url) {
      this.startPolling();
    }
  }

  destroy() {
    this.stopPolling();
  }
}

module.exports = WebsiteOrdersService;
