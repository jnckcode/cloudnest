/**
 * @file server/middleware/auth.js
 * @description Authentication guard middleware validating Bearer tokens for protected API routes.
 * @module AuthMiddleware
 * @dependencies authService
 * @author Agent Architecture Directive
 */

const authService = require('../services/authService');

/**
 * Validates request authorization header or query token
 */
async function authGuard(req, res, next) {
  try {
    let token = null;
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    } else if (req.query && req.query.token) {
      token = req.query.token;
    }

    if (!token) {
      return res.status(401).json({
        error: 'Authentication required. Please log in.',
        code: 'UNAUTHORIZED'
      });
    }

    const user = await authService.validateToken(token);
    if (!user) {
      return res.status(401).json({
        error: 'Session expired or invalid token. Please log in again.',
        code: 'INVALID_TOKEN'
      });
    }

    req.user = user;
    req.token = token;
    next();
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

module.exports = {
  authGuard
};
