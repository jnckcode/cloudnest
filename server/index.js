/**
 * @file server/index.js
 * @description Main application entrypoint bootstrapping Express server, middleware pipeline, static serving, and route controllers.
 * @module ExpressServer
 * @dependencies express, cors, helmet, path, config, security, routes
 * @author Agent Architecture Directive
 */

const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');

const { PORT, ROOT_STORAGE_PATH, IS_WINDOWS } = require('./config');
const { apiRateLimiter } = require('./middleware/security');
const { findAvailablePort } = require('./utils/portFinder');

// Import middleware & routes
const { authGuard } = require('./middleware/auth');
const authRoutes = require('./routes/auth');
const settingsRoutes = require('./routes/settings');
const fileRoutes = require('./routes/files');
const uploadRoutes = require('./routes/upload');
const storageRoutes = require('./routes/storage');

const app = express();

// Security Headers Setup
app.use(
  helmet({
    contentSecurityPolicy: false, // Allow inline media streams & CDNs for icons/fonts
    crossOriginEmbedderPolicy: false
  })
);

// CORS Policy
app.use(cors());

// Request Body Parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Apply API Rate Limiting
app.use('/api/', apiRateLimiter);

// Static Web App Frontend
app.use(express.static(path.join(__dirname, '../public')));

// Public Auth Endpoints
app.use('/api/auth', authRoutes);

// Protected API Endpoints (Require Valid Session Token)
app.use('/api/settings', authGuard, settingsRoutes);
app.use('/api/files', (req, res, next) => {
  // Allow public access to shared download links without auth token
  if (req.path.startsWith('/shared/')) {
    return next();
  }
  return authGuard(req, res, next);
}, fileRoutes);
app.use('/api/upload', authGuard, uploadRoutes);
app.use('/api/storage', authGuard, storageRoutes);

// Fallback index.html for SPA routing
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[ServerError]', err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error'
  });
});

// Start listening with Auto-Port Detection
findAvailablePort(PORT)
  .then((actualPort) => {
    app.listen(actualPort, () => {
      console.log(`
  =============================================================
   🚀 CloudNest Personal Cloud Storage Server is Running!
  =============================================================
   - Preferred Port: ${PORT}
   - Active Port: ${actualPort} ${actualPort !== parseInt(PORT, 10) ? '(Auto-allocated due to port conflict)' : ''}
   - Environment: ${IS_WINDOWS ? 'Windows Development (Mocked)' : 'Armbian SBC / Linux'}
   - Root Storage: ${ROOT_STORAGE_PATH}
   - Web Interface: http://localhost:${actualPort}
  =============================================================
  `);
    });
  })
  .catch((err) => {
    console.error('[ServerError] Failed to allocate port:', err.message);
    process.exit(1);
  });

module.exports = app;

