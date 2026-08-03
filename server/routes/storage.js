/**
 * @file server/routes/storage.js
 * @description Storage mount discovery router providing system drive metrics and mount status.
 * @module StorageRoutes
 * @dependencies express, storageService
 * @author Agent Architecture Directive
 */

const express = require('express');
const router = express.Router();
const storageService = require('../services/storageService');

/**
 * GET /api/storage/drives - List detected mounted storage devices
 */
router.get('/drives', async (req, res) => {
  try {
    const drives = await storageService.discoverDrives();
    res.json({ drives });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
