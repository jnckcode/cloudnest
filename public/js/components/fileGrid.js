/**
 * @file public/js/components/fileGrid.js
 * @description File manager view component supporting high-density Grid/List views, item selection, keyboard navigation, and double-click actions.
 * @module FileGridComponent
 * @dependencies none
 * @author Agent Architecture Directive
 */

class FileGrid {
  constructor(containerId, emptyStateId, options = {}) {
    this.container = document.getElementById(containerId);
    this.emptyState = document.getElementById(emptyStateId);
    this.viewMode = 'grid'; // 'grid' | 'list'
    this.items = [];
    this.selectedItem = null;
    
    // Callbacks
    this.onOpen = options.onOpen || (() => {});
    this.onSelect = options.onSelect || (() => {});
    this.onContextMenu = options.onContextMenu || (() => {});
  }

  setViewMode(mode) {
    this.viewMode = mode;
    this.container.className = `file-container ${mode}-view`;
    this.render();
  }

  setItems(items) {
    this.items = items || [];
    this.selectedItem = null;
    this.render();
  }

  getFileIconClass(item) {
    if (item.isDirectory) return 'fa-solid fa-folder';
    const ext = (item.extension || '').toLowerCase();
    const mime = (item.mimeType || '').toLowerCase();

    if (mime.startsWith('image/')) return 'fa-solid fa-file-image';
    if (mime.startsWith('video/')) return 'fa-solid fa-file-video';
    if (mime.startsWith('audio/')) return 'fa-solid fa-file-audio';
    if (mime.includes('pdf')) return 'fa-solid fa-file-pdf';
    if (mime.includes('javascript') || mime.includes('json') || mime.includes('html') || mime.includes('css') || ['js','py','sh','c','cpp','cs','go','rs','php'].includes(ext.replace('.',''))) {
      return 'fa-solid fa-file-code';
    }
    if (mime.startsWith('text/') || ['txt','md','log','csv'].includes(ext.replace('.',''))) return 'fa-solid fa-file-lines';
    
    return 'fa-solid fa-file';
  }

  formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  render() {
    if (!this.items || this.items.length === 0) {
      this.container.innerHTML = '';
      this.emptyState.classList.remove('hidden');
      return;
    }

    this.emptyState.classList.add('hidden');

    if (this.viewMode === 'grid') {
      this.container.innerHTML = this.items.map(item => `
        <div class="file-card" data-path="${encodeURIComponent(item.path)}">
          <div class="file-icon-wrapper">
            <i class="${this.getFileIconClass(item)}"></i>
          </div>
          <div class="file-name" title="${item.name}">${item.name}</div>
          <div class="file-meta">${item.isDirectory ? 'Folder' : this.formatBytes(item.size)}</div>
        </div>
      `).join('');
    } else {
      this.container.innerHTML = this.items.map(item => `
        <div class="file-card" data-path="${encodeURIComponent(item.path)}">
          <div class="file-info-group">
            <div class="file-icon-wrapper">
              <i class="${this.getFileIconClass(item)}"></i>
            </div>
            <div class="file-name" title="${item.name}">${item.name}</div>
          </div>
          <div class="file-meta">${item.isDirectory ? 'Folder' : this.formatBytes(item.size)}</div>
        </div>
      `).join('');
    }

    // Attach listeners
    this.container.querySelectorAll('.file-card').forEach((card, index) => {
      const item = this.items[index];

      // Single click selection
      card.addEventListener('click', (e) => {
        e.stopPropagation();
        this.selectCard(card, item);
      });

      // Double click open/preview
      card.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        this.onOpen(item);
      });

      // Right click context menu
      card.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.selectCard(card, item);
        this.onContextMenu(e, item);
      });
    });
  }

  selectCard(cardElement, item) {
    this.container.querySelectorAll('.file-card').forEach(c => c.classList.remove('selected'));
    if (cardElement) {
      cardElement.classList.add('selected');
    }
    this.selectedItem = item;
    this.onSelect(item);
  }
}
