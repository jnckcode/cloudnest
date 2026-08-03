/**
 * @file server/routes/files.js
 * @description File management express router handling list, CRUD, streaming preview, zip archive download, and sharing.
 * @module FileRoutes
 * @dependencies express, fileService, security, mime-types, db
 * @author Agent Architecture Directive
 */

const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const mime = require('mime-types');
const crypto = require('crypto');
const fileService = require('../services/fileService');
const { validateAndResolvePath } = require('../middleware/security');
const { dbQuery } = require('../db');

/**
 * GET /api/files/list - List directory contents
 */
router.get('/list', async (req, res) => {
  try {
    const targetPath = req.query.path || '';
    const items = await fileService.listDirectory(targetPath);
    const currentSafePath = validateAndResolvePath(targetPath);
    res.json({
      currentPath: targetPath,
      absolutePath: currentSafePath,
      items
    });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

/**
 * POST /api/files/mkdir - Create directory
 */
router.post('/mkdir', async (req, res) => {
  try {
    const { parentPath, folderName } = req.body;
    const result = await fileService.createDirectory(parentPath, folderName);
    res.status(201).json(result);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

/**
 * DELETE /api/files/delete - Delete file or folder
 */
router.delete('/delete', async (req, res) => {
  try {
    const targetPath = req.query.path || req.body.path;
    const result = await fileService.deleteItem(targetPath);
    res.json(result);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

/**
 * POST /api/files/rename - Rename file or directory
 */
router.post('/rename', async (req, res) => {
  try {
    const { path: targetPath, newName } = req.body;
    const result = await fileService.renameItem(targetPath, newName);
    res.json(result);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

/**
 * POST /api/files/move - Move file or directory
 */
router.post('/move', async (req, res) => {
  try {
    const { sourcePath, destinationDir } = req.body;
    const result = await fileService.moveItem(sourcePath, destinationDir);
    res.json(result);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

/**
 * POST /api/files/copy - Copy file or directory
 */
router.post('/copy', async (req, res) => {
  try {
    const { sourcePath, destinationDir } = req.body;
    const result = await fileService.copyItem(sourcePath, destinationDir);
    res.json(result);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

/**
 * GET /api/files/properties - Detailed file metadata
 */
router.get('/properties', async (req, res) => {
  try {
    const targetPath = req.query.path;
    const result = await fileService.getItemProperties(targetPath);
    res.json(result);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

/**
 * GET /api/files/download - Single file download or ZIP folder stream
 */
router.get('/download', async (req, res) => {
  try {
    const targetPath = req.query.path;
    const safePath = validateAndResolvePath(targetPath);
    const stats = await fs.promises.stat(safePath);

    if (stats.isDirectory()) {
      return fileService.createZipArchiveStream(safePath, res);
    }

    const filename = path.basename(safePath);
    res.download(safePath, filename);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

/**
 * GET /api/files/preview - Stream media / code for inline viewing with HTTP Range support
 */
router.get('/preview', async (req, res) => {
  try {
    const targetPath = req.query.path;
    const safePath = validateAndResolvePath(targetPath);
    const stats = await fs.promises.stat(safePath);

    if (stats.isDirectory()) {
      return res.status(400).json({ error: 'Cannot preview a directory' });
    }

    const filename = path.basename(safePath);
    const contentType = mime.lookup(filename) || 'text/plain';
    const fileSize = stats.size;
    const range = req.headers.range;

    // HTTP Range streaming for video/audio seeking
    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = end - start + 1;

      const fileStream = fs.createReadStream(safePath, { start, end });
      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': contentType
      });
      fileStream.pipe(res);
    } else {
      res.writeHead(200, {
        'Content-Length': fileSize,
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${filename}"`
      });
      fs.createReadStream(safePath).pipe(res);
    }
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

/**
 * POST /api/files/share - Generate share link token
 */
router.post('/share', async (req, res) => {
  try {
    const { path: targetPath, expireHours = 24 } = req.body;
    const safePath = validateAndResolvePath(targetPath);
    const stats = await fs.promises.stat(safePath);

    const token = crypto.randomBytes(16).toString('hex');
    const expiresAt = new Date(Date.now() + expireHours * 3600 * 1000).toISOString();

    await dbQuery.run(
      `INSERT INTO shared_links (token, file_path, is_directory, expires_at) VALUES (?, ?, ?, ?)`,
      [token, safePath, stats.isDirectory() ? 1 : 0, expiresAt]
    );

    res.json({
      token,
      shareUrl: `/api/files/shared/${token}`,
      expiresAt
    });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

/**
 * GET /api/files/shared/:token - Download / View public shared link
 */
router.get('/shared/:token', async (req, res) => {
  try {
    const token = req.params.token;
    const record = await dbQuery.get('SELECT * FROM shared_links WHERE token = ?', [token]);

    if (!record) {
      return res.status(404).send('Shared link not found');
    }

    if (record.expires_at && new Date(record.expires_at) < new Date()) {
      return res.status(410).send('Shared link has expired');
    }

    // Update access count
    await dbQuery.run('UPDATE shared_links SET access_count = access_count + 1 WHERE token = ?', [token]);

    const safePath = record.file_path;
    const stats = await fs.promises.stat(safePath);

    if (stats.isDirectory()) {
      return fileService.createZipArchiveStream(safePath, res);
    }

    const filename = path.basename(safePath);
    res.download(safePath, filename);
  } catch (err) {
    res.status(500).send('Internal Server Error');
  }
});

module.exports = router;
