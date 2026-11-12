/**
 * Custom Quick Buttons - Context Menu System
 * Provides an encapsulated context menu when right-clicking custom buttons inside the toolbar.
 */

(function (window) {
  'use strict';

  class CQBContextMenu {
    constructor(shadowRoot, handlers) {
      this.shadowRoot = shadowRoot;
      this.handlers = handlers || {};
      this.activeMenu = null;
      this.currentButton = null;
      this.outsideClickListener = null;
      this.keydownListener = null;
    }

    show(x, y, buttonData) {
      this.close();
      this.currentButton = buttonData;

      const menu = document.createElement('div');
      menu.className = 'cqb-context-menu';

      const isWhiteText = (buttonData.textColor || '#ffffff').toLowerCase() === '#ffffff';

      // Items strictly fulfilling requirement 6
      const items = [
        {
          id: 'edit',
          label: 'Button bearbeiten',
          icon: '✏️',
          action: () => this.handlers.onEdit && this.handlers.onEdit(buttonData, 'all')
        },
        {
          id: 'change-text',
          label: 'Text ändern...',
          icon: '🔤',
          action: () => this.handlers.onEdit && this.handlers.onEdit(buttonData, 'label')
        },
        {
          id: 'toggle-text-color',
          label: `Textfarbe: ${isWhiteText ? 'Auf Schwarz wechseln' : 'Auf Weiß wechseln'}`,
          icon: isWhiteText ? '⚫' : '⚪',
          action: () => this.handlers.onToggleTextColor && this.handlers.onToggleTextColor(buttonData)
        },
        {
          id: 'change-bg-color',
          label: 'Hintergrundfarbe ändern...',
          icon: '🎨',
          action: () => this.handlers.onEdit && this.handlers.onEdit(buttonData, 'bgcolor')
        },
        {
          id: 'change-function',
          label: 'Funktion ändern (Original wählen)',
          icon: '🎯',
          action: () => this.handlers.onReassign && this.handlers.onReassign(buttonData)
        },
        { type: 'separator' },
        {
          id: 'duplicate',
          label: 'Button duplizieren',
          icon: '📋',
          action: () => this.handlers.onDuplicate && this.handlers.onDuplicate(buttonData)
        },
        {
          id: 'delete',
          label: 'Button löschen',
          icon: '🗑️',
          danger: true,
          action: () => this.handlers.onDelete && this.handlers.onDelete(buttonData)
        }
      ];

      items.forEach(item => {
        if (item.type === 'separator') {
          const sep = document.createElement('div');
          sep.className = 'cqb-menu-separator';
          menu.appendChild(sep);
          return;
        }

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `cqb-menu-item ${item.danger ? 'danger' : ''}`;
        btn.innerHTML = `
          <span class="cqb-menu-icon">${item.icon}</span>
          <span>${item.label}</span>
        `;

        btn.onclick = (e) => {
          e.stopPropagation();
          this.close();
          item.action();
        };

        menu.appendChild(btn);
      });

      this.shadowRoot.appendChild(menu);
      this.activeMenu = menu;

      // Viewport bounds detection
      const menuRect = menu.getBoundingClientRect();
      const winW = window.innerWidth;
      const winH = window.innerHeight;

      let posX = x;
      let posY = y;

      if (posX + menuRect.width > winW - 12) {
        posX = winW - menuRect.width - 12;
      }
      if (posY + menuRect.height > winH - 12) {
        posY = winH - menuRect.height - 12;
      }

      menu.style.left = `${Math.max(10, posX)}px`;
      menu.style.top = `${Math.max(10, posY)}px`;

      // Outside click listener
      setTimeout(() => {
        this.outsideClickListener = (e) => {
          const path = e.composedPath ? e.composedPath() : [];
          if (!menu.contains(e.target) && !path.includes(menu)) {
            this.close();
          }
        };
        this.keydownListener = (e) => {
          if (e.key === 'Escape') {
            this.close();
          }
        };
        window.addEventListener('pointerdown', this.outsideClickListener, { capture: true, once: true });
        window.addEventListener('keydown', this.keydownListener, { once: true });
      }, 20);
    }

    close() {
      if (this.activeMenu && this.activeMenu.parentNode) {
        this.activeMenu.parentNode.removeChild(this.activeMenu);
      }
      this.activeMenu = null;
      this.currentButton = null;
      if (this.outsideClickListener) {
        window.removeEventListener('pointerdown', this.outsideClickListener, { capture: true });
        this.outsideClickListener = null;
      }
      if (this.keydownListener) {
        window.removeEventListener('keydown', this.keydownListener);
        this.keydownListener = null;
      }
    }
  }

  window.CQBContextMenu = CQBContextMenu;
})(typeof window !== 'undefined' ? window : this);
