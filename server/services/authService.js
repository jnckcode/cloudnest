/**
 * @file server/services/authService.js
 * @description Authentication service managing password hashing, user registration, session tokens, and default admin seeding.
 * @module AuthService
 * @dependencies crypto, dbQuery
 * @author Agent Architecture Directive
 */

const crypto = require('crypto');
const { dbQuery } = require('../db');

class AuthService {
  constructor() {
    this.sessionDurationMs = 7 * 24 * 60 * 60 * 1000; // 7 days session
    this.initDefaultAdmin();
  }

  /**
   * Generates a random salt and hashes a password using PBKDF2
   */
  hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
    const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    return { hash, salt };
  }

  /**
   * Auto-seed default admin user if database has no users
   */
  async initDefaultAdmin() {
    try {
      const user = await dbQuery.get('SELECT id FROM users LIMIT 1');
      if (!user) {
        const adminId = 'usr_admin_' + crypto.randomBytes(4).toString('hex');
        const defaultPassword = process.env.ADMIN_PASSWORD || 'admin';
        const { hash, salt } = this.hashPassword(defaultPassword);

        await dbQuery.run(
          'INSERT INTO users (id, username, password_hash, salt, role) VALUES (?, ?, ?, ?, ?)',
          [adminId, 'admin', hash, salt, 'admin']
        );
        console.log(`[AuthService] Initialized default admin user (Username: admin, Password: ${defaultPassword})`);
      }
    } catch (err) {
      console.error('[AuthService] Failed to initialize default admin:', err.message);
    }
  }

  /**
   * Verify username & password credentials
   */
  async login(username, password) {
    if (!username || !password) {
      throw new Error('Username and password are required');
    }

    const user = await dbQuery.get('SELECT * FROM users WHERE username = ?', [username.trim().toLowerCase()]);
    if (!user) {
      const err = new Error('Invalid username or password');
      err.status = 401;
      throw err;
    }

    const { hash } = this.hashPassword(password, user.salt);
    if (hash !== user.password_hash) {
      const err = new Error('Invalid username or password');
      err.status = 401;
      throw err;
    }

    // Create session token
    const token = 'tok_' + crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + this.sessionDurationMs).toISOString();

    await dbQuery.run(
      'INSERT INTO user_sessions (token, user_id, expires_at) VALUES (?, ?, ?)',
      [token, user.id, expiresAt]
    );

    return {
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    };
  }

  /**
   * Validate session token
   */
  async validateToken(token) {
    if (!token) return null;

    const session = await dbQuery.get(
      `SELECT s.token, s.expires_at, u.id as user_id, u.username, u.role 
       FROM user_sessions s
       JOIN users u ON s.user_id = u.id
       WHERE s.token = ?`,
      [token]
    );

    if (!session) return null;

    // Check expiration
    if (new Date(session.expires_at).getTime() < Date.now()) {
      await dbQuery.run('DELETE FROM user_sessions WHERE token = ?', [token]);
      return null;
    }

    return {
      id: session.user_id,
      username: session.username,
      role: session.role
    };
  }

  /**
   * Logout user by destroying session token
   */
  async logout(token) {
    if (token) {
      await dbQuery.run('DELETE FROM user_sessions WHERE token = ?', [token]);
    }
    return { success: true };
  }

  /**
   * Change user password
   */
  async changePassword(userId, currentPassword, newPassword) {
    if (!currentPassword || !newPassword || newPassword.length < 4) {
      throw new Error('New password must be at least 4 characters long');
    }

    const user = await dbQuery.get('SELECT * FROM users WHERE id = ?', [userId]);
    if (!user) {
      throw new Error('User not found');
    }

    const { hash: currentHash } = this.hashPassword(currentPassword, user.salt);
    if (currentHash !== user.password_hash) {
      const err = new Error('Current password is incorrect');
      err.status = 400;
      throw err;
    }

    const { hash: newHash, salt: newSalt } = this.hashPassword(newPassword);
    await dbQuery.run(
      'UPDATE users SET password_hash = ?, salt = ? WHERE id = ?',
      [newHash, newSalt, userId]
    );

    return { success: true };
  }
}

module.exports = new AuthService();
