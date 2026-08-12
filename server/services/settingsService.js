/**
 * @file server/services/settingsService.js
 * @description System configuration settings service managing persistent key-value preferences in SQLite.
 * @module SettingsService
 * @dependencies dbQuery
 * @author Agent Architecture Directive
 */

const { dbQuery } = require('../db');

class SettingsService {
  constructor() {
    this.defaults = {
      hide_root_storage: 'false'
    };
    this.initDefaults();
  }

  /**
   * Seed default settings if missing
   */
  async initDefaults() {
    try {
      for (const [key, val] of Object.entries(this.defaults)) {
        const row = await dbQuery.get('SELECT key FROM settings WHERE key = ?', [key]);
        if (!row) {
          await dbQuery.run('INSERT INTO settings (key, value) VALUES (?, ?)', [key, val]);
        }
      }
    } catch (err) {
      console.error('[SettingsService] Error seeding default settings:', err.message);
    }
  }

  /**
   * Retrieve all settings as a key-value object
   */
  async getSettings() {
    try {
      const rows = await dbQuery.all('SELECT key, value FROM settings');
      const settings = { ...this.defaults };
      rows.forEach(r => {
        settings[r.key] = r.value === 'true' ? true : (r.value === 'false' ? false : r.value);
      });
      return settings;
    } catch (err) {
      return { hide_root_storage: false };
    }
  }

  /**
   * Get single setting by key
   */
  async getSetting(key) {
    try {
      const row = await dbQuery.get('SELECT value FROM settings WHERE key = ?', [key]);
      if (!row) return this.defaults[key] === 'true';
      return row.value === 'true' ? true : (row.value === 'false' ? false : row.value);
    } catch (err) {
      return false;
    }
  }

  /**
   * Update one or more settings
   */
  async updateSettings(settingsObj) {
    if (!settingsObj || typeof settingsObj !== 'object') {
      throw new Error('Invalid settings payload');
    }

    for (const [key, rawValue] of Object.entries(settingsObj)) {
      const value = String(rawValue);
      await dbQuery.run(
        'INSERT INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP',
        [key, value]
      );
    }

    return this.getSettings();
  }
}

module.exports = new SettingsService();
