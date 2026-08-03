/**
 * @file server/config.js
 * @description Central configuration module resolving environment settings, storage mount points, and system paths.
 * @module Config
 * @dependencies path, os, fs
 * @author Agent Architecture Directive
 */

const path = require('path');
const os = require('os');
const fs = require('fs');

const isWindows = os.platform() === 'win32';

// Resolve base storage root
let rootStoragePath;
if (isWindows) {
  rootStoragePath = path.resolve(__dirname, '../mock_storage');
} else {
  // On Armbian / Linux, use default root or system mounts
  rootStoragePath = process.env.CLOUDNEST_STORAGE_ROOT || '/var/cloudnest/storage';
}

// Ensure base storage directory exists
if (!fs.existsSync(rootStoragePath)) {
  fs.mkdirSync(rootStoragePath, { recursive: true });
}

// Ensure mock storage structure on Windows for easy testing
if (isWindows) {
  const mockMedia = path.join(rootStoragePath, 'media', 'usb_drive_1');
  const mockMnt = path.join(rootStoragePath, 'mnt', 'ext_hdd');
  fs.mkdirSync(mockMedia, { recursive: true });
  fs.mkdirSync(mockMnt, { recursive: true });

  // Add sample files if empty
  const sampleText = path.join(mockMedia, 'welcome.txt');
  if (!fs.existsSync(sampleText)) {
    fs.writeFileSync(sampleText, 'Welcome to CloudNest Personal Cloud Storage on Armbian!');
  }
}

// Chunk upload temporary workspace
const chunkStoragePath = path.resolve(__dirname, '../.chunks');
if (!fs.existsSync(chunkStoragePath)) {
  fs.mkdirSync(chunkStoragePath, { recursive: true });
}

// Database location
const dbPath = path.resolve(__dirname, '../cloudnest.db');

module.exports = {
  PORT: process.env.PORT || 3000,
  IS_WINDOWS: isWindows,
  ROOT_STORAGE_PATH: rootStoragePath,
  CHUNK_STORAGE_PATH: chunkStoragePath,
  DB_PATH: dbPath,
  SYSTEM_MOUNT_POINTS: isWindows
    ? [
        { name: 'USB Storage 1', path: path.join(rootStoragePath, 'media', 'usb_drive_1'), type: 'media' },
        { name: 'External HDD', path: path.join(rootStoragePath, 'mnt', 'ext_hdd'), type: 'mnt' }
      ]
    : [
        { name: 'Primary Storage', path: rootStoragePath, type: 'root' },
        { name: 'Media Mounts', path: '/media', type: 'media' },
        { name: 'System Mounts', path: '/mnt', type: 'mnt' }
      ],
  DEFAULT_CHUNK_SIZE: 2 * 1024 * 1024 // 2MB chunk default
};
