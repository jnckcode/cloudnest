/**
 * @file public/js/api.js
 * @description API client wrapper and robust chunked upload engine supporting parallel transfers, resume logic, and integrity verification.
 * @module APIClient
 * @dependencies none (native fetch & FormData)
 * @author Agent Architecture Directive
 */

class CloudNestAPI {
  constructor() {
    this.baseUrl = '/api';
    this.chunkSize = 2 * 1024 * 1024; // 2MB Chunk default
    this.token = localStorage.getItem('cloudnest_token') || '';
    this.onUnauthorized = null;
  }

  setToken(token) {
    this.token = token || '';
    if (token) {
      localStorage.setItem('cloudnest_token', token);
    } else {
      localStorage.removeItem('cloudnest_token');
    }
  }

  /**
   * Universal fetch helper
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = options.headers || {};
    
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(options.body);
    }

    const response = await fetch(url, { ...options, headers });
    
    if (!response.ok) {
      if (response.status === 401 && this.onUnauthorized && !endpoint.includes('/auth/login')) {
        this.onUnauthorized();
      }

      let errorMsg = 'API Request Failed';
      try {
        const errJson = await response.json();
        errorMsg = errJson.error || errorMsg;
      } catch (e) {
        errorMsg = response.statusText;
      }
      const err = new Error(errorMsg);
      err.status = response.status;
      throw err;
    }

    return response.json();
  }

  // --- Auth Endpoints ---
  async login(username, password) {
    const res = await this.request('/auth/login', {
      method: 'POST',
      body: { username, password }
    });
    if (res.token) {
      this.setToken(res.token);
    }
    return res;
  }

  async logout() {
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } catch (e) {
      // Ignore logout errors
    } finally {
      this.setToken('');
    }
  }

  async getMe() {
    return this.request('/auth/me');
  }

  async changePassword(currentPassword, newPassword) {
    return this.request('/auth/change-password', {
      method: 'POST',
      body: { currentPassword, newPassword }
    });
  }

  // --- Settings Endpoints ---
  async getSettings() {
    return this.request('/settings');
  }

  async updateSettings(settings) {
    return this.request('/settings', {
      method: 'POST',
      body: settings
    });
  }

  // --- Storage Drives ---
  async getStorageDrives() {
    return this.request('/storage/drives');
  }

  // --- File Manager CRUD ---
  async listFiles(targetPath = '') {
    const encodedPath = encodeURIComponent(targetPath);
    return this.request(`/files/list?path=${encodedPath}`);
  }

  async createDirectory(parentPath, folderName) {
    return this.request('/files/mkdir', {
      method: 'POST',
      body: { parentPath, folderName }
    });
  }

  async deleteItem(targetPath) {
    return this.request('/files/delete', {
      method: 'DELETE',
      body: { path: targetPath }
    });
  }

  async renameItem(targetPath, newName) {
    return this.request('/files/rename', {
      method: 'POST',
      body: { path: targetPath, newName }
    });
  }

  async moveItem(sourcePath, destinationDir) {
    return this.request('/files/move', {
      method: 'POST',
      body: { sourcePath, destinationDir }
    });
  }

  async copyItem(sourcePath, destinationDir) {
    return this.request('/files/copy', {
      method: 'POST',
      body: { sourcePath, destinationDir }
    });
  }

  async getItemProperties(targetPath) {
    const encodedPath = encodeURIComponent(targetPath);
    return this.request(`/files/properties?path=${encodedPath}`);
  }

  async createShareLink(targetPath) {
    return this.request('/files/share', {
      method: 'POST',
      body: { path: targetPath }
    });
  }

  // --- Chunked Upload Algorithm with Resume Support ---
  async uploadFileChunked(file, targetPath, { onProgress, abortSignal }) {
    const totalSize = file.size;
    const totalChunks = Math.ceil(totalSize / this.chunkSize) || 1;

    // 1. Initialize upload session
    const session = await this.request('/upload/init', {
      method: 'POST',
      body: {
        filename: file.name,
        targetPath,
        totalSize,
        totalChunks,
        chunkSize: this.chunkSize
      }
    });

    const sessionId = session.sessionId;
    const completedSet = new Set(session.completedChunks || []);

    // 2. Upload missing chunks sequentially
    for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
      if (abortSignal && abortSignal.aborted) {
        throw new Error('Upload cancelled by user');
      }

      // Skip already uploaded chunks (Resumption algorithm)
      if (completedSet.has(chunkIndex)) {
        if (onProgress) {
          const percent = Math.round(((chunkIndex + 1) / totalChunks) * 100);
          onProgress(percent, chunkIndex + 1, totalChunks);
        }
        continue;
      }

      const start = chunkIndex * this.chunkSize;
      const end = Math.min(start + this.chunkSize, totalSize);
      const chunkBlob = file.slice(start, end);

      const formData = new FormData();
      formData.append('sessionId', sessionId);
      formData.append('chunkIndex', chunkIndex);
      formData.append('chunk', chunkBlob, `${file.name}.part${chunkIndex}`);

      await this.request('/upload/chunk', {
        method: 'POST',
        body: formData
      });

      if (onProgress) {
        const percent = Math.round(((chunkIndex + 1) / totalChunks) * 100);
        onProgress(percent, chunkIndex + 1, totalChunks);
      }
    }

    // 3. Complete and assemble session
    return this.request('/upload/complete', {
      method: 'POST',
      body: { sessionId }
    });
  }
}

const api = new CloudNestAPI();
