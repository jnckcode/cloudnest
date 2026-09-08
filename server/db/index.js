/**
 * @file server/db/index.js
 * @description SQLite database initialization, schema migration, and query helper layer powered by better-sqlite3.
 * @module Database
 * @dependencies better-sqlite3, config, migrator
 * @author Agent Architecture Directive
 */

const Database = require('better-sqlite3');
const { DB_PATH } = require('../config');
const migrator = require('./migrator');

let db;
try {
  db = new Database(DB_PATH);
  console.log('[Database] Connected to SQLite database at:', DB_PATH);
  // Enable WAL mode & foreign keys for high concurrency performance and integrity
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
} catch (err) {
  console.error('[Database] Connection error:', err.message);
  throw err;
}

// Promisified database utilities for seamless backward-compatibility
const dbQuery = {
  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      try {
        const stmt = db.prepare(sql);
        const args = Array.isArray(params) ? params : [params];
        const info = stmt.run(...args);
        resolve({ lastID: info.lastInsertRowid, changes: info.changes });
      } catch (err) {
        reject(err);
      }
    });
  },
  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      try {
        const stmt = db.prepare(sql);
        const args = Array.isArray(params) ? params : [params];
        const row = stmt.get(...args);
        resolve(row);
      } catch (err) {
        reject(err);
      }
    });
  },
  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      try {
        const stmt = db.prepare(sql);
        const args = Array.isArray(params) ? params : [params];
        const rows = stmt.all(...args);
        resolve(rows);
      } catch (err) {
        reject(err);
      }
    });
  },
  exec(sql) {
    return new Promise((resolve, reject) => {
      try {
        db.exec(sql);
        resolve();
      } catch (err) {
        reject(err);
      }
    });
  }
};

/**
 * Execute automated schema migrations
 */
async function runMigrations() {
  await migrator.run(dbQuery);
}

module.exports = {
  db,
  dbQuery,
  runMigrations
};

