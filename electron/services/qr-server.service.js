 /**
 * QR Server Service
 * Express.js + Socket.io server running inside Electron main process
 * Serves mobile customer menu and handles QR order API
 */
const express = require('express');
const http = require('http');
const { Server: SocketIOServer } = require('socket.io');
const path = require('path');
const log = require('electron-log');
const NetworkService = require('./network.service');

class QRServerService {
  constructor(db, mainWindow) {
    this.db = db;
    this.mainWindow = mainWindow;
    this.app = null;
    this.server = null;
    this.io = null;
    this.port = 3000;
    this.running = false;
    this.licenseService = null;
  }

  setLicenseService(licenseService) {
    this.licenseService = licenseService;
  }

  /**
   * Start the Express + Socket.io server
   * Tries port 3000, then 3001, 3002, etc.
   */
  async start() {
    if (this.running) {
      log.info('QR Server already running');
      return { success: true, port: this.port };
    }

    this.app = express();
    this.app.use(express.json());

    // Setup routes
    this._setupRoutes();

    // Create HTTP server
    this.server = http.createServer(this.app);

    // Setup Socket.io
    this.io = new SocketIOServer(this.server, {
      cors: { origin: '*' },
      transports: ['websocket', 'polling'],
    });

    this.io.on('connection', (socket) => {
      log.info('Socket.io client connected:', socket.id);
      socket.on('disconnect', () => {
        log.info('Socket.io client disconnected:', socket.id);
      });
    });

    // Try to start on the configured network port, fallback to next if busy
    const port = NetworkService.config?.server?.qr_port || 3000;
    return this._tryListen(port);
  }

  /**
   * Try to listen on a port, fallback to next if busy
   */
  _tryListen(port, maxAttempts = 10) {
    return new Promise((resolve) => {
      let attempts = 0;
      const tryPort = (p) => {
        const bindAddress = NetworkService.config?.server?.bind_address || '0.0.0.0';
        this.server.listen(p, bindAddress, () => {
          this.port = p;
          this.running = true;
          const ip = NetworkService.getLocalIP();
          log.info(`QR Server started on http://${ip}:${p}`);
          resolve({ success: true, port: p, ip });
        });

        this.server.once('error', (err) => {
          if (err.code === 'EADDRINUSE' && attempts < maxAttempts) {
            attempts++;
            log.warn(`Port ${p} busy, trying ${p + 1}...`);
            this.server.removeAllListeners('error');
            // Need a new server instance since the old one errored
            this.server = http.createServer(this.app);
            this.io = new SocketIOServer(this.server, {
              cors: { origin: '*' },
              transports: ['websocket', 'polling'],
            });
            this.io.on('connection', (socket) => {
              log.info('Socket.io client connected:', socket.id);
              socket.on('disconnect', () => {
                log.info('Socket.io client disconnected:', socket.id);
              });
            });
            tryPort(p + 1);
          } else {
            log.error('QR Server failed to start:', err.message);
            resolve({ success: false, error: err.message });
          }
        });
      };
      tryPort(port);
    });
  }

