/**
 * @file public/js/components/modalDialog.js
 * @description State-of-the-art Glassmorphic Modal, Alert, Confirm, and Prompt dialog manager with smooth animations and keyboard accessibility.
 * @module ModalDialog
 * @dependencies none (pure vanilla JS & DOM)
 * @author Agent Architecture Directive
 */

class ModalDialogManager {
  constructor() {
    this.activeDialog = null;
    this.keyHandler = this.handleKeyDown.bind(this);
  }

  /**
   * Safe HTML escaping utility
   */
  escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  /**
   * Helper to ensure dialog container is created
   */
  getOrCreateContainer() {
    let container = document.getElementById('custom-dialog-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'custom-dialog-container';
      document.body.appendChild(container);
    }
    return container;
  }

  /**
   * Displays a customizable Confirmation Dialog
   * @param {Object} options
   * @param {string} options.title - Dialog title
   * @param {string} options.message - Dialog message (HTML allowed)
   * @param {string} [options.icon='fa-circle-question'] - FontAwesome icon class
   * @param {string} [options.confirmText='Confirm'] - Confirm button text
   * @param {string} [options.confirmIcon='fa-check'] - Confirm button icon
   * @param {string} [options.cancelText='Cancel'] - Cancel button text
   * @param {boolean} [options.danger=false] - Whether this is a destructive action
   * @returns {Promise<boolean>} Resolves to true if confirmed, false otherwise
   */
  confirm({
    title = 'Confirm Action',
    message = 'Are you sure you want to proceed?',
    icon = 'fa-circle-question',
    confirmText = 'Confirm',
    confirmIcon = 'fa-check',
    cancelText = 'Cancel',
    danger = false
  } = {}) {
    return new Promise((resolve) => {
      this.closeActive(false);

      const container = this.getOrCreateContainer();
      const backdrop = document.createElement('div');
      backdrop.className = 'modal-backdrop custom-dialog-backdrop';

      const iconBgClass = danger ? 'icon-danger' : 'icon-primary';
      const confirmBtnClass = danger ? 'btn-danger' : 'btn-primary';

      backdrop.innerHTML = `
        <div class="modal-dialog custom-dialog-card ${danger ? 'dialog-danger' : ''}" role="dialog" aria-modal="true">
          <div class="custom-dialog-body">
            <div class="custom-dialog-icon-wrapper ${iconBgClass}">
              <i class="fa-solid ${icon}"></i>
            </div>
            <div class="custom-dialog-content">
              <h3 class="custom-dialog-title">${this.escapeHtml(title)}</h3>
              <div class="custom-dialog-message">${message}</div>
            </div>
          </div>
          <div class="modal-footer custom-dialog-footer">
            <button type="button" class="btn btn-secondary btn-dialog-cancel">
              <span>${this.escapeHtml(cancelText)}</span>
            </button>
            <button type="button" class="btn ${confirmBtnClass} btn-dialog-confirm">
              <i class="fa-solid ${confirmIcon}"></i>
              <span>${this.escapeHtml(confirmText)}</span>
            </button>
          </div>
        </div>
      `;

      container.appendChild(backdrop);

      const cancelBtn = backdrop.querySelector('.btn-dialog-cancel');
      const confirmBtn = backdrop.querySelector('.btn-dialog-confirm');

      const cleanup = (result) => {
        backdrop.classList.add('dialog-closing');
        document.removeEventListener('keydown', this.keyHandler);
        backdrop.addEventListener('animationend', () => {
          backdrop.remove();
        }, { once: true });
        // Fallback removal in case animations are disabled
        setTimeout(() => backdrop.remove(), 250);
        this.activeDialog = null;
        resolve(result);
      };

      this.activeDialog = {
        element: backdrop,
        onConfirm: () => cleanup(true),
        onCancel: () => cleanup(false)
      };

      cancelBtn.addEventListener('click', () => cleanup(false));
      confirmBtn.addEventListener('click', () => cleanup(true));
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) cleanup(false);
      });

