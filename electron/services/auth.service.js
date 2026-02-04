const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const log = require('electron-log');

class AuthService {
  constructor(db) {
    this.db = db;
    this.currentUser = null;
    this.currentSession = null;
  }

  async login(username, password) {
    try {
      log.info(`Login attempt for user: ${username}`);
      const user = this.db.getUserByUsername(username);
      
      if (!user) {
        log.warn(`User ${username} not found`);
        return { success: false, error: 'Invalid username or password' };
      }
      
      log.info(`User found: ${user.username}, role: ${user.role}, active: ${user.is_active}`);
      
      if (!user.is_active) {
        return { success: false, error: 'Account is deactivated' };
      }
      
      log.info(`Comparing password with hash: ${user.password_hash?.substring(0, 20)}...`);
      const isValid = await bcrypt.compare(password, user.password_hash);
      log.info(`Password valid: ${isValid}`);
      
      if (!isValid) {
        return { success: false, error: 'Invalid username or password' };
      }
      
      // Create session
      this.db.logSession(user.id, 'login');
      
      this.currentUser = {
        id: user.id,
        username: user.username,
        role: user.role,
        fullName: user.full_name,
      };
      
      log.info(`User ${username} logged in successfully`);
      
      return {
        success: true,
        user: this.currentUser,
      };
    } catch (error) {
      log.error('Login error:', error);
      return { success: false, error: 'Login failed. Please try again.' };
    }
  }

  async loginWithPin(pin) {
    try {
      const user = this.db.getUserByPin(pin);
      
      if (!user) {
        return { success: false, error: 'Invalid PIN' };
      }
      
      // Create session
      this.db.logSession(user.id, 'login');
      
      this.currentUser = {
        id: user.id,
        username: user.username,
        role: user.role,
        fullName: user.full_name,
      };
      
      log.info(`User ${user.username} logged in with PIN`);
      
      return {
        success: true,
        user: this.currentUser,
      };
    } catch (error) {
      log.error('PIN login error:', error);
      return { success: false, error: 'Login failed. Please try again.' };
    }
  }

  async logout(userId) {
    try {
      if (this.currentUser) {
        this.db.logSession(this.currentUser.id, 'logout');
      }
      
      log.info(`User ${this.currentUser?.username} logged out`);
      
      this.currentUser = null;
      
      return { success: true };
    } catch (error) {
      log.error('Logout error:', error);
      return { success: false, error: error.message };
    }
  }

  getCurrentUser() {
    return this.currentUser;
  }

  async createOrUpdateUser(userData) {
    try {
      // Hash password if provided
      let passwordHash = null;
      if (userData.password) {
        passwordHash = await bcrypt.hash(userData.password, 10);
      }
      
      if (userData.id) {
        // Update existing user
        const updates = {
          username: userData.username,
          full_name: userData.fullName,
          role: userData.role,
          is_active: userData.isActive ? 1 : 0,
          pin_code: userData.pinCode || null,
        };
        
        if (passwordHash) {
          updates.password_hash = passwordHash;
        }
        
        return this.db.updateUser(userData.id, updates);
      } else {
        // Create new user
        if (!passwordHash) {
          return { success: false, error: 'Password is required for new users' };
        }
        
        const newUser = {
          id: uuidv4(),
          username: userData.username,
          password_hash: passwordHash,
          full_name: userData.fullName,
          role: userData.role,
          is_active: 1,
          pin_code: userData.pinCode || null,
        };
        
        return this.db.createUser(newUser);
      }
    } catch (error) {
      log.error('Create/update user error:', error);
      
      if (error.message.includes('UNIQUE constraint failed')) {
        return { success: false, error: 'Username already exists' };
      }
      
      return { success: false, error: error.message };
    }
  }

  getDeviceInfo() {
    return JSON.stringify({
      platform: process.platform,
      arch: process.arch,
      hostname: require('os').hostname(),
    });
  }
}

module.exports = AuthService;
