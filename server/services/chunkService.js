/**
 * @file server/services/chunkService.js
 * @description Robust chunked file transfer algorithm managing chunk buffering, resumption verification, assembly, and cleanup.
 * @module ChunkService
 * @dependencies fs, path, crypto, config, database, security
 * @author Agent Architecture Directive
 */

const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const crypto = require('crypto');
const { CHUNK_STORAGE_PATH, DEFAULT_CHUNK_SIZE } = require('../config');
const { dbQuery } = require('../db');
const { validateAndResolvePath } = require('../middleware/security');

class ChunkService {
  /**
   * Initialize a new or resumable upload session
   */
  async initSession({ filename, targetPath, totalSize, totalChunks, chunkSize = DEFAULT_CHUNK_SIZE }) {
    const safeTargetDir = validateAndResolvePath(targetPath);
    const sanitizedFilename = path.basename(filename).replace(/[/\\?%*:|"<>]/g, '').trim();
    if (!sanitizedFilename) {
      throw new Error('Invalid file name for upload');
    }

    const finalFilePath = path.join(safeTargetDir, sanitizedFilename);
    validateAndResolvePath(finalFilePath);

    // Create session hash key based on filename + path + totalSize for resumption lookup
    const sessionSeed = `${sanitizedFilename}_${finalFilePath}_${totalSize}`;
    const sessionId = crypto.createHash('sha256').update(sessionSeed).digest('hex').slice(0, 32);

    // Check if session exists in DB
    const existingSession = await dbQuery.get('SELECT * FROM upload_sessions WHERE id = ?', [sessionId]);

    if (existingSession) {
      // Session exists, fetch completed chunks
      const completedChunksRows = await dbQuery.all('SELECT chunk_index FROM upload_chunks WHERE session_id = ?', [sessionId]);
      const completedChunks = completedChunksRows.map(r => r.chunk_index);

      return {
        sessionId,
        isResumed: true,
        filename: sanitizedFilename,
        targetPath: finalFilePath,
        totalSize,
        totalChunks,
        chunkSize,
        completedChunks
      };
    }

    // Create session temp directory
    const sessionChunkDir = path.join(CHUNK_STORAGE_PATH, sessionId);
    if (!fs.existsSync(sessionChunkDir)) {
      await fsp.mkdir(sessionChunkDir, { recursive: true });
    }

    // Insert new session into SQLite
    await dbQuery.run(
      `INSERT INTO upload_sessions (id, filename, target_path, total_size, total_chunks, chunk_size)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [sessionId, sanitizedFilename, finalFilePath, totalSize, totalChunks, chunkSize]
    );

    return {
      sessionId,
      isResumed: false,
      filename: sanitizedFilename,
      targetPath: finalFilePath,
      totalSize,
      totalChunks,
      chunkSize,
      completedChunks: []
    };
  }

  /**
   * Store individual uploaded chunk file
   */
  async saveChunk(sessionId, chunkIndex, chunkBuffer) {
    const session = await dbQuery.get('SELECT * FROM upload_sessions WHERE id = ?', [sessionId]);
    if (!session) {
      const error = new Error('Invalid or expired upload session');
      error.status = 404;
      throw error;
    }

    const sessionChunkDir = path.join(CHUNK_STORAGE_PATH, sessionId);
    const chunkFilePath = path.join(sessionChunkDir, `chunk_${chunkIndex}`);

    // Write chunk buffer to disk
    await fsp.writeFile(chunkFilePath, chunkBuffer);

    // Record chunk in DB (ignore duplicate inserts if retried)
    await dbQuery.run(
      `INSERT OR REPLACE INTO upload_chunks (session_id, chunk_index, size) VALUES (?, ?, ?)`,
      [sessionId, chunkIndex, chunkBuffer.length]
    );

    // Return updated upload status
    const countRow = await dbQuery.get('SELECT COUNT(*) as count FROM upload_chunks WHERE session_id = ?', [sessionId]);
    const isComplete = countRow.count === session.total_chunks;

    return {
      sessionId,
      chunkIndex,
      uploadedCount: countRow.count,
      totalChunks: session.total_chunks,
      isComplete
    };
  }

  /**
   * Query status of an upload session for client resumption
   */
  async getSessionStatus(sessionId) {
    const session = await dbQuery.get('SELECT * FROM upload_sessions WHERE id = ?', [sessionId]);
    if (!session) {
      return null;
    }

    const completedChunksRows = await dbQuery.all('SELECT chunk_index FROM upload_chunks WHERE session_id = ?', [sessionId]);
    const completedChunks = completedChunksRows.map(r => r.chunk_index);

    return {
      sessionId,
      filename: session.filename,
      totalSize: session.total_size,
      totalChunks: session.total_chunks,
      completedChunks
    };
  }

  /**
   * Merge all uploaded chunks sequentially into final destination file
   */
  async completeSession(sessionId) {
    const session = await dbQuery.get('SELECT * FROM upload_sessions WHERE id = ?', [sessionId]);
    if (!session) {
      const error = new Error('Upload session not found');
      error.status = 404;
      throw error;
    }

    const sessionChunkDir = path.join(CHUNK_STORAGE_PATH, sessionId);
    const finalFilePath = session.target_path;

    // Verify all chunks are present
    const completedChunksRows = await dbQuery.all('SELECT chunk_index FROM upload_chunks WHERE session_id = ?', [sessionId]);
    if (completedChunksRows.length < session.total_chunks) {
      const error = new Error(`Cannot merge: missing chunks (${completedChunksRows.length}/${session.total_chunks})`);
      error.status = 400;
      throw error;
    }

    // Stream merge chunks to target file
    const writeStream = fs.createWriteStream(finalFilePath);

    for (let i = 0; i < session.total_chunks; i++) {
      const chunkFilePath = path.join(sessionChunkDir, `chunk_${i}`);
      if (!fs.existsSync(chunkFilePath)) {
        throw new Error(`Missing chunk file ${i} on server disk`);
      }

      await new Promise((resolve, reject) => {
        const readStream = fs.createReadStream(chunkFilePath);
        readStream.pipe(writeStream, { end: false });
        readStream.on('end', resolve);
        readStream.on('error', reject);
      });
    }

    writeStream.end();

    // Clean up temporary chunk workspace & DB entries asynchronously
    try {
      await fsp.rm(sessionChunkDir, { recursive: true, force: true });
      await dbQuery.run('DELETE FROM upload_chunks WHERE session_id = ?', [sessionId]);
      await dbQuery.run('DELETE FROM upload_sessions WHERE id = ?', [sessionId]);
    } catch (e) {
      console.warn('[ChunkService] Cleanup warning:', e.message);
    }

    const fileStats = await fsp.stat(finalFilePath);
    return {
      success: true,
      filename: session.filename,
      finalPath: finalFilePath,
      size: fileStats.size
    };
  }
}

module.exports = new ChunkService();
