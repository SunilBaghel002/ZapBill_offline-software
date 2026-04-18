/**
 * Device Data Sync Service
 * Handles exporting and importing POS data between devices on the same LAN.
 * Uses a one-time PIN for security.
 */
const crypto = require('crypto');
const log = require('electron-log');

// Tables to sync, in dependency order (parents first)
const SYNC_TABLES = [
  // Core config
  { name: 'settings', key: 'key', mode: 'replace' },
  { name: 'sequences', key: 'sequence_name', mode: 'replace' },
  // Users & Auth
  { name: 'users', key: 'id', mode: 'upsert' },
  // Menu structure
  { name: 'menus', key: 'id', mode: 'upsert' },
  { name: 'categories', key: 'id', mode: 'upsert' },
  { name: 'menu_items', key: 'id', mode: 'upsert' },
  { name: 'addons', key: 'id', mode: 'upsert' },
  { name: 'master_addons', key: 'id', mode: 'upsert' },
  // Inventory
  { name: 'inventory', key: 'id', mode: 'upsert' },
  { name: 'menu_inventory', key: 'id', mode: 'upsert' },
  { name: 'inventory_transactions', key: 'id', mode: 'upsert' },
  // Orders
  { name: 'orders', key: 'id', mode: 'upsert' },
  { name: 'order_items', key: 'id', mode: 'upsert' },
  { name: 'order_payments', key: 'id', mode: 'upsert' },
  // Business
  { name: 'expenses', key: 'id', mode: 'upsert' },
  { name: 'item_discounts', key: 'id', mode: 'upsert' },
  { name: 'daily_sales', key: 'id', mode: 'upsert' },
  { name: 'shifts', key: 'id', mode: 'upsert' },
  { name: 'day_logs', key: 'id', mode: 'upsert' },
  // Printer config
  { name: 'printer_stations', key: 'id', mode: 'upsert' },
  { name: 'category_station_map', key: null, mode: 'replace_all' },
  { name: 'kot_excluded_items', key: 'item_id', mode: 'upsert' },
  // Email config
  { name: 'email_config', key: 'id', mode: 'replace' },
];

// Tables to skip (device-specific, transient)
const SKIP_TABLES = ['sync_queue', 'sessions', 'email_queue', 'website_orders', 'kot_logs'];

class DataSyncService {
  constructor() {
    this.db = null;
    this.activePins = new Map(); // pin -> { createdAt, used }
  }

  setDb(db) {
    this.db = db;
  }

  // ─── EXPORT (Source Device) ───────────────────────

  /**
   * Generate a 6-digit sync PIN valid for 10 minutes
   */
  generateSyncPin() {
    // Invalidate any existing pins
    this.activePins.clear();

    const pin = String(crypto.randomInt(100000, 999999));
    this.activePins.set(pin, {
      createdAt: Date.now(),
      used: false
    });

    log.info('Sync PIN generated (valid for 10 minutes)');
    return pin;
  }

  /**
   * Validate a sync PIN
   */
  validatePin(pin) {
    const entry = this.activePins.get(pin);
    if (!entry) return false;

    // Check expiry (10 minutes)
    const elapsed = Date.now() - entry.createdAt;
    if (elapsed > 10 * 60 * 1000) {
      this.activePins.delete(pin);
      return false;
    }

    if (entry.used) return false;
    return true;
  }

  /**
   * Mark a PIN as used (single-use)
   */
  consumePin(pin) {
    const entry = this.activePins.get(pin);
    if (entry) {
      entry.used = true;
    }
  }

  /**
   * Get table list with row counts for the sync UI
   */
  getTableManifest() {
    if (!this.db) return [];

    return SYNC_TABLES.map(table => {
      try {
        const rows = this.db.execute(`SELECT COUNT(*) as count FROM ${table.name}`);
        return {
          name: table.name,
          rows: rows[0]?.count || 0,
          mode: table.mode
        };
      } catch (e) {
        return { name: table.name, rows: 0, mode: table.mode, error: e.message };
      }
    }).filter(t => t.rows > 0 || t.error);
  }

