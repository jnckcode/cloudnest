/**
 * @file server/routes/auth.js
 * @description Authentication router handling login, logout, session verification, and password updates.
 * @module AuthRoutes
 * @dependencies express, authService, authGuard
 * @author Agent Architecture Directive
 */

const express = require('express');
const router = express.Router();
const authService = require('../services/authService');
const { authGuard } = require('../middleware/auth');

/**
 * POST /api/auth/login
 */
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const result = await authService.login(username, password);
    res.json(result);
  } catch (err) {
    res.status(err.status || 400).json({ error: err.message });
  }
});

/**
 * POST /api/auth/logout
 */
router.post('/logout', authGuard, async (req, res) => {
  try {
    await authService.logout(req.token);
    res.json({ message: 'Logged out successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/auth/me
 */
router.get('/me', authGuard, (req, res) => {
  res.json({ user: req.user });
});

/**
 * POST /api/auth/change-password
 */
router.post('/change-password', authGuard, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    await authService.changePassword(req.user.id, currentPassword, newPassword);
    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    res.status(err.status || 400).json({ error: err.message });
  }
});

module.exports = router;
