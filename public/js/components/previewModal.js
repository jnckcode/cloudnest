/**
 * @file public/js/components/previewModal.js
 * @description Universal media viewer component for playing Video/Audio streams, viewing Code/Text, rendering Images, and loading PDF documents.
 * @module PreviewModalComponent
 * @dependencies api
 * @author Agent Architecture Directive
 */

class PreviewModal {
  constructor(modalId, bodyId, filenameId, downloadBtnId, closeBtnId) {
    this.modal = document.getElementById(modalId);
    this.body = document.getElementById(bodyId);
    this.filenameLabel = document.getElementById(filenameId);
    this.downloadBtn = document.getElementById(downloadBtnId);
    this.closeBtn = document.getElementById(closeBtnId);
    this.currentPath = null;

    this.closeBtn.addEventListener('click', () => this.close());
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) this.close();
    });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !this.modal.classList.contains('hidden')) {
        this.close();
      }
    });

    this.downloadBtn.addEventListener('click', () => {
      if (this.currentPath) {
        window.open(api.getDownloadUrl(this.currentPath), '_blank');
      }
    });
  }

  async open(item) {
    this.currentPath = item.path;
    this.filenameLabel.textContent = item.name;
    this.body.innerHTML = '<div style="color: #fff; padding: 2rem;">Loading media player...</div>';
    this.modal.classList.remove('hidden');

    const previewUrl = api.getPreviewUrl(item.path);
    const downloadUrl = api.getDownloadUrl(item.path);
    const mime = (item.mimeType || '').toLowerCase();
    const ext = (item.extension || '').toLowerCase();

    // 1. Image Viewer
    if (mime.startsWith('image/')) {
      this.body.innerHTML = `<img src="${previewUrl}" class="preview-media-element" alt="${item.name}">`;
      return;
    }

    // 2. Video Player
    if (mime.startsWith('video/')) {
      this.body.innerHTML = `
        <video controls autoplay class="preview-media-element">
          <source src="${previewUrl}" type="${mime}">
          Your browser does not support HTML5 video streaming.
        </video>
      `;
      return;
    }

    // 3. Audio Player
    if (mime.startsWith('audio/')) {
      this.body.innerHTML = `
        <div style="padding: 3rem; text-align: center;">
          <i class="fa-solid fa-music" style="font-size: 4rem; color: #10b981; margin-bottom: 1.5rem;"></i>
          <audio controls autoplay style="width: 100%; max-width: 500px;">
            <source src="${previewUrl}" type="${mime}">
            Your browser does not support HTML5 audio player.
          </audio>
        </div>
      `;
      return;
    }

    // 4. PDF Document Viewer
    if (mime.includes('pdf')) {
      this.body.innerHTML = `<iframe src="${previewUrl}" style="width:100%; height:100%; border:none;"></iframe>`;
      return;
    }

    // 5. Code & Text File Viewer
    if (mime.startsWith('text/') || mime.includes('javascript') || mime.includes('json') || ['js','html','css','py','sh','json','txt','md','c','cpp','cs','go','rs'].includes(ext.replace('.',''))) {
      try {
        const response = await fetch(previewUrl);
        if (!response.ok) {
          throw new Error(`Failed to load file (${response.status})`);
        }
        const codeText = await response.text();
        const escapedText = codeText.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        this.body.innerHTML = `<pre class="preview-code-block"><code>${escapedText}</code></pre>`;
      } catch (err) {
        this.body.innerHTML = `<div style="color: #f43f5e; padding: 2rem;">Error reading file content: ${err.message}</div>`;
      }
      return;
    }

    // Fallback for unsupported binary files
    this.body.innerHTML = `
      <div style="text-align: center; color: #94a3b8; padding: 3rem;">
        <i class="fa-solid fa-file-circle-exclamation" style="font-size: 3rem; margin-bottom: 1rem;"></i>
        <p>Preview not supported for this file type.</p>
        <button class="btn btn-primary" style="margin-top: 1rem;" onclick="window.open('${downloadUrl}', '_blank')">
          Download File
        </button>
      </div>
    `;
  }

  close() {
    this.modal.classList.add('hidden');
    this.body.innerHTML = '';
    this.currentPath = null;
  }
}
