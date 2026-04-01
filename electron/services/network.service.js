/**
 * Network Utility Service
 * Detects local IP address and network interfaces for QR server
 */
const os = require('os');

class NetworkService {
  /**
   * Get the preferred local IP address (prefers 192.168.x.x range)
   * @returns {string} Local IP address or '127.0.0.1' as fallback
   */
  static getLocalIP() {
    try {
      const interfaces = os.networkInterfaces();
      let fallbackIP = '127.0.0.1';

      for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
          // Skip internal/loopback and non-IPv4
          if (iface.internal || iface.family !== 'IPv4') continue;

          // Prefer 192.168.x.x range (typical home/restaurant WiFi)
          if (iface.address.startsWith('192.168.')) {
            return iface.address;
          }

          // Keep any non-loopback as fallback
          if (fallbackIP === '127.0.0.1') {
            fallbackIP = iface.address;
          }
        }
      }

      return fallbackIP;
    } catch (error) {
      console.error('Error getting local IP:', error);
      return '127.0.0.1';
    }
  }

  /**
   * Get all available network interfaces with details
   * @returns {Array} List of network interfaces
   */
  static getAllInterfaces() {
    try {
      const interfaces = os.networkInterfaces();
      const result = [];

      for (const [name, addrs] of Object.entries(interfaces)) {
        for (const iface of addrs) {
          if (iface.family === 'IPv4' && !iface.internal) {
            result.push({
              name,
              address: iface.address,
              netmask: iface.netmask,
              mac: iface.mac,
            });
          }
        }
      }

      return result;
    } catch (error) {
      console.error('Error getting network interfaces:', error);
      return [];
    }
  }
}

module.exports = NetworkService;
