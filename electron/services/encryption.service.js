const crypto = require('crypto');
const { machineIdSync } = require('node-machine-id');
const log = require('electron-log');

/**
 * Encryption Service using AES-256-GCM
 * Used for encrypting sensitive data stored locally
 */
class EncryptionService {
  constructor() {
    this.algorithm = 'aes-256-gcm';
    this.keyLength = 32; // 256 bits
    this.ivLength = 16;  // 128 bits
    this.authTagLength = 16; // 128 bits
    this.key = null;
    
    this.initialize();
  }

  /**
   * Initialize encryption key
   */
  initialize() {
    try {
      // Derive key from machine-specific data
      const machineId = machineIdSync();
      const salt = 'restaurant-pos-encryption-salt-v1';
      
      // Use PBKDF2 to derive a secure key
      this.key = crypto.pbkdf2Sync(
        machineId,
        salt,
        100000, // iterations
        this.keyLength,
        'sha512'
      );
      
      log.info('Encryption service initialized');
    } catch (error) {
      log.error('Encryption initialization error:', error);
      // Fallback to a less secure but functional key
      this.key = crypto.scryptSync('fallback-key', 'fallback-salt', this.keyLength);
    }
  }

  /**
   * Encrypt plaintext data
   * @param {string} plaintext - Data to encrypt
   * @returns {string} - Base64 encoded encrypted data (iv + authTag + ciphertext)
   */
  encrypt(plaintext) {
    try {
      if (!plaintext) return null;
      
      // Generate random IV
      const iv = crypto.randomBytes(this.ivLength);
      
      // Create cipher
      const cipher = crypto.createCipheriv(this.algorithm, this.key, iv, {
        authTagLength: this.authTagLength
      });
      
      // Encrypt data
      let encrypted = cipher.update(plaintext, 'utf8');
      encrypted = Buffer.concat([encrypted, cipher.final()]);
      
      // Get authentication tag
      const authTag = cipher.getAuthTag();
      
      // Combine iv + authTag + encrypted data
      const combined = Buffer.concat([iv, authTag, encrypted]);
      
      return combined.toString('base64');
    } catch (error) {
      log.error('Encryption error:', error);
      throw new Error('Encryption failed');
    }
  }

  /**
   * Decrypt encrypted data
   * @param {string} encryptedData - Base64 encoded encrypted data
   * @returns {string} - Decrypted plaintext
   */
  decrypt(encryptedData) {
    try {
      if (!encryptedData) return null;
      
      // Decode from base64
      const buffer = Buffer.from(encryptedData, 'base64');
      
      // Extract iv, authTag, and ciphertext
      const iv = buffer.subarray(0, this.ivLength);
      const authTag = buffer.subarray(this.ivLength, this.ivLength + this.authTagLength);
      const encrypted = buffer.subarray(this.ivLength + this.authTagLength);
      
      // Create decipher
      const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv, {
        authTagLength: this.authTagLength
      });
      decipher.setAuthTag(authTag);
      
      // Decrypt data
      let decrypted = decipher.update(encrypted);
      decrypted = Buffer.concat([decrypted, decipher.final()]);
      
      return decrypted.toString('utf8');
    } catch (error) {
      log.error('Decryption error:', error);
      throw new Error('Decryption failed - data may be corrupted or tampered');
    }
  }

  /**
   * Hash a password using bcrypt-compatible method
   * @param {string} password - Password to hash
   * @returns {string} - Hashed password
   */
  hashPassword(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
    return `${salt}:${hash}`;
  }

  /**
   * Verify a password against a hash
   * @param {string} password - Password to verify
   * @param {string} storedHash - Stored hash (salt:hash format)
   * @returns {boolean} - True if password matches
   */
  verifyPassword(password, storedHash) {
    const [salt, hash] = storedHash.split(':');
    const verifyHash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
    return hash === verifyHash;
  }

  /**
   * Generate a random token
   * @param {number} length - Token length in bytes
   * @returns {string} - Hex encoded random token
   */
  generateToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Create a hash of data (for checksums, etc.)
   * @param {string} data - Data to hash
   * @returns {string} - SHA-256 hash
   */
  hash(data) {
    return crypto.createHash('sha256').update(data).digest('hex');
  }
}

module.exports = EncryptionService;
