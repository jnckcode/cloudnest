/**
 * @file server/services/storageService.js
 * @description Automated system storage discovery service detecting mounted media devices and calculating available disk space.
 * @module StorageService
 * @dependencies fs, path, child_process, config
 * @author Agent Architecture Directive
 */

const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const { execFile } = require('child_process');
const { IS_WINDOWS, ROOT_STORAGE_PATH, SYSTEM_MOUNT_POINTS } = require('../config');

class StorageService {
  /**
   * Dynamically discover mounted drives and disk usage
   */
  async discoverDrives() {
    const drives = [];

    if (IS_WINDOWS) {
      // Windows Mock Storage Discovery
      drives.push({
        id: 'primary',
        name: 'Primary Storage',
        path: ROOT_STORAGE_PATH,
        type: 'root',
        isMounted: true,
        total: 512 * 1024 * 1024 * 1024, // 512 GB Mock
        free: 320 * 1024 * 1024 * 1024,  // 320 GB Mock
        used: 192 * 1024 * 1024 * 1024
      });

      for (const m of SYSTEM_MOUNT_POINTS) {
        if (fs.existsSync(m.path)) {
          drives.push({
            id: m.name.toLowerCase().replace(/\s+/g, '_'),
            name: m.name,
            path: m.path,
            type: m.type,
            isMounted: true,
            total: 128 * 1024 * 1024 * 1024,
            free: 84 * 1024 * 1024 * 1024,
            used: 44 * 1024 * 1024 * 1024
          });
        }
      }

      return drives;
    }

    // Armbian / Linux Dynamic Storage Discovery under /media and /mnt
    // 1. Primary Root Storage
    const rootUsage = await this._getLinuxDiskUsage(ROOT_STORAGE_PATH);
    drives.push({
      id: 'primary_root',
      name: 'System Internal Storage',
      path: ROOT_STORAGE_PATH,
      type: 'root',
      isMounted: true,
      ...rootUsage
    });

    // 2. Scan /media and /mnt directories for mounts
    const mountRoots = ['/media', '/mnt'];
    for (const mountDir of mountRoots) {
      if (fs.existsSync(mountDir)) {
        try {
          const entries = await fsp.readdir(mountDir, { withFileTypes: true });
          for (const entry of entries) {
            if (entry.isDirectory()) {
              const fullPath = path.join(mountDir, entry.name);
              const usage = await this._getLinuxDiskUsage(fullPath);
              drives.push({
                id: `mount_${entry.name}`,
                name: `External Mount: ${entry.name}`,
                path: fullPath,
                type: mountDir.replace('/', ''),
                isMounted: true,
                ...usage
              });
            }
          }
        } catch (e) {
          console.warn(`[StorageService] Error reading ${mountDir}:`, e.message);
        }
      }
    }

    return drives;
  }

  /**
   * Helper to execute `df -P -B1` on Linux safely without shell injection
   */
  _getLinuxDiskUsage(targetPath) {
    return new Promise((resolve) => {
      execFile('df', ['-P', '-B1', targetPath], (err, stdout) => {
        if (err || !stdout) {
          return resolve({ total: 0, free: 0, used: 0 });
        }

        const lines = stdout.trim().split('\n');
        if (lines.length >= 2) {
          const parts = lines[1].split(/\s+/);
          const total = parseInt(parts[1], 10) || 0;
          const used = parseInt(parts[2], 10) || 0;
          const free = parseInt(parts[3], 10) || 0;
          return resolve({ total, used, free });
        }

        resolve({ total: 0, free: 0, used: 0 });
      });
    });
  }
}

module.exports = new StorageService();
