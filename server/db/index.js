/**
 * @file server/db/index.js
 * @description SQLite database initialization, schema migration, and async query helper layer.
 * @module Database
 * @dependencies sqlite3, config
 * @author Agent Architecture Directive
 */

const sqlite3 = require('sqlite3').verbose();
const { DB_PATH } = require('../config');

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('[Database] Connection error:', err.message);
  } else {
    console.log('[Database] Connected to SQLite database at:', DB_PATH);
  }
});

// Enable WAL mode for high concurrency performance
db.run('PRAGMA journal_mode = WAL;');

// Initialize schema
db.serialize(() => {
  // Table for tracking active/resumable chunked upload sessions
  db.run(`
    CREATE TABLE IF NOT EXISTS upload_sessions (
      id TEXT PRIMARY KEY,
      filename TEXT NOT NULL,
      target_path TEXT NOT NULL,
      total_size INTEGER NOT NULL,
      total_chunks INTEGER NOT NULL,
      chunk_size INTEGER NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Table for tracking completed chunks per session
  db.run(`
    CREATE TABLE IF NOT EXISTS upload_chunks (
      session_id TEXT NOT NULL,
      chunk_index INTEGER NOT NULL,
      size INTEGER NOT NULL,
      PRIMARY KEY (session_id, chunk_index),
      FOREIGN KEY (session_id) REFERENCES upload_sessions(id) ON DELETE CASCADE
    );
  `);

  // Table for tracking public shared links
  db.run(`
    CREATE TABLE IF NOT EXISTS shared_links (
      token TEXT PRIMARY KEY,
      file_path TEXT NOT NULL,
      is_directory BOOLEAN DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      expires_at TIMESTAMP,
      access_count INTEGER DEFAULT 0
    );
  `);

  // Table for user authentication
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      role TEXT DEFAULT 'admin',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Table for active login sessions
  db.run(`
    CREATE TABLE IF NOT EXISTS user_sessions (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      expires_at TIMESTAMP NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // Table for system configuration settings
  db.run(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
});

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

module.exports = {
  db,
  dbQuery
};
