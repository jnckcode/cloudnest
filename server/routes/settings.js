/**
 * @file server/routes/settings.js
 * @description Settings router providing preferences retrieval and updates.
 * @module SettingsRoutes
 * @dependencies express, settingsService, authGuard
 * @author Agent Architecture Directive
 */

const express = require('express');
const router = express.Router();
const settingsService = require('../services/settingsService');
const { authGuard } = require('../middleware/auth');

/**
 * GET /api/settings - Fetch current application preferences
 */
router.get('/', authGuard, async (req, res) => {
  try {
    const settings = await settingsService.getSettings();
    res.json({ settings });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/settings - Update application preferences
 */
router.post('/', authGuard, async (req, res) => {
  try {
    const settings = await settingsService.updateSettings(req.body);
    res.json({ settings, message: 'Settings updated successfully' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
