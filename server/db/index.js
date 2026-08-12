/**
 * @file server/db/index.js
 * @description SQLite database initialization, schema migration, and async query helper layer.
 * @module Database
 * @dependencies sqlite3, config, migrator
 * @author Agent Architecture Directive
 */

const sqlite3 = require('sqlite3').verbose();
const { DB_PATH } = require('../config');
const migrator = require('./migrator');

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('[Database] Connection error:', err.message);
  } else {
    console.log('[Database] Connected to SQLite database at:', DB_PATH);
  }
});

// Enable WAL mode for high concurrency performance
db.run('PRAGMA journal_mode = WAL;');

// Promisified database utilities
const dbQuery = {
  run(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.run(sql, params, function (err) {
        if (err) return reject(err);
        resolve({ lastID: this.lastID, changes: this.changes });
      });
    });
  },
  get(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => {
        if (err) return reject(err);
        resolve(row);
      });
    });
  },
  all(sql, params = []) {
    return new Promise((resolve, reject) => {
      db.all(sql, params, (err, rows) => {
        if (err) return reject(err);
        resolve(rows);
      });
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
