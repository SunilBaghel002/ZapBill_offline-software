const axios = require('axios');
const path = require('path');
const fs = require('fs');
const { app } = require('electron');
const config = require('../config');

// Read app version from package.json
let appVersion = 'unknown';
try {
  const packageJsonPath = path.join(__dirname, '../../package.json');
  if (fs.existsSync(packageJsonPath)) {
    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    appVersion = pkg.version;
  }
} catch (e) {
  console.error('Failed to read app version:', e);
}

const apiClient = axios.create({
  baseURL: config.API_BASE_URL,
  timeout: config.CONNECTION_TIMEOUT_MS,
  headers: {
    'Content-Type': 'application/json',
    'X-App-Version': appVersion,
    'X-Platform': process.platform
  }
});

// Since we are in Node.js, origin is not automatically sent, and we don't need to specify it.

const handleError = (error) => {
  if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
    throw new Error('NO_INTERNET');
  }
  if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
    throw new Error('TIMEOUT');
  }
  if (error.response) {
    const status = error.response.status;
    let msg = error.response.data?.error || error.response.data?.message || `HTTP_${status}`;
    if (typeof msg === 'object') {
      try { msg = JSON.stringify(msg); } catch(e) {}
    }
    if (status === 401) throw new Error('INVALID_LICENSE');
    if (status === 403) throw new Error(msg);
    if (status === 429) throw new Error('RATE_LIMITED');
    if (status === 500) throw new Error(`SERVER_ERROR: ${msg}`);
    throw new Error(String(msg));
  }
  throw new Error('UNKNOWN_ERROR');
};

class HttpClient {
  async get(endpoint, headers = {}) {
    try {
      const response = await apiClient.get(endpoint, { headers });
      return response.data;
    } catch (error) {
      handleError(error);
    }
  }

  async post(endpoint, body = {}, headers = {}) {
    try {
      const response = await apiClient.post(endpoint, body, { headers });
      return response.data;
    } catch (error) {
      handleError(error);
    }
  }
}

module.exports = new HttpClient();
