/**
 * @file server/services/fileService.js
 * @description File system service providing secure, atomic file and folder operations with metadata extraction.
 * @module FileService
 * @dependencies fs, path, mime-types, archiver, security
 * @author Agent Architecture Directive
 */

const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const mime = require('mime-types');
const archiver = require('archiver');
const { validateAndResolvePath } = require('../middleware/security');

class FileService {
  /**
   * List directory items with file metadata
   */
  async listDirectory(targetPath) {
    const safePath = validateAndResolvePath(targetPath);
    const stats = await fsp.stat(safePath);

    if (!stats.isDirectory()) {
      const error = new Error('Specified path is not a directory');
      error.status = 400;
      throw error;
    }

    const entries = await fsp.readdir(safePath, { withFileTypes: true });

    const items = await Promise.all(
      entries.map(async (entry) => {
        const itemPath = path.join(safePath, entry.name);
        try {
          const itemStats = await fsp.stat(itemPath);
          const ext = path.extname(entry.name).toLowerCase();
          const mimeType = entry.isDirectory() ? 'directory' : (mime.lookup(entry.name) || 'application/octet-stream');

          return {
            name: entry.name,
            path: itemPath,
            relativePath: path.relative(validateAndResolvePath(''), itemPath),
            isDirectory: entry.isDirectory(),
            size: itemStats.size,
            mimeType: mimeType,
            extension: ext,
            modifiedAt: itemStats.mtime,
            createdAt: itemStats.birthtime
          };
        } catch (err) {
          // Handle inaccessible files or broken symlinks gracefully
          return null;
        }
      })
    );

    // Filter out nulls and sort: directories first, then alphabetically
    return items
      .filter(Boolean)
      .sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
      });
  }

  /**
   * Create new folder securely
   */
  async createDirectory(parentPath, folderName) {
    const safeParent = validateAndResolvePath(parentPath);
    // Sanitize folder name
    const sanitizedName = folderName.replace(/[/\\?%*:|"<>]/g, '').trim();
    if (!sanitizedName) {
      throw new Error('Invalid folder name');
    }
    const newFolderPath = path.join(safeParent, sanitizedName);
    validateAndResolvePath(newFolderPath);

    if (fs.existsSync(newFolderPath)) {
      const error = new Error('Folder already exists');
      error.status = 409;
      throw error;
    }

    await fsp.mkdir(newFolderPath, { recursive: true });
    return { name: sanitizedName, path: newFolderPath };
  }

  /**
   * Delete file or directory recursively
   */
  async deleteItem(targetPath) {
    const safePath = validateAndResolvePath(targetPath);
    const stats = await fsp.stat(safePath);

    if (stats.isDirectory()) {
      await fsp.rm(safePath, { recursive: true, force: true });
    } else {
      await fsp.unlink(safePath);
    }
    return { success: true, deletedPath: safePath };
  }

  /**
   * Rename file or folder
   */
  async renameItem(targetPath, newName) {
    const safePath = validateAndResolvePath(targetPath);
    const sanitizedName = newName.replace(/[/\\?%*:|"<>]/g, '').trim();
    if (!sanitizedName) {
      throw new Error('Invalid item name');
    }

    const parentDir = path.dirname(safePath);
    const newPath = path.join(parentDir, sanitizedName);
    validateAndResolvePath(newPath);

    if (fs.existsSync(newPath)) {
      const error = new Error('An item with the new name already exists');
      error.status = 409;
      throw error;
    }

    await fsp.rename(safePath, newPath);
    return { oldPath: safePath, newPath: newPath, name: sanitizedName };
  }

  /**
   * Move file or folder
   */
  async moveItem(sourcePath, destinationDir) {
    const safeSource = validateAndResolvePath(sourcePath);
    const safeDestDir = validateAndResolvePath(destinationDir);

    const fileName = path.basename(safeSource);
    const targetPath = path.join(safeDestDir, fileName);
    validateAndResolvePath(targetPath);

    await fsp.rename(safeSource, targetPath);
    return { sourcePath: safeSource, targetPath };
  }

  /**
   * Copy file or folder recursively
   */
  async copyItem(sourcePath, destinationDir) {
    const safeSource = validateAndResolvePath(sourcePath);
    const safeDestDir = validateAndResolvePath(destinationDir);

    const fileName = path.basename(safeSource);
    const targetPath = path.join(safeDestDir, fileName);
    validateAndResolvePath(targetPath);

    const stats = await fsp.stat(safeSource);
    if (stats.isDirectory()) {
      await fsp.cp(safeSource, targetPath, { recursive: true });
    } else {
      await fsp.copyFile(safeSource, targetPath);
    }
    return { sourcePath: safeSource, targetPath };
  }

  /**
   * Get detailed item properties
   */
  async getItemProperties(targetPath) {
    const safePath = validateAndResolvePath(targetPath);
    const stats = await fsp.stat(safePath);
    const name = path.basename(safePath);
    const ext = path.extname(name).toLowerCase();
    const mimeType = stats.isDirectory() ? 'directory' : (mime.lookup(name) || 'application/octet-stream');

    let totalItems = null;
    let computedSize = stats.size;

    if (stats.isDirectory()) {
      computedSize = await this._calculateDirSize(safePath);
    }

    return {
      name,
      path: safePath,
      isDirectory: stats.isDirectory(),
      size: computedSize,
      mimeType,
      extension: ext,
      modifiedAt: stats.mtime,
      createdAt: stats.birthtime,
      permissions: stats.mode.toString(8).slice(-3)
    };
  }

  /**
   * Internal recursive folder size calculator
   */
  async _calculateDirSize(dirPath) {
    let total = 0;
    try {
      const entries = await fsp.readdir(dirPath, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        if (entry.isDirectory()) {
          total += await this._calculateDirSize(fullPath);
        } else if (entry.isFile()) {
          const s = await fsp.stat(fullPath);
          total += s.size;
        }
      }
    } catch (e) {
      // ignore unreadable items
    }
    return total;
  }

  /**
   * Create dynamic zip stream for folder download
   */
  createZipArchiveStream(targetPath, res) {
    const safePath = validateAndResolvePath(targetPath);
    const folderName = path.basename(safePath) || 'cloudnest_archive';

    res.attachment(`${folderName}.zip`);
    const archive = archiver('zip', { zlib: { level: 6 } });

    archive.on('error', (err) => {
      if (!res.headersSent) {
        res.status(500).json({ error: err.message });
      }
    });

    archive.pipe(res);
    archive.directory(safePath, false);
    archive.finalize();
  }
}

module.exports = new FileService();
