/**
 * @file server/middleware/security.js
 * @description Defense-in-depth security middleware for path traversal mitigation, rate limiting, and input sanitization.
 * @module SecurityMiddleware
 * @dependencies path, fs, config, express-rate-limit
 * @author Agent Architecture Directive
 */

const path = require('path');
const fs = require('fs');
const rateLimit = require('express-rate-limit');
const { ROOT_STORAGE_PATH, IS_WINDOWS } = require('../config');

/**
 * Resolves and validates a path against system root storage.
 * Prevents Directory Traversal, Path Escalation, and Null Byte exploits.
 * @param {string} relativeOrAbsolutePath 
 * @returns {string} Absolute validated path
 * @throws {Error} if path escapes allowed root
 */
function validateAndResolvePath(relativeOrAbsolutePath) {
  if (!relativeOrAbsolutePath) {
    return ROOT_STORAGE_PATH;
  }

  // Null byte injection check
  if (relativeOrAbsolutePath.includes('\0') || relativeOrAbsolutePath.includes('%00')) {
    const error = new Error('Invalid path characters detected');
    error.status = 400;
    throw error;
  }

  // Normalize path
  const normalizedInput = path.normalize(relativeOrAbsolutePath);
  let resolvedPath;

  if (path.isAbsolute(normalizedInput)) {
    resolvedPath = path.resolve(normalizedInput);
  } else {
    resolvedPath = path.resolve(ROOT_STORAGE_PATH, normalizedInput);
  }

  // Verify that target path starts within ROOT_STORAGE_PATH (or system mount directories on Linux)
  const isWithinRoot = resolvedPath.startsWith(ROOT_STORAGE_PATH);
  const isWithinLinuxMount = !IS_WINDOWS && (resolvedPath.startsWith('/media') || resolvedPath.startsWith('/mnt'));

  if (!isWithinRoot && !isWithinLinuxMount) {
    const error = new Error('Access denied: Path outside storage root');
    error.status = 403;
    throw error;
  }

  return resolvedPath;
}

/**
 * Express middleware to validate target path in query/body
 */
function pathGuard(req, res, next) {
  try {
    const targetPath = req.query.path || req.body.path || req.body.targetPath || '';
    req.safePath = validateAndResolvePath(targetPath);
    next();
  } catch (err) {
    return res.status(err.status || 400).json({ error: err.message });
  }
}

/**
 * Rate Limiter for Chunk Upload Endpoints
 */
const uploadRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 300, // Limit each IP to 300 upload requests per minute
  message: { error: 'Too many upload requests. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Rate Limiter for General API Endpoints
 */
const apiRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 600,
  message: { error: 'Rate limit exceeded.' }
});

module.exports = {
  validateAndResolvePath,
  pathGuard,
  uploadRateLimiter,
  apiRateLimiter
};
