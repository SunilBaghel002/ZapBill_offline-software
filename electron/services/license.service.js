const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { app } = require('electron');
const { machineIdSync } = require('node-machine-id');
const log = require('electron-log');
const httpClient = require('./httpClient');

const ALGORITHM = 'aes-256-gcm';

class LicenseService {
  constructor() {
    this.licenseData = null;
    this.hardwareId = this.generateHardwareFingerprint();
    this.encryptionKey = this.deriveKey(this.hardwareId);
    this.licensePath = path.join(app.getPath('userData'), 'license.dat');
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
    return crypto.scryptSync(hardwareId, 'flashbill-salt', 32);
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
  }

  getHardwareId() {
    return this.hardwareId;
  }

  getLicense() {
    return this.licenseData;
  }

  getAuthHeaders() {
    if (!this.licenseData?.license_key) {
      return { 'X-Hardware-ID': this.hardwareId };
    }
    return {
      'X-License-Key': this.licenseData.license_key,
      'X-License-Secret': this.licenseData.license_secret || '',
      'X-Hardware-ID': this.hardwareId
    };
  }

  getLicenseStatus() {
    const isActivated = !!this.licenseData?.license_key;
    return {
      is_activated: isActivated,
      license_key: isActivated ? `ZB-XXXX-****-****-${this.licenseData.license_key.substr(-4)}` : null,
      features: this.licenseData?.features || [],
      amc_status: this.licenseData?.amc_status || 'inactive',
      amc_end_date: this.licenseData?.amc_end_date || null,
      last_sync: this.licenseData?.last_sync || null
    };
  }

  async activate(licenseKey, licenseSecret) {
    try {
      log.info('Activating license for key:', licenseKey);
      
      const payload = {
        license_key: licenseKey,
        license_secret: licenseSecret,
        hardware_id: this.hardwareId,
        device_name: require('os').hostname() || 'Main Register'
      };

      const data = await httpClient.post('/sync/activate', payload);

      this.saveLicense({
        license_key: licenseKey,
        license_secret: licenseSecret,
        hardware_id: this.hardwareId,
        features: data.features || [],
        amc_status: data.license?.amc_status || 'active',
        amc_end_date: data.license?.amc_end_date || null,
        plan_type: data.license?.plan_type || 'standard',
        last_sync: new Date().toISOString(),
        activated_at: new Date().toISOString()
      });

      return { success: true, features: data.features, amc_status: data.license?.amc_status, messages: data.messages };
    } catch (error) {
      log.error('Activation error:', error);
      return { success: false, error: error.message };
    }
  }

  async heartbeat() {
    if (!this.licenseData || !this.licenseData.license_key) {
      throw new Error('Not activated');
    }

    log.info('Performing license sync heartbeat...');
    try {
      const payload = {
        device_name: require('os').hostname() || 'Main Register',
        app_version: require('../../package.json').version,
        license_key: this.licenseData.license_key,
        hardware_id: this.hardwareId
      };

      const data = await httpClient.post('/sync/heartbeat', payload, this.getAuthHeaders());

      if (data.license && data.license.valid === false) {
        this.revokeLicense();
        return { status: 'revoked', features: [], amc_status: 'revoked', messages: [] };
      }

      this.licenseData.features = data.features || [];
      this.licenseData.amc_status = data.license?.amc_status || this.licenseData.amc_status;
      this.licenseData.amc_end_date = data.license?.amc_end_date || this.licenseData.amc_end_date;
      this.licenseData.plan_type = data.license?.plan_type || this.licenseData.plan_type;
      this.licenseData.last_sync = new Date().toISOString();
      this.licenseData.messages = data.messages || [];
      
      this.saveLicense(this.licenseData);
      return { status: 'success', features: this.licenseData.features, amc_status: this.licenseData.amc_status, messages: data.messages };
    } catch (error) {
      if (error.message === 'INVALID_LICENSE' || error.message.includes('revoked')) {
        this.revokeLicense();
        return { status: 'revoked', features: [], amc_status: 'revoked', messages: [] };
      }
      log.warn('Heartbeat failed:', error.message);
      throw error;
    }
  }

  async testConnection() {
    const start = Date.now();
    try {
      await httpClient.get('/ping');
      return { connected: true, latency_ms: Date.now() - start };
    } catch (e) {
      return { connected: false, latency_ms: Date.now() - start, error: e.message };
    }
  }
}

module.exports = new LicenseService();
