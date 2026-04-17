const fs = require('fs');
const path = require('path');
const os = require('os');
const net = require('net');
const { app } = require('electron');
const { exec } = require('child_process');

class NetworkService {
  constructor() {
    this.configPath = path.join(app.getPath('userData'), 'zapbill-network-config.json');
    this.config = this.loadConfig();
  }

  loadConfig() {
    try {
      if (fs.existsSync(this.configPath)) {
        return JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
      }
    } catch (e) {
      console.error('Error loading config:', e);
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
        port: 4500,
        websocket_port: 4501,
        kds_port: 4502,
        qr_port: 3000,
        bind_address: "0.0.0.0",
        auto_port_detection: true,
        port_range_start: 4500,
        port_range_end: 4550,
        avoid_ports: [3000, 3001, 8080, 5432, 9090]
      },
      access_control: {
        mode: "approved_only",
        require_pin: true,
        pin: "4589",
        approved_devices: []
      },
      cloud_sync: {
        server_url: "https://api.zapbill.com",
        heartbeat_interval_minutes: 30,
        order_check_interval_seconds: 15,
        menu_sync_mode: "on_change",
        coupon_sync_mode: "on_change",
        play_sound_on_order: true,
        offline_token_valid_days: 30,
        offline_warning_after_days: 7,
        low_bandwidth_mode: false,
        compress_data: true,
        wifi_only_sync: false,
        connection_timeout_seconds: 10,
        max_retries: 3
      },
      printers: {
        receipt_printer: {
          name: "Billing Printer",
          type: "usb",
          port: "USB001",
          model: "AutoDetect",
          paper_width: "80mm",
          sharing_mode: "shared"
        },
        kitchen_printer: {
          name: "Kitchen KOT Printer",
          type: "network",
          ip: "",
          port: 9100,
          model: "Generic",
          paper_width: "80mm",
          sharing_mode: "shared"
        }
      },
      cash_drawer: {
        connection: "through_printer",
        auto_open_on_payment: true
      },
      barcode_scanner: {
        mode: "auto_detect",
        prefix: "",
        suffix: ""
      },
      diagnostics: {
        log_retention_days: 7,
        auto_diagnose_on_startup: true
      }
    };
  }

  // Network Tools
  async checkPortAvailability(port) {
    return new Promise((resolve) => {
      const server = net.createServer();
      server.once('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          resolve({ available: false, port });
        } else {
          resolve({ available: false, port, error: err.message });
        }
      });
      server.once('listening', () => {
        server.close();
        resolve({ available: true, port });
      });
      server.listen(port);
    });
  }

  async checkMultiplePorts(ports) {
    const results = [];
    for (const port of ports) {
      results.push(await this.checkPortAvailability(port));
    }
    return results;
  }

  getNetworkInterfaces() {
    const interfaces = os.networkInterfaces();
    const result = [];
    for (const name of Object.keys(interfaces)) {
      for (const net of interfaces[name]) {
        // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
        if (net.family === 'IPv4' && !net.internal) {
          result.push({ name, address: net.address, mac: net.mac });
        }
      }
    }
    return result;
  }

  getLocalIP() {
    const ifaces = this.getNetworkInterfaces();
    return ifaces.length > 0 ? ifaces[0].address : '127.0.0.1';
  }

  async getWindowsDb() {
    return new Promise((resolve) => {
      exec('tasklist /FO CSV /NH', (err, stdout) => {
        if (err) return resolve({});
        const lines = stdout.split('\n');
        const map = {};
        for (const line of lines) {
          const parts = line.replace(/"/g, '').split(',');
          if (parts.length >= 2) {
             map[parts[1]] = parts[0];
          }
        }
        resolve(map);
      });
    });
  }

  async scanPortConflicts(portsToScan) {
    return new Promise(async (resolve) => {
      const isWindows = os.platform() === 'win32';
      const cmd = isWindows ? 'netstat -ano' : 'lsof -i -P -n | grep LISTEN';
      
      const processMap = isWindows ? await this.getWindowsDb() : {};

      exec(cmd, (error, stdout) => {
        const conflicts = [];
        if (error) {
          return resolve(conflicts); // Silently fail if netstat blocked
        }

        const lines = stdout.split('\n');
        for (const port of portsToScan) {
          if (isWindows) {
            const inUse = lines.find(l => l.includes(`:${port}`) && l.includes('LISTENING'));
            if (inUse) {
               const parts = inUse.trim().split(/\s+/);
               const pid = parts[parts.length - 1];
               const appName = processMap[pid] || `PID ${pid}`;
               conflicts.push({ port, status: 'In Use', usedBy: appName });
            } else {
               conflicts.push({ port, status: 'Free', usedBy: '-' });
            }
          } else {
            const inUse = lines.find(l => l.includes(`:${port}`));
            if (inUse) {
              const parts = inUse.trim().split(/\s+/);
              conflicts.push({ port, status: 'In Use', usedBy: parts[0] });
            } else {
              conflicts.push({ port, status: 'Free', usedBy: '-' });
            }
          }
        }
        resolve(conflicts);
      });
    });
  }
}

module.exports = new NetworkService();
