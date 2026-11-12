/**
 * Custom Quick Buttons - Floating Toolbar Component
 * Manages the floating bar pinned at bottom-left, its drag-handle, collapse state, and button rendering.
 */

(function (window) {
  'use strict';

  class CQBToolbar {
    constructor({ shadowRoot, siteData, onAdd, onClick, onContextMenu, onPositionChange, onCollapseChange, onReorder }) {
      this.shadowRoot = shadowRoot;
      this.siteData = siteData;
      this.onAdd = onAdd;
      this.onClick = onClick;
      this.onContextMenu = onContextMenu;
      this.onPositionChange = onPositionChange;
      this.onCollapseChange = onCollapseChange;
      this.onReorder = onReorder;

      this.wrapper = null;
      this.toolbarEl = null;
      this.buttonsContainer = null;
      this.addBtn = null;
      this.collapseBtn = null;
      this.dragHandle = null;
      this.dragDropEngine = null;

      // Toolbar repositioning state
      this.isRepositioning = false;
      this.repositionOffset = { x: 0, y: 0 };

      this.init();
    }

    init() {
      this.wrapper = document.createElement('div');
      this.wrapper.className = 'cqb-toolbar-wrapper';

      this.toolbarEl = document.createElement('div');
      this.toolbarEl.className = 'cqb-toolbar';

      // 1. Drag Handle
      this.dragHandle = document.createElement('div');
      this.dragHandle.className = 'cqb-drag-handle';
      this.dragHandle.title = 'Leiste verschieben';
      this.dragHandle.innerHTML = `
        <svg viewBox="0 0 24 24">
          <circle cx="9" cy="6" r="1.5"/>
          <circle cx="15" cy="6" r="1.5"/>
          <circle cx="9" cy="12" r="1.5"/>
          <circle cx="15" cy="12" r="1.5"/>
          <circle cx="9" cy="18" r="1.5"/>
          <circle cx="15" cy="18" r="1.5"/>
        </svg>
      `;

      // 2. Collapse Toggle
      this.collapseBtn = document.createElement('button');
      this.collapseBtn.type = 'button';
      this.collapseBtn.className = 'cqb-btn-collapse';
      this.collapseBtn.title = 'Minimieren / Ausklappen';
      this.collapseBtn.innerHTML = `
        <svg viewBox="0 0 24 24">
          <polyline points="15 18 9 12 15 6"></polyline>
        </svg>
      `;

      // 3. Collapsed label
      const collapsedLabel = document.createElement('span');
      collapsedLabel.className = 'cqb-collapsed-indicator';
      collapsedLabel.textContent = '⚡ Quick Buttons';
      collapsedLabel.onclick = () => this.toggleCollapse();

      // 4. Buttons Container
      this.buttonsContainer = document.createElement('div');
      this.buttonsContainer.className = 'cqb-toolbar-buttons';

      // 5. Always-present Plus (+) Button
      this.addBtn = document.createElement('button');
      this.addBtn.type = 'button';
      this.addBtn.className = 'cqb-btn-add';
      this.addBtn.title = 'Neuen Quick Button erstellen (+)';
      this.addBtn.innerHTML = `
        <svg viewBox="0 0 24 24">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
      `;
      this.addBtn.onclick = (e) => {
        e.stopPropagation();
        if (typeof this.onAdd === 'function') {
          this.onAdd();
        }
      };

      // Assemble
      this.toolbarEl.appendChild(this.dragHandle);
      this.toolbarEl.appendChild(this.collapseBtn);
      this.toolbarEl.appendChild(collapsedLabel);
      this.toolbarEl.appendChild(this.buttonsContainer);
      this.toolbarEl.appendChild(this.addBtn);
      this.wrapper.appendChild(this.toolbarEl);
      this.shadowRoot.appendChild(this.wrapper);

      // Event bindings
      this.bindRepositionEvents();
      this.collapseBtn.onclick = (e) => {
        e.stopPropagation();
        this.toggleCollapse();
      };

      // Initialize Drag & Drop for reordering buttons
      this.dragDropEngine = new CQBDragDrop({
        container: this.buttonsContainer,
        onReorder: (newIds) => {
          if (typeof this.onReorder === 'function') {
            this.onReorder(newIds);
          }
        }
      });

      // Apply initial state
      this.applyPosition();
      this.applyCollapsedState();
      this.renderButtons();
    }

    applyPosition() {
      const pos = this.siteData.position;
      if (pos && pos.isCustom && pos.x !== null && pos.y !== null) {
        // Custom saved position
        this.wrapper.style.left = `${pos.x}px`;
        this.wrapper.style.top = `${pos.y}px`;
        this.wrapper.style.bottom = 'auto';
        this.wrapper.style.right = 'auto';
      } else {
        // Strict default: Bottom-Left (24px from bottom, 24px from left)
        this.wrapper.style.left = '24px';
        this.wrapper.style.bottom = '24px';
        this.wrapper.style.top = 'auto';
        this.wrapper.style.right = 'auto';
      }
    }

    applyCollapsedState() {
      if (this.siteData.collapsed) {
        this.wrapper.classList.add('collapsed');
      } else {
        this.wrapper.classList.remove('collapsed');
      }
    }

    toggleCollapse() {
      const isCollapsed = !this.wrapper.classList.contains('collapsed');
      this.siteData.collapsed = isCollapsed;
      this.applyCollapsedState();
      if (typeof this.onCollapseChange === 'function') {
        this.onCollapseChange(isCollapsed);
      }
    }

    renderButtons(buttons) {
      if (buttons) {
        this.siteData.buttons = buttons;
      }
      this.buttonsContainer.innerHTML = '';

      const list = (this.siteData.buttons || []).slice().sort((a, b) => (a.order || 0) - (b.order || 0));

      list.forEach((btnData) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'cqb-custom-btn';
        btn.dataset.id = btnData.id;
        btn.textContent = btnData.label || btnData.name || 'Button';
        btn.style.backgroundColor = btnData.bgColor || '#3b82f6';
        btn.style.color = btnData.textColor || '#ffffff';

        // Tooltip if description is present
        if (btnData.description) {
          btn.classList.add('cqb-has-tooltip');
          const tip = document.createElement('span');
          tip.className = 'cqb-tooltip';
          tip.textContent = btnData.description;
          btn.appendChild(tip);
        }

        // Left-click execution
        btn.onclick = (e) => {
          e.stopPropagation();
          // Check if dragging was performed
          if (btn.classList.contains('cqb-dragging') || this.dragDropEngine.hasExceededThreshold || this.dragDropEngine.isDragging) {
            return;
          }
          if (typeof this.onClick === 'function') {
            this.onClick(btnData);
          }
        };

        // Right-click context menu
        btn.oncontextmenu = (e) => {
          e.preventDefault();
          e.stopPropagation();
          if (typeof this.onContextMenu === 'function') {
            this.onContextMenu(btnData, e.clientX, e.clientY);
          }
        };

        this.buttonsContainer.appendChild(btn);
      });
    }

    bindRepositionEvents() {
      const handle = this.dragHandle;

      const onPointerDown = (e) => {
        if (e.button !== 0 && e.pointerType === 'mouse') return;
        this.isRepositioning = true;
        const rect = this.wrapper.getBoundingClientRect();
        this.repositionOffset = {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top
        };

        try {
          handle.setPointerCapture(e.pointerId);
        } catch (err) {}

        const onPointerMove = (moveEvt) => {
          if (!this.isRepositioning) return;
          moveEvt.preventDefault();

          let newX = moveEvt.clientX - this.repositionOffset.x;
          let newY = moveEvt.clientY - this.repositionOffset.y;

          // Viewport boundary clamping
          const winW = window.innerWidth;
          const winH = window.innerHeight;
          const barW = this.wrapper.offsetWidth;
          const barH = this.wrapper.offsetHeight;

          newX = Math.max(10, Math.min(newX, winW - barW - 10));
          newY = Math.max(10, Math.min(newY, winH - barH - 10));

          this.wrapper.style.left = `${newX}px`;
          this.wrapper.style.top = `${newY}px`;
          this.wrapper.style.bottom = 'auto';
          this.wrapper.style.right = 'auto';
        };

        const onPointerUp = (upEvt) => {
          if (!this.isRepositioning) return;
          this.isRepositioning = false;

          try {
            handle.releasePointerCapture(upEvt.pointerId);
          } catch (err) {}

          window.removeEventListener('pointermove', onPointerMove);
          window.removeEventListener('pointerup', onPointerUp);
          window.removeEventListener('pointercancel', onPointerUp);

          const finalRect = this.wrapper.getBoundingClientRect();
          const newPos = {
            x: Math.round(finalRect.left),
            y: Math.round(finalRect.top),
            isCustom: true
          };

          this.siteData.position = newPos;
          if (typeof this.onPositionChange === 'function') {
            this.onPositionChange(newPos);
          }
        };

        window.addEventListener('pointermove', onPointerMove, { passive: false });
        window.addEventListener('pointerup', onPointerUp, { passive: false });
        window.addEventListener('pointercancel', onPointerUp, { passive: false });
      };

      handle.addEventListener('pointerdown', onPointerDown);
    }

    resetPositionToDefault() {
      this.siteData.position = { x: null, y: null, isCustom: false };
      this.applyPosition();
      if (typeof this.onPositionChange === 'function') {
        this.onPositionChange(this.siteData.position);
      }
    }

    destroy() {
      if (this.dragDropEngine) {
        this.dragDropEngine.detach();
      }
      if (this.wrapper && this.wrapper.parentNode) {
        this.wrapper.parentNode.removeChild(this.wrapper);
      }
    }
  }

  window.CQBToolbar = CQBToolbar;
})(typeof window !== 'undefined' ? window : this);
