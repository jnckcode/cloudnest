/**
 * @file public/js/components/contextMenu.js
 * @description Dynamic custom right-click context menu positioning and action handler.
 * @module ContextMenuComponent
 * @dependencies none
 * @author Agent Architecture Directive
 */

class ContextMenu {
  constructor(menuId, onAction) {
    this.menu = document.getElementById(menuId);
    this.onAction = onAction;
    this.activeItem = null;

    // Global listener to hide menu on outside click or scroll
    document.addEventListener('click', () => this.hide());
    document.addEventListener('scroll', () => this.hide(), true);
    
    // Attach action click handler
    this.menu.querySelectorAll('li[data-action]').forEach(li => {
      li.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = li.getAttribute('data-action');
        if (this.onAction && this.activeItem) {
          this.onAction(action, this.activeItem);
        }
        this.hide();
      });
    });
  }

  show(event, item) {
    this.activeItem = item;
    this.menu.classList.remove('hidden');

    const menuWidth = this.menu.offsetWidth || 180;
    const menuHeight = this.menu.offsetHeight || 220;

    let posX = event.pageX;
    let posY = event.pageY;

    // Adjust position if overflowing viewport boundaries
    if (posX + menuWidth > window.innerWidth) {
      posX = window.innerWidth - menuWidth - 10;
    }
    if (posY + menuHeight > window.innerHeight) {
      posY = window.innerHeight - menuHeight - 10;
    }

    this.menu.style.left = `${posX}px`;
    this.menu.style.top = `${posY}px`;
  }

  hide() {
    this.menu.classList.add('hidden');
    this.activeItem = null;
  }
}
