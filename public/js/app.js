/**
 * @file public/js/app.js
 * @description Core UI orchestrator tying together components, state management, search filters, modal popups, and keyboard events.
 * @module ApplicationController
 * @dependencies api, FileGrid, ContextMenu, PreviewModal, UploadManager, StorageSidebar
 * @author Agent Architecture Directive
 */

document.addEventListener('DOMContentLoaded', () => {
  let currentPath = '';
  let rawFilesList = [];

  // --- UI Toast Helper ---
  function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<i class="fa-solid ${type === 'error' ? 'fa-triangle-exclamation' : 'fa-circle-check'}"></i> ${message}`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
  }

  // --- Initialize Components ---
  const storageSidebar = new StorageSidebar('storage-drives-list', (drivePath) => {
    loadDirectory(drivePath);
  });

  const previewModal = new PreviewModal(
    'preview-modal',
    'preview-body',
    'preview-filename',
    'btn-preview-download',
    'btn-preview-close'
  );

  const fileGrid = new FileGrid('file-container', 'empty-state', {
    onOpen: (item) => {
      if (item.isDirectory) {
        loadDirectory(item.path);
      } else {
        previewModal.open(item);
      }
    },
    onSelect: (item) => {
      updateStatusBar();
    },
    onContextMenu: (e, item) => {
      contextMenu.show(e, item);
    }
  });

  const contextMenu = new ContextMenu('context-menu', (action, item) => {
    handleContextAction(action, item);
  });

  const uploadManager = new UploadManager({
    dropzoneOverlayId: 'dropzone-overlay',
    drawerId: 'upload-drawer',
    queueListId: 'upload-queue-list',
    countBadgeId: 'upload-count-badge',
    onUploadComplete: () => {
      showToast('Upload process completed');
      loadDirectory(currentPath);
    }
  });

  // --- Load Directory & Update UI ---
  async function loadDirectory(targetPath = '') {
    try {
      const data = await api.listFiles(targetPath);
      currentPath = targetPath;
      rawFilesList = data.items || [];
      
      fileGrid.setItems(rawFilesList);
      renderBreadcrumbs(targetPath);
      uploadManager.setTargetPath(targetPath);
      updateStatusBar();

    } catch (err) {
      showToast(err.message || 'Failed to load directory', 'error');
    }
  }

  // --- Breadcrumb Navigation Renderer ---
  function renderBreadcrumbs(targetPath) {
    const container = document.getElementById('breadcrumb');
    
    if (!targetPath) {
      container.innerHTML = `
        <button class="breadcrumb-item home-btn active" data-path="">
          <i class="fa-solid fa-house"></i> Storage Root
        </button>
      `;
      attachBreadcrumbListeners();
      return;
    }

    const parts = targetPath.split(/[/\\]/).filter(Boolean);
    let cumulative = '';
    let html = `
      <button class="breadcrumb-item home-btn" data-path="">
        <i class="fa-solid fa-house"></i>
      </button>
      <span class="breadcrumb-separator"><i class="fa-solid fa-chevron-right"></i></span>
    `;

    parts.forEach((part, index) => {
      cumulative += (index === 0 && targetPath.startsWith('/') ? '/' : (index === 0 ? '' : '/')) + part;
      const isLast = index === parts.length - 1;
      
      if (isLast) {
        html += `<span class="breadcrumb-current">${part}</span>`;
      } else {
        html += `
          <button class="breadcrumb-item" data-path="${cumulative}">${part}</button>
          <span class="breadcrumb-separator"><i class="fa-solid fa-chevron-right"></i></span>
        `;
      }
    });

    container.innerHTML = html;
    attachBreadcrumbListeners();
  }

  function attachBreadcrumbListeners() {
    document.querySelectorAll('.breadcrumb-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const path = btn.getAttribute('data-path');
        loadDirectory(path);
      });
    });
  }

  function updateStatusBar() {
    const totalCount = rawFilesList.length;
    document.getElementById('status-item-count').textContent = `${totalCount} items`;

    const selected = fileGrid.selectedItem;
    const selectedEl = document.getElementById('status-selected-count');
    if (selected) {
      selectedEl.textContent = `1 selected (${selected.name})`;
      selectedEl.classList.remove('hidden');
    } else {
      selectedEl.classList.add('hidden');
    }
  }

  // --- Handle Right Click Actions ---
  async function handleContextAction(action, item) {
    switch (action) {
      case 'open':
        if (item.isDirectory) loadDirectory(item.path);
        else previewModal.open(item);
        break;

      case 'preview':
        previewModal.open(item);
        break;

      case 'download':
        window.open(`/api/files/download?path=${encodeURIComponent(item.path)}`, '_blank');
        break;

      case 'share':
        try {
          const res = await api.createShareLink(item.path);
          const fullUrl = `${window.location.origin}${res.shareUrl}`;
          document.getElementById('share-url-input').value = fullUrl;
          document.getElementById('share-modal').classList.remove('hidden');
        } catch (err) {
          showToast(err.message, 'error');
        }
        break;

      case 'rename':
        const newName = prompt('Enter new name:', item.name);
        if (newName && newName !== item.name) {
          try {
            await api.renameItem(item.path, newName);
            showToast('Renamed successfully');
            loadDirectory(currentPath);
          } catch (err) {
            showToast(err.message, 'error');
          }
        }
        break;

      case 'properties':
        try {
          const props = await api.getItemProperties(item.path);
          document.getElementById('prop-name').textContent = props.name;
          document.getElementById('prop-type').textContent = props.isDirectory ? 'Directory' : props.mimeType;
          document.getElementById('prop-path').textContent = props.path;
          document.getElementById('prop-size').textContent = props.isDirectory ? fileGrid.formatBytes(props.size) : fileGrid.formatBytes(props.size);
          document.getElementById('prop-modified').textContent = new Date(props.modifiedAt).toLocaleString();
          document.getElementById('prop-permissions').textContent = props.permissions;
          document.getElementById('properties-modal').classList.remove('hidden');
        } catch (err) {
          showToast(err.message, 'error');
        }
        break;

      case 'delete':
        if (confirm(`Are you sure you want to delete "${item.name}"?`)) {
          try {
            await api.deleteItem(item.path);
            showToast('Item deleted');
            loadDirectory(currentPath);
          } catch (err) {
            showToast(err.message, 'error');
          }
        }
        break;
    }
  }

  // --- Control Bar Event Listeners ---
  document.getElementById('btn-view-grid').addEventListener('click', function() {
    document.getElementById('btn-view-list').classList.remove('active');
    this.classList.add('active');
    fileGrid.setViewMode('grid');
  });

  document.getElementById('btn-view-list').addEventListener('click', function() {
    document.getElementById('btn-view-grid').classList.remove('active');
    this.classList.add('active');
    fileGrid.setViewMode('list');
  });

  document.getElementById('btn-refresh').addEventListener('click', () => {
    loadDirectory(currentPath);
    storageSidebar.render();
  });

  // New Folder Creation
  document.getElementById('btn-new-folder').addEventListener('click', async () => {
    const name = prompt('New Folder Name:');
    if (name) {
      try {
        await api.createDirectory(currentPath, name);
        showToast('Folder created');
        loadDirectory(currentPath);
      } catch (err) {
        showToast(err.message, 'error');
      }
    }
  });

  // Upload File Picker Trigger
  const fileInput = document.getElementById('hidden-file-input');
  document.getElementById('btn-upload').addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files.length > 0) {
      uploadManager.addFilesToQueue(Array.from(e.target.files));
      fileInput.value = '';
    }
  });

  // Search Input Real-Time Filter
  const searchInput = document.getElementById('search-input');
  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase().trim();
    if (!query) {
      fileGrid.setItems(rawFilesList);
      return;
    }

    const filtered = rawFilesList.filter(item => item.name.toLowerCase().includes(query));
    fileGrid.setItems(filtered);
  });

  // Modal Closers
  document.querySelectorAll('.close-modal').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.modal-backdrop').forEach(m => m.classList.add('hidden'));
    });
  });

  document.getElementById('btn-copy-share').addEventListener('click', () => {
    const shareInput = document.getElementById('share-url-input');
    shareInput.select();
    navigator.clipboard.writeText(shareInput.value);
    showToast('Share URL copied to clipboard');
  });

  // Initial Boot
  storageSidebar.render();
  loadDirectory('');
});
