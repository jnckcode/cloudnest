/**
 * @file server/routes/upload.js
 * @description Chunked upload API router managing upload session initialization, chunk ingestion, status queries, and final assembly.
 * @module UploadRoutes
 * @dependencies express, multer, chunkService, security
 * @author Agent Architecture Directive
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const chunkService = require('../services/chunkService');
const { uploadRateLimiter } = require('../middleware/security');

// Configure multer memory storage for chunk buffering
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 } // 20MB max per chunk
});

// Apply rate limiter to upload routes
router.use(uploadRateLimiter);

/**
 * POST /api/upload/init - Initialize or check resumable upload session
 */
router.post('/init', async (req, res) => {
  try {
    const { filename, targetPath, totalSize, totalChunks, chunkSize } = req.body;

    if (!filename || !totalSize || !totalChunks) {
      return res.status(400).json({ error: 'Missing required upload session metadata' });
    }

    const session = await chunkService.initSession({
      filename,
      targetPath: targetPath || '',
      totalSize: parseInt(totalSize, 10),
      totalChunks: parseInt(totalChunks, 10),
      chunkSize: chunkSize ? parseInt(chunkSize, 10) : undefined
    });

    res.json(session);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

/**
 * POST /api/upload/chunk - Upload single chunk
 */
router.post('/chunk', upload.single('chunk'), async (req, res) => {
  try {
    const { sessionId, chunkIndex } = req.body;

    if (!sessionId || chunkIndex === undefined || !req.file) {
      return res.status(400).json({ error: 'Missing chunk payload or session parameters' });
    }

    const result = await chunkService.saveChunk(
      sessionId,
      parseInt(chunkIndex, 10),
      req.file.buffer
    );

    res.json(result);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

/**
 * GET /api/upload/status - Query uploaded chunk indices for resumption
 */
router.get('/status', async (req, res) => {
  try {
    const { sessionId } = req.query;
    if (!sessionId) {
      return res.status(400).json({ error: 'Missing sessionId query parameter' });
    }

    const status = await chunkService.getSessionStatus(sessionId);
    if (!status) {
      return res.status(404).json({ error: 'Upload session not found' });
    }

    res.json(status);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

/**
 * POST /api/upload/complete - Finalize chunk assembly into destination file
 */
router.post('/complete', async (req, res) => {
  try {
    const { sessionId } = req.body;
    if (!sessionId) {
      return res.status(400).json({ error: 'Missing sessionId parameter' });
    }

    const result = await chunkService.completeSession(sessionId);
    res.json(result);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

module.exports = router;
