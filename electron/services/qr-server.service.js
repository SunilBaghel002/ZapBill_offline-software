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

    // Try to start on port 3000, fallback to 3001, 3002, etc.
    return this._tryListen(3000);
  }

  /**
   * Try to listen on a port, fallback to next if busy
   */
  _tryListen(port, maxAttempts = 10) {
    return new Promise((resolve) => {
      let attempts = 0;
      const tryPort = (p) => {
        this.server.listen(p, '0.0.0.0', () => {
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
    // Serve static mobile menu app
    const menuDir = path.join(__dirname, '..', 'qr-menu');
    this.app.use('/menu', express.static(menuDir));

    // Redirect /menu to /menu/index.html
    this.app.get('/menu', (req, res) => {
      res.sendFile(path.join(menuDir, 'index.html'));
    });

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

        if (!table_number) {
          return res.status(400).json({ success: false, error: 'Table number is required' });
        }

        const result = this.db.createQROrder(
          { table_number, customer_name: customer_name || '', notes: notes || '' },
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
  }

  /**
   * Update the mainWindow reference (e.g., after window recreation)
   */
  setMainWindow(win) {
    this.mainWindow = win;
  }
}

module.exports = QRServerService;
