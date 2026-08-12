/**
 * @file server/db/migrator.js
 * @description Automated database schema migration runner ensuring backward compatibility and automatic schema upgrades on server start.
 * @module DatabaseMigrator
 * @dependencies crypto
 * @author Agent Architecture Directive
 */

const crypto = require('crypto');

/**
 * Sequential migration registry
 * Each migration includes version integer, descriptive name, and up() migration function.
 */
const MIGRATIONS = [
  {
    version: 1,
    name: 'v1_initial_core_schema',
    up: async (dbQuery) => {
      // Chunked upload sessions table
      await dbQuery.run(`
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

      // Upload chunks tracking
      await dbQuery.run(`
        CREATE TABLE IF NOT EXISTS upload_chunks (
          session_id TEXT NOT NULL,
          chunk_index INTEGER NOT NULL,
          size INTEGER NOT NULL,
          PRIMARY KEY (session_id, chunk_index),
          FOREIGN KEY (session_id) REFERENCES upload_sessions(id) ON DELETE CASCADE
        );
      `);

      // Public shared links
      await dbQuery.run(`
        CREATE TABLE IF NOT EXISTS shared_links (
          token TEXT PRIMARY KEY,
          file_path TEXT NOT NULL,
          is_directory BOOLEAN DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          expires_at TIMESTAMP,
          access_count INTEGER DEFAULT 0
        );
      `);
    }
  },
  {
    version: 2,
    name: 'v2_user_auth_and_sessions',
    up: async (dbQuery) => {
      // Users table
      await dbQuery.run(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          username TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          salt TEXT NOT NULL,
          role TEXT DEFAULT 'admin',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);

      // User sessions table
      await dbQuery.run(`
        CREATE TABLE IF NOT EXISTS user_sessions (
          token TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          expires_at TIMESTAMP NOT NULL,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
      `);
    }
  },
  {
    version: 3,
    name: 'v3_system_settings',
    up: async (dbQuery) => {
      // System settings table
      await dbQuery.run(`
        CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
    }
  },
  {
    version: 4,
    name: 'v4_seed_default_data',
    up: async (dbQuery) => {
      // Seed default admin user if no users exist
      const existingUser = await dbQuery.get('SELECT id FROM users LIMIT 1');
      if (!existingUser) {
        const adminId = 'usr_admin_' + crypto.randomBytes(4).toString('hex');
        const salt = crypto.randomBytes(16).toString('hex');
        const defaultPassword = process.env.ADMIN_PASSWORD || 'admin';
        const hash = crypto.pbkdf2Sync(defaultPassword, salt, 10000, 64, 'sha512').toString('hex');

        await dbQuery.run(
          'INSERT INTO users (id, username, password_hash, salt, role) VALUES (?, ?, ?, ?, ?)',
          [adminId, 'admin', hash, salt, 'admin']
        );
        console.log(`[Migrator] Seeded default admin user (Username: admin)`);
      }

      // Seed default settings if missing
      const defaultSettings = { hide_root_storage: 'false' };
      for (const [key, val] of Object.entries(defaultSettings)) {
        const existingSetting = await dbQuery.get('SELECT key FROM settings WHERE key = ?', [key]);
        if (!existingSetting) {
          await dbQuery.run('INSERT INTO settings (key, value) VALUES (?, ?)', [key, val]);
        }
      }
    }
  }
];

class DatabaseMigrator {
  /**
   * Run all pending schema migrations sequentially
   */
  async run(dbQuery) {
    console.log('[Migrator] Checking database schema version...');

    // 1. Create migrations tracking table if missing
    await dbQuery.run(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Fetch applied migration versions
    const appliedRows = await dbQuery.all('SELECT version FROM schema_migrations ORDER BY version ASC');
    const appliedVersions = new Set(appliedRows.map(r => r.version));

    // 3. Execute pending migrations in sequence
    let appliedCount = 0;
    for (const migration of MIGRATIONS) {
      if (!appliedVersions.has(migration.version)) {
        console.log(`[Migrator] Applying migration v${migration.version}: ${migration.name}...`);
        await migration.up(dbQuery);
        await dbQuery.run(
          'INSERT INTO schema_migrations (version, name) VALUES (?, ?)',
          [migration.version, migration.name]
        );
        appliedCount++;
      }
    }

    if (appliedCount > 0) {
      console.log(`[Migrator] Successfully applied ${appliedCount} schema migration(s). Database is up to date.`);
    } else {
      console.log('[Migrator] Database schema is up to date (no pending migrations).');
    }
  }
}

module.exports = new DatabaseMigrator();
