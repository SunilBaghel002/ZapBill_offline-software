const { app } = require('electron');

module.exports = {
  API_BASE_URL: process.env.VITE_API_BASE_URL || 'https://zapbill-admin.vercel.app/api',
  HEARTBEAT_INTERVAL_MINUTES: 30,
  ORDER_POLLING_INTERVAL_SECONDS: 10,
  OFFLINE_TOKEN_VALID_DAYS: 30,
  OFFLINE_WARNING_DAYS: 7,
  CONNECTION_TIMEOUT_MS: 10000,
  MAX_RETRY_ATTEMPTS: 3,
  RETRY_DELAY_MS: 2000,
};