  /**
   * Stop the server
   */
  stop() {
    return new Promise((resolve) => {
      if (this.io) {
        this.io.close();
      }
      if (this.server) {
        this.server.close(() => {
          this.running = false;
          log.info('QR Server stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  /**
   * Get server status
   */
  getStatus() {
    return {
      running: this.running,
      port: this.port,
      ip: NetworkService.getLocalIP(),
    };
  }

  /**
   * Setup Express routes
   */
  _setupRoutes() {
    // Enable CORS for local network access
    this.app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type');
      if (req.method === 'OPTIONS') return res.sendStatus(200);
      next();
    });

    // Serve static mobile menu app
    const menuDir = path.join(__dirname, '..', 'qr-menu');

    // Redirect root to /menu automatically
    this.app.get('/', (req, res) => {
      res.redirect('/menu');
    });

    // Serve /menu — send index.html explicitly
    this.app.get('/menu', (req, res) => {
      res.sendFile(path.join(menuDir, 'index.html'));
    });

    // Serve static assets from qr-menu directory (CSS, JS, images, etc.)
    this.app.use('/menu', express.static(menuDir));

    // ---- API Routes ----

    // GET /api/settings — restaurant info
    this.app.get('/api/settings', (req, res) => {
      try {
        const settings = this.db.getSettings();
        const settingsObj = {};
        if (Array.isArray(settings)) {
          settings.forEach((s) => {
            settingsObj[s.key] = s.value;
          });
        }
        res.json({
          success: true,
          restaurant_name: settingsObj.restaurant_name || 'Restaurant',
          currency_symbol: settingsObj.currency_symbol || '₹',
        });
      } catch (error) {
        log.error('QR API /api/settings error:', error);
        res.status(500).json({ success: false, error: 'Server error' });
      }
    });

    // GET /api/menu — menu items grouped by category
    this.app.get('/api/menu', (req, res) => {
      try {
        const menuData = this.db.getMenuForQR();
        res.json({ success: true, ...menuData });
      } catch (error) {
        log.error('QR API /api/menu error:', error);
        res.status(500).json({ success: false, error: 'Server error' });
      }
    });

    // POST /api/orders/place — customer places order
    this.app.post('/api/orders/place', (req, res) => {
      try {
        const { table_number, customer_name, items, notes } = req.body;

        if (!items || !Array.isArray(items) || items.length === 0) {
          return res.status(400).json({ success: false, error: 'No items in order' });
        }

        const result = this.db.createQROrder(
          { table_number: table_number || '', customer_name: customer_name || '', notes: notes || '' },
          items
        );

        if (result && result.id) {
          // Fetch the full order for notifications
          const fullOrder = this.db.getQROrderById(result.id);

          // Emit to all connected Socket.io clients (cashier screens)
          if (this.io) {
            this.io.emit('qr:newOrder', fullOrder);
          }

          // Push to Electron renderer via IPC
          if (this.mainWindow && !this.mainWindow.isDestroyed()) {
            this.mainWindow.webContents.send('qr:newOrder', fullOrder);
          }

          res.json({
            success: true,
            order_number: result.orderNumber,
            order_id: result.id,
            total_amount: result.totalAmount,
          });
        } else {
          res.status(500).json({ success: false, error: 'Failed to create order' });
        }
      } catch (error) {
        log.error('QR API /api/orders/place error:', error);
        res.status(500).json({ success: false, error: 'Server error' });
      }
    });

    // GET /api/orders/pending — get pending QR orders
    this.app.get('/api/orders/pending', (req, res) => {
      try {
        const orders = this.db.getPendingQROrders();
        res.json({ success: true, orders });
      } catch (error) {
        log.error('QR API /api/orders/pending error:', error);
        res.status(500).json({ success: false, error: 'Server error' });
      }
    });

    // PUT /api/orders/confirm/:id — cashier confirms order
    this.app.put('/api/orders/confirm/:id', (req, res) => {
      try {
        const { userId } = req.body;
        const result = this.db.confirmQROrder(req.params.id, userId);
        if (result.success && this.io) {
          this.io.emit('qr:orderConfirmed', { id: req.params.id });
        }
        res.json(result);
      } catch (error) {
        log.error('QR API /api/orders/confirm error:', error);
        res.status(500).json({ success: false, error: 'Server error' });
      }
    });

    // PUT /api/orders/reject/:id — cashier rejects order
    this.app.put('/api/orders/reject/:id', (req, res) => {
      try {
        const result = this.db.rejectQROrder(req.params.id);
        if (result.success && this.io) {
          this.io.emit('qr:orderRejected', { id: req.params.id });
        }
        res.json(result);
      } catch (error) {
        log.error('QR API /api/orders/reject error:', error);
        res.status(500).json({ success: false, error: 'Server error' });
      }
    });

    // POST /api/admin/command — Admin Panel Bridge webhook
    this.app.post('/api/admin/command', (req, res) => {
      try {
        const { command, payload, source } = req.body;
        if (source !== 'admin_panel') {
          return res.status(403).json({ success: false, error: 'Unauthorized source' });
        }

        log.info(`Received admin command: ${command}`);

        // Verify hardware and license key to ensure command is for this machine
        if (this.licenseService) {
          const hardwareId = this.licenseService.getHardwareId();
          const license = this.licenseService.getLicense();
          const { license_key, hardware_id } = payload;
          
          // Verify identity matches
          if (license_key && license && license_key !== license.license_key) {
            return res.status(400).json({ success: false, error: 'License key mismatch' });
          }
          if (hardware_id && hardwareId !== hardware_id) {
            return res.status(400).json({ success: false, error: 'Hardware ID mismatch' });
          }
        }

        switch (command) {
          case 'force_logout':
          case 'suspend':
            if (this.licenseService && this.licenseService.licenseData) {
              this.licenseService.licenseData.amc_status = 'suspended';
              this.licenseService.saveLicense(this.licenseService.licenseData);
            }
            if (this.mainWindow && !this.mainWindow.isDestroyed()) {
              this.mainWindow.webContents.send('admin:forceLogout', { message: payload.message || 'Suspended by admin' });
            }
            break;

          case 'update_amc':
            if (this.licenseService && this.licenseService.licenseData) {
              this.licenseService.licenseData.amc_status = payload.amc_status;
              this.licenseService.licenseData.amc_end_date = payload.amc_end_date;
              this.licenseService.saveLicense(this.licenseService.licenseData);
              if (this.mainWindow && !this.mainWindow.isDestroyed()) {
                this.mainWindow.webContents.send('admin:amcUpdated');
              }
            }
            break;

          case 'activate':
            if (this.licenseService && this.licenseService.licenseData) {
              this.licenseService.licenseData.amc_status = 'active';
              this.licenseService.saveLicense(this.licenseService.licenseData);
              if (this.mainWindow && !this.mainWindow.isDestroyed()) {
                this.mainWindow.webContents.send('admin:activated', { message: payload.message });
              }
            }
            break;
            
          default:
            log.warn(`Unknown admin command: ${command}`);
            return res.status(400).json({ success: false, error: 'Unknown command' });
        }

        res.json({ success: true, message: `Command ${command} processed` });
      } catch (error) {
        log.error('QR API /api/admin/command error:', error);
        res.status(500).json({ success: false, error: 'Server error processing admin command' });
      }
    });

    // ─── DEVICE SYNC ROUTES ─────────────────────────
    const dataSyncService = require('./dataSyncService');

    // POST /api/sync/auth — authenticate with PIN
    this.app.post('/api/sync/auth', (req, res) => {
      try {
        const { pin } = req.body;
        if (!pin) return res.status(400).json({ success: false, error: 'PIN is required' });

        if (!dataSyncService.validatePin(pin)) {
          return res.status(401).json({ success: false, error: 'Invalid or expired PIN' });
        }

        // Generate a session token for this sync
        const token = require('crypto').randomBytes(32).toString('hex');
        dataSyncService._syncToken = token;
        dataSyncService._syncTokenExpiry = Date.now() + 30 * 60 * 1000; // 30 min

        res.json({
          success: true,
          token,
          deviceName: require('os').hostname(),
          tables: dataSyncService.getTableManifest()
        });
      } catch (error) {
        log.error('Sync auth error:', error);
        res.status(500).json({ success: false, error: 'Auth failed' });
      }
    });

    // Middleware: validate sync token for all /api/sync/* routes (except /auth)
    const validateSyncToken = (req, res, next) => {
      const token = req.headers['x-sync-token'];
      if (!token || token !== dataSyncService._syncToken) {
        return res.status(401).json({ success: false, error: 'Invalid sync token' });
      }
      if (Date.now() > (dataSyncService._syncTokenExpiry || 0)) {
        return res.status(401).json({ success: false, error: 'Sync session expired' });
      }
      next();
    };

    // GET /api/sync/manifest — get table list with row counts
    this.app.get('/api/sync/manifest', validateSyncToken, (req, res) => {
      try {
        res.json({ success: true, tables: dataSyncService.getTableManifest() });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // GET /api/sync/export/:tableName — export a single table
    this.app.get('/api/sync/export/:tableName', validateSyncToken, (req, res) => {
      try {
        const data = dataSyncService.exportTable(req.params.tableName);
        res.json({ success: true, data });
      } catch (error) {
        res.status(400).json({ success: false, error: error.message });
      }
    });

    // GET /api/sync/export-all — export everything in one shot
    this.app.get('/api/sync/export-all', validateSyncToken, (req, res) => {
      try {
        const data = dataSyncService.exportAll();
        // Mark PIN as consumed after full export
        dataSyncService.consumePin(Object.keys(dataSyncService.activePins || {})[0]);
        res.json({ success: true, data });
      } catch (error) {
        log.error('Full export error:', error);
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // GET /api/sync/info — public endpoint: shows this device is sync-capable
    this.app.get('/api/sync/info', (req, res) => {
      res.json({
        app: 'FlashBill POS',
        syncVersion: '1.0',
        deviceName: require('os').hostname(),
        ready: true
      });
    });
  }

  /**
   * Update the mainWindow reference (e.g., after window recreation)
   */
  setMainWindow(win) {
    this.mainWindow = win;
  }
}

module.exports = QRServerService;
