/**
 * @file public/js/components/uploadManager.js
 * @description Drag-and-drop file upload manager controlling batch queues, chunked progress tracking, and drawer toggling.
 * @module UploadManagerComponent
 * @dependencies api
 * @author Agent Architecture Directive
 */

class UploadManager {
  constructor({ dropzoneOverlayId, drawerId, queueListId, countBadgeId, onUploadComplete }) {
    this.dropzoneOverlay = document.getElementById(dropzoneOverlayId);
    this.drawer = document.getElementById(drawerId);
    this.queueList = document.getElementById(queueListId);
    this.countBadge = document.getElementById(countBadgeId);
    this.onUploadComplete = onUploadComplete;

    this.queue = [];
    this.isUploading = false;
    this.targetPath = '';

    this.initDragAndDrop();
    this.initDrawerToggles();
  }

  setTargetPath(path) {
    this.targetPath = path;
  }

  initDragAndDrop() {
    let dragCounter = 0;

    window.addEventListener('dragenter', (e) => {
      e.preventDefault();
      dragCounter++;
      if (dragCounter === 1) {
        this.dropzoneOverlay.classList.remove('hidden');
      }
    });

    window.addEventListener('dragleave', (e) => {
      e.preventDefault();
      dragCounter--;
      if (dragCounter === 0) {
        this.dropzoneOverlay.classList.add('hidden');
      }
    });

    window.addEventListener('dragover', (e) => e.preventDefault());

    window.addEventListener('drop', (e) => {
      e.preventDefault();
      dragCounter = 0;
      this.dropzoneOverlay.classList.add('hidden');

      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        this.addFilesToQueue(Array.from(e.dataTransfer.files));
      }
    });
  }

  initDrawerToggles() {
    document.getElementById('btn-close-drawer').addEventListener('click', () => {
      this.drawer.classList.add('hidden');
    });

    document.getElementById('btn-toggle-drawer').addEventListener('click', () => {
      this.queueList.classList.toggle('hidden');
    });
  }

  addFilesToQueue(files) {
    files.forEach(file => {
      const id = 'up_' + Math.random().toString(36).substr(2, 9);
      this.queue.push({
        id,
        file,
        targetPath: this.targetPath,
        progress: 0,
        status: 'queued' // 'queued' | 'uploading' | 'completed' | 'error'
      });
    });

    this.drawer.classList.remove('hidden');
    this.queueList.classList.remove('hidden');
    this.updateDrawerUI();

    if (!this.isUploading) {
      this.processQueue();
    }
  }

  updateDrawerUI() {
    const total = this.queue.length;
    const completed = this.queue.filter(q => q.status === 'completed').length;
    this.countBadge.textContent = `${completed}/${total}`;

    this.queueList.innerHTML = this.queue.map(item => `
      <div class="upload-item-card" id="${item.id}">
        <div class="upload-item-header">
          <span style="font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:200px;">${item.file.name}</span>
          <span class="upload-status-text">${item.status === 'completed' ? '✔ Done' : item.progress + '%'}</span>
        </div>
        <div class="progress-bar-track">
          <div class="progress-bar-fill" style="width: ${item.progress}%"></div>
        </div>
      </div>
    `).join('');
  }

  async processQueue() {
    const pendingItem = this.queue.find(q => q.status === 'queued');
    if (!pendingItem) {
      this.isUploading = false;
      if (this.onUploadComplete) {
        this.onUploadComplete();
      }
      return;
    }

    this.isUploading = true;
    pendingItem.status = 'uploading';
    this.updateDrawerUI();

    try {
      await api.uploadFileChunked(pendingItem.file, pendingItem.targetPath, {
        onProgress: (percent) => {
          pendingItem.progress = percent;
          const card = document.getElementById(pendingItem.id);
          if (card) {
            card.querySelector('.progress-bar-fill').style.width = `${percent}%`;
            card.querySelector('.upload-status-text').textContent = `${percent}%`;
          }
        }
      });

      pendingItem.status = 'completed';
      pendingItem.progress = 100;
    } catch (err) {
      pendingItem.status = 'error';
      const card = document.getElementById(pendingItem.id);
      if (card) {
        card.querySelector('.upload-status-text').textContent = '❌ Error';
      }
    }

    this.updateDrawerUI();
    // Process next item in queue
    this.processQueue();
  }
}