  /**
   * Export a single table's data as JSON array
   */
  exportTable(tableName) {
    if (!this.db) throw new Error('Database not initialized');

    // Validate table name is in our allowed list
    const tableConfig = SYNC_TABLES.find(t => t.name === tableName);
    if (!tableConfig) throw new Error(`Table "${tableName}" is not syncable`);

    try {
      const rows = this.db.execute(`SELECT * FROM ${tableName}`);
      return {
        table: tableName,
        key: tableConfig.key,
        mode: tableConfig.mode,
        rows: rows,
        count: rows.length,
        exportedAt: new Date().toISOString()
      };
    } catch (e) {
      log.error(`Failed to export table ${tableName}:`, e.message);
      throw e;
    }
  }

  /**
   * Export ALL tables in one payload
   */
  exportAll() {
    if (!this.db) throw new Error('Database not initialized');

    const result = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      tables: {}
    };

    for (const table of SYNC_TABLES) {
      try {
        const rows = this.db.execute(`SELECT * FROM ${table.name}`);
        if (rows.length > 0) {
          result.tables[table.name] = {
            key: table.key,
            mode: table.mode,
            rows: rows,
            count: rows.length
          };
        }
      } catch (e) {
        log.warn(`Skipping table ${table.name}: ${e.message}`);
      }
    }

    return result;
  }

  // ─── IMPORT (Target Device) ───────────────────────

  /**
   * Import a full data payload from another device
   */
  importAll(payload) {
    if (!this.db) throw new Error('Database not initialized');

    const results = {
      success: true,
      tables: {},
      errors: [],
      totalImported: 0
    };

    // Process tables in order
    for (const table of SYNC_TABLES) {
      const tableData = payload.tables?.[table.name];
      if (!tableData || !tableData.rows || tableData.rows.length === 0) {
        continue;
      }

      try {
        const imported = this._importTable(table, tableData.rows);
        results.tables[table.name] = { imported, total: tableData.rows.length };
        results.totalImported += imported;
      } catch (e) {
        log.error(`Failed to import table ${table.name}:`, e.message);
        results.errors.push({ table: table.name, error: e.message });
      }
    }

    // Save database to disk
    try {
      this.db.save();
    } catch (e) {
      log.error('Failed to save database after import:', e.message);
      results.errors.push({ table: '_save', error: e.message });
    }

    results.success = results.errors.length === 0;
    log.info(`Data import complete: ${results.totalImported} rows across ${Object.keys(results.tables).length} tables`);
    return results;
  }

  /**
   * Import a single table's data
   */
  importTable(tableName, rows) {
    if (!this.db) throw new Error('Database not initialized');

    const tableConfig = SYNC_TABLES.find(t => t.name === tableName);
    if (!tableConfig) throw new Error(`Table "${tableName}" is not syncable`);

    const imported = this._importTable(tableConfig, rows);
    this.db.save();
    return { imported, total: rows.length };
  }

  /**
   * Internal: import rows into a table using the configured strategy
   */
  _importTable(tableConfig, rows) {
    if (!rows || rows.length === 0) return 0;

    const { name, mode } = tableConfig;
    let imported = 0;

    if (mode === 'replace_all') {
      // Delete all existing rows and insert new ones
      try {
        this.db.run(`DELETE FROM ${name}`);
      } catch (e) {
        log.warn(`Could not clear table ${name}:`, e.message);
      }
    }

    for (const row of rows) {
      try {
        const columns = Object.keys(row);
        const placeholders = columns.map(() => '?').join(', ');
        const values = columns.map(col => row[col]);

        // Use INSERT OR REPLACE for upsert behavior
        const sql = `INSERT OR REPLACE INTO ${name} (${columns.join(', ')}) VALUES (${placeholders})`;
        this.db.run(sql, values);
        imported++;
      } catch (e) {
        log.warn(`Row import failed for ${name}:`, e.message);
      }
    }

    log.info(`Imported ${imported}/${rows.length} rows into ${name}`);
    return imported;
  }
}

module.exports = new DataSyncService();
