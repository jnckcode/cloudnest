/**
 * @file public/js/components/storageSidebar.js
 * @description Storage sidebar component rendering mounted storage devices and disk space gauges.
 * @module StorageSidebarComponent
 * @dependencies api
 * @author Agent Architecture Directive
 */

class StorageSidebar {
  constructor(containerId, onSelectDrive) {
    this.container = document.getElementById(containerId);
    this.onSelectDrive = onSelectDrive;
  }

  async render() {
    try {
      const data = await api.getStorageDrives();
      const drives = data.drives || [];

      if (drives.length === 0) {
        this.container.innerHTML = '<div class="drive-skeleton">No mounted drives found</div>';
        return;
      }

      this.container.innerHTML = drives.map(drive => {
        const totalGB = (drive.total / (1024 ** 3)).toFixed(1);
        const freeGB = (drive.free / (1024 ** 3)).toFixed(1);
        const usedGB = (drive.used / (1024 ** 3)).toFixed(1);
        const percentage = drive.total > 0 ? Math.round((drive.used / drive.total) * 100) : 0;

        return `
          <div class="drive-card" data-path="${drive.path}">
            <div class="drive-header">
              <i class="fa-solid ${drive.type === 'media' ? 'fa-usb' : 'fa-hard-drive'}"></i>
              <span>${drive.name}</span>
            </div>
            <div class="progress-bar-track">
              <div class="progress-bar-fill" style="width: ${percentage}%"></div>
            </div>
            <div class="drive-meta">
              <span>${usedGB} GB used</span>
              <span>${freeGB} GB free</span>
            </div>
          </div>
        `;
      }).join('');

      // Add click event handlers
      this.container.querySelectorAll('.drive-card').forEach(card => {
        card.addEventListener('click', () => {
          const drivePath = card.getAttribute('data-path');
          if (this.onSelectDrive) {
            this.onSelectDrive(drivePath);
          }
        });
      });

    } catch (err) {
      this.container.innerHTML = `<div class="drive-skeleton">Error loading storage</div>`;
    }
  }
}