      document.addEventListener('keydown', this.keyHandler);
      
      // Auto-focus confirm or cancel button
      setTimeout(() => {
        if (danger) {
          cancelBtn.focus();
        } else {
          confirmBtn.focus();
        }
      }, 50);
    });
  }

  /**
   * Displays an interactive Input Prompt Dialog
   * @param {Object} options
   * @param {string} options.title - Dialog title
   * @param {string} options.message - Dialog instruction/message
   * @param {string} [options.defaultValue=''] - Default input value
   * @param {string} [options.placeholder=''] - Input placeholder
   * @param {string} [options.icon='fa-pen-to-square'] - Header icon
   * @param {string} [options.confirmText='Submit'] - Confirm button text
   * @param {string} [options.confirmIcon='fa-check'] - Confirm button icon
   * @param {string} [options.cancelText='Cancel'] - Cancel button text
   * @param {string} [options.inputType='text'] - Input type (text, password, etc.)
   * @param {Function} [options.validator=null] - Validation callback returning error string or null
   * @returns {Promise<string|null>} Resolves with the input string or null if cancelled
   */
  prompt({
    title = 'Input Required',
    message = 'Please enter a value:',
    defaultValue = '',
    placeholder = '',
    icon = 'fa-pen-to-square',
    confirmText = 'Save',
    confirmIcon = 'fa-check',
    cancelText = 'Cancel',
    inputType = 'text',
    validator = null
  } = {}) {
    return new Promise((resolve) => {
      this.closeActive(null);

      const container = this.getOrCreateContainer();
      const backdrop = document.createElement('div');
      backdrop.className = 'modal-backdrop custom-dialog-backdrop';

      backdrop.innerHTML = `
        <div class="modal-dialog custom-dialog-card" role="dialog" aria-modal="true">
          <form class="custom-prompt-form" autocomplete="off">
            <div class="custom-dialog-body">
              <div class="custom-dialog-icon-wrapper icon-primary">
                <i class="fa-solid ${icon}"></i>
              </div>
              <div class="custom-dialog-content" style="width: 100%;">
                <h3 class="custom-dialog-title">${this.escapeHtml(title)}</h3>
                <div class="custom-dialog-message">${message}</div>
                <div class="custom-dialog-input-wrap">
                  <input
                    type="${inputType}"
                    class="custom-dialog-input"
                    placeholder="${this.escapeHtml(placeholder)}"
                    value="${this.escapeHtml(defaultValue)}"
                    spellcheck="false"
                  />
                  <div class="custom-dialog-error hidden"></div>
                </div>
              </div>
            </div>
            <div class="modal-footer custom-dialog-footer">
              <button type="button" class="btn btn-secondary btn-dialog-cancel">
                <span>${this.escapeHtml(cancelText)}</span>
              </button>
              <button type="submit" class="btn btn-primary btn-dialog-confirm">
                <i class="fa-solid ${confirmIcon}"></i>
                <span>${this.escapeHtml(confirmText)}</span>
              </button>
            </div>
          </form>
        </div>
      `;

      container.appendChild(backdrop);

      const form = backdrop.querySelector('.custom-prompt-form');
      const input = backdrop.querySelector('.custom-dialog-input');
      const errorEl = backdrop.querySelector('.custom-dialog-error');
      const cancelBtn = backdrop.querySelector('.btn-dialog-cancel');

      const cleanup = (result) => {
        backdrop.classList.add('dialog-closing');
        document.removeEventListener('keydown', this.keyHandler);
        backdrop.addEventListener('animationend', () => {
          backdrop.remove();
        }, { once: true });
        setTimeout(() => backdrop.remove(), 250);
        this.activeDialog = null;
        resolve(result);
      };

      const submitValue = () => {
        const value = input.value;
        if (validator && typeof validator === 'function') {
          const errorMsg = validator(value);
          if (errorMsg) {
            errorEl.textContent = errorMsg;
            errorEl.classList.remove('hidden');
            input.classList.add('input-invalid');
            input.focus();
            return;
          }
        }
        cleanup(value);
      };

      this.activeDialog = {
        element: backdrop,
        onConfirm: submitValue,
        onCancel: () => cleanup(null)
      };

      form.addEventListener('submit', (e) => {
        e.preventDefault();
        submitValue();
      });

      input.addEventListener('input', () => {
        errorEl.classList.add('hidden');
        input.classList.remove('input-invalid');
      });

      cancelBtn.addEventListener('click', () => cleanup(null));
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) cleanup(null);
      });

      document.addEventListener('keydown', this.keyHandler);

      // Auto-focus and select all text
      setTimeout(() => {
        input.focus();
        input.select();
      }, 50);
    });
  }

  /**
   * Displays an informative Alert Dialog
   * @param {Object} options
   * @param {string} options.title - Dialog title
   * @param {string} options.message - Dialog message
   * @param {string} [options.icon='fa-circle-info'] - Icon class
   * @param {string} [options.confirmText='OK'] - Dismiss button text
   * @param {string} [options.type='info'] - 'info' | 'error' | 'success' | 'warning'
   * @returns {Promise<void>} Resolves when dismissed
   */
  alert({
    title = 'Notice',
    message = '',
    icon = 'fa-circle-info',
    confirmText = 'OK',
    type = 'info'
  } = {}) {
    return new Promise((resolve) => {
      this.closeActive();

      const container = this.getOrCreateContainer();
      const backdrop = document.createElement('div');
      backdrop.className = 'modal-backdrop custom-dialog-backdrop';

      let iconClass = 'icon-primary';
      let iconName = icon;
      if (type === 'error') {
        iconClass = 'icon-danger';
        iconName = iconName === 'fa-circle-info' ? 'fa-circle-xmark' : iconName;
      } else if (type === 'success') {
        iconClass = 'icon-success';
        iconName = iconName === 'fa-circle-info' ? 'fa-circle-check' : iconName;
      } else if (type === 'warning') {
        iconClass = 'icon-warning';
        iconName = iconName === 'fa-circle-info' ? 'fa-triangle-exclamation' : iconName;
      }

      backdrop.innerHTML = `
        <div class="modal-dialog custom-dialog-card" role="dialog" aria-modal="true">
          <div class="custom-dialog-body">
            <div class="custom-dialog-icon-wrapper ${iconClass}">
              <i class="fa-solid ${iconName}"></i>
            </div>
            <div class="custom-dialog-content">
              <h3 class="custom-dialog-title">${this.escapeHtml(title)}</h3>
              <div class="custom-dialog-message">${message}</div>
            </div>
          </div>
          <div class="modal-footer custom-dialog-footer">
            <button type="button" class="btn btn-primary btn-dialog-confirm">
              <span>${this.escapeHtml(confirmText)}</span>
            </button>
          </div>
        </div>
      `;

      container.appendChild(backdrop);

      const confirmBtn = backdrop.querySelector('.btn-dialog-confirm');

      const cleanup = () => {
        backdrop.classList.add('dialog-closing');
        document.removeEventListener('keydown', this.keyHandler);
        backdrop.addEventListener('animationend', () => {
          backdrop.remove();
        }, { once: true });
        setTimeout(() => backdrop.remove(), 250);
        this.activeDialog = null;
        resolve();
      };

      this.activeDialog = {
        element: backdrop,
        onConfirm: cleanup,
        onCancel: cleanup
      };

      confirmBtn.addEventListener('click', cleanup);
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) cleanup();
      });

      document.addEventListener('keydown', this.keyHandler);
      setTimeout(() => confirmBtn.focus(), 50);
    });
  }

  handleKeyDown(e) {
    if (!this.activeDialog) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      this.activeDialog.onCancel();
    }
  }

  closeActive(returnValue = null) {
    if (this.activeDialog) {
      this.activeDialog.onCancel();
      this.activeDialog = null;
    }
  }
}

// Global Singleton Instance
const ModalDialog = new ModalDialogManager();
