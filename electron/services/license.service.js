const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { app } = require('electron');
const { machineIdSync } = require('node-machine-id');
const log = require('electron-log');

const ALGORITHM = 'aes-256-gcm';

class LicenseService {
  constructor(db) {
    this.db = db;
    this.licenseData = null;
    this.hardwareId = this.generateHardwareFingerprint();
    this.encryptionKey = this.deriveKey(this.hardwareId);
    this.licensePath = path.join(app.getPath('userData'), 'license.dat');
    this.apiUrl = process.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
    this.heartbeatInterval = null;
    
    this.loadLicense();
  }

  generateHardwareFingerprint() {
    try {
      const id = machineIdSync(true);
      return crypto.createHash('sha256').update(id).digest('hex');
    } catch (error) {
      log.error('Failed to generate hardware ID:', error);
      return crypto.createHash('sha256').update('fallback-id').digest('hex');
    }
  }

  deriveKey(hardwareId) {
    return crypto.scryptSync(hardwareId, 'zapbill-salt', 32);
  }

  encrypt(jsonData) {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(ALGORITHM, this.encryptionKey, iv);
    
    let encrypted = cipher.update(JSON.stringify(jsonData), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();

    return {
      iv: iv.toString('hex'),
      data: encrypted,
      tag: authTag.toString('hex')
    };
  }

  decrypt(encryptedData) {
    try {
      const decipher = crypto.createDecipheriv(
        ALGORITHM,
        this.encryptionKey,
        Buffer.from(encryptedData.iv, 'hex')
      );
      decipher.setAuthTag(Buffer.from(encryptedData.tag, 'hex'));

      let decrypted = decipher.update(encryptedData.data, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return JSON.parse(decrypted);
    } catch (e) {
      log.error('License decryption failed:', e.message);
      return null;
    }
  }

  loadLicense() {
    if (fs.existsSync(this.licensePath)) {
      try {
        const raw = fs.readFileSync(this.licensePath, 'utf8');
        const encryptedData = JSON.parse(raw);
        this.licenseData = this.decrypt(encryptedData);
        if (!this.licenseData) {
          log.warn('License file found but could not be decrypted.');
        } else {
          log.info('License loaded successfully');
          // Auto-start heartbeat on load if license exists
          this.startHeartbeat();
        }
      } catch (e) {
        log.error('Failed to load license file:', e);
      }
    }
  }

  saveLicense(data) {
    try {
      this.licenseData = data;
      const encryptedData = this.encrypt(data);
      fs.writeFileSync(this.licensePath, JSON.stringify(encryptedData), 'utf8');
      return true;
    } catch (e) {
      log.error('Failed to save license:', e);
      return false;
    }
  }

  revokeLicense() {
    log.warn('License revoked remotely. Wiping local license.');
    this.licenseData = null;
    if (fs.existsSync(this.licensePath)) {
      fs.unlinkSync(this.licensePath);
    }
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    const { BrowserWindow } = require('electron');
    BrowserWindow.getAllWindows().forEach(w => w.webContents.send('license:revoked'));
  }

  getHardwareId() {
    return this.hardwareId;
  }

  getLicense() {
    return this.licenseData;
  }

  async activate({ licenseKey, licenseSecret, deviceName }) {
    try {
      if (!licenseKey || !licenseSecret) {
        throw new Error('Invalid credentials');
      }

      log.info('Activating license for key:', licenseKey);
      
      const response = await fetch(`${this.apiUrl}/sync/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          license_key: licenseKey,
          license_secret: licenseSecret,
          hardware_id: this.hardwareId,
          device_name: deviceName || 'Main Register'
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Activation failed');

      this.saveLicense({
        license_key: licenseKey,
        hardware_id: this.hardwareId,
        features: data.features || [],
        amc_status: data.license?.amc_status || 'active',
        amc_end_date: data.license?.amc_end_date || null,
        plan_type: data.license?.plan_type || 'standard',
        last_sync: new Date().toISOString(),
        activated_at: new Date().toISOString()
      });

      this.startHeartbeat();
      return { success: true, license: this.licenseData, messages: data.messages };
    } catch (error) {
      log.error('Activation error:', error);
      return { success: false, error: error.message };
    }
  }

  async performHeartbeat() {
    if (!this.licenseData || !this.licenseData.license_key) return;

    try {
      log.info('Performing license sync...');
      
      const response = await fetch(`${this.apiUrl}/sync/heartbeat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          license_key: this.licenseData.license_key,
          hardware_id: this.hardwareId
        })
      });

      const data = await response.json();

      // Handle revoked/deleted/deactivated license
      if (!response.ok) {
        if (response.status === 401 || response.status === 403 || response.status === 404) {
          this.revokeLicense();
          return;
        }
        throw new Error(data.error || 'Heartbeat failed');
      }

      // Check if license was marked invalid in the response body
      if (data.license && data.license.valid === false) {
        this.revokeLicense();
        return;
      }

      // ── Update ALL fields from server response ──
      // This is the KEY part: features array from server overwrites local copy
      this.licenseData.features = data.features || [];
      this.licenseData.amc_status = data.license?.amc_status || this.licenseData.amc_status;
      this.licenseData.amc_end_date = data.license?.amc_end_date || this.licenseData.amc_end_date;
      this.licenseData.plan_type = data.license?.plan_type || this.licenseData.plan_type;
      this.licenseData.last_sync = new Date().toISOString();
      this.licenseData.messages = data.messages || [];
      
      this.saveLicense(this.licenseData);
      log.info('License synced. Active features:', this.licenseData.features.join(', '));

      // Notify renderer to refresh its state
      const { BrowserWindow } = require('electron');
      BrowserWindow.getAllWindows().forEach(w => w.webContents.send('license:updated'));
      
    } catch (error) {
      log.warn('Heartbeat failed (Offline?):', error.message);
    }
  }

  startHeartbeat() {
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    const intervalMinutes = process.env.VITE_HEARTBEAT_INTERVAL_MINUTES || 30;
    this.heartbeatInterval = setInterval(() => {
      this.performHeartbeat();
    }, intervalMinutes * 60 * 1000);
    this.performHeartbeat();
  }
}

module.exports = LicenseService;
