/**
 * Custom Quick Buttons - Drag & Drop Engine
 * Supports smooth mouse & touch reordering of buttons inside the floating toolbar.
 */

(function (window) {
  'use strict';

  class CQBDragDrop {
    constructor({ container, onReorder }) {
      this.container = container;
      this.onReorder = onReorder;

      this.draggedElement = null;
      this.draggedButtonId = null;
      this.isDragging = false;
      this.startX = 0;
      this.startY = 0;
      this.threshold = 5;
      this.hasExceededThreshold = false;
      this.activePointerId = null;

      this.onPointerDown = this.onPointerDown.bind(this);
      this.onPointerMove = this.onPointerMove.bind(this);
      this.onPointerUp = this.onPointerUp.bind(this);
      this.onPointerCancel = this.onPointerCancel.bind(this);

      this.attach();
    }

    attach() {
      if (!this.container) return;
      this.container.addEventListener('pointerdown', this.onPointerDown, { passive: false });
    }

    detach() {
      if (!this.container) return;
      this.container.removeEventListener('pointerdown', this.onPointerDown);
      this.cleanup();
    }

    onPointerDown(e) {
      // Only primary mouse button (button 0) or touch
      if (e.button !== 0 && e.pointerType === 'mouse') return;

      const btn = e.target.closest('.cqb-custom-btn');
      if (!btn || btn.classList.contains('cqb-btn-add')) return;

      this.draggedElement = btn;
      this.draggedButtonId = btn.dataset.id;
      this.startX = e.clientX;
      this.startY = e.clientY;
      this.isDragging = false;
      this.hasExceededThreshold = false;
      this.activePointerId = e.pointerId;

      // Listen on WINDOW with capture: true so releasing or moving anywhere on the screen is always caught!
      window.addEventListener('pointermove', this.onPointerMove, { capture: true, passive: false });
      window.addEventListener('pointerup', this.onPointerUp, { capture: true, passive: false });
      window.addEventListener('pointercancel', this.onPointerCancel, { capture: true, passive: false });
    }

    onPointerMove(e) {
      if (!this.draggedElement) return;

      const dx = Math.abs(e.clientX - this.startX);
      const dy = Math.abs(e.clientY - this.startY);

      if (!this.hasExceededThreshold && (dx > this.threshold || dy > this.threshold)) {
        this.hasExceededThreshold = true;
        this.isDragging = true;
        this.draggedElement.classList.add('cqb-dragging');
      }

      if (!this.isDragging) return;

      // Prevent default page scroll or text selection during drag
      e.preventDefault();

      // Find which element the dragged element should be placed before
      const otherButtons = Array.from(
        this.container.querySelectorAll('.cqb-custom-btn:not(.cqb-btn-add)')
      ).filter(btn => btn !== this.draggedElement);

      if (otherButtons.length === 0) return;

      let insertBeforeElement = null;

      for (const btn of otherButtons) {
        const rect = btn.getBoundingClientRect();
        const midX = rect.left + rect.width / 2;

        if (e.clientX < midX) {
          insertBeforeElement = btn;
          break;
        }
      }

      if (insertBeforeElement) {
        // Insert before the identified sibling
        if (this.draggedElement.nextElementSibling !== insertBeforeElement) {
          this.container.insertBefore(this.draggedElement, insertBeforeElement);
        }
      } else {
        // Cursor is beyond the midpoint of all buttons: place at the very right (end)
        if (this.draggedElement.nextElementSibling !== null) {
          this.container.appendChild(this.draggedElement);
        }
      }
    }

    onPointerUp(e) {
      if (!this.draggedElement) {
        this.cleanup();
        return;
      }

      const wasDragging = this.isDragging;
      const el = this.draggedElement;

      this.cleanup();

      if (wasDragging) {
        e.preventDefault();
        e.stopPropagation();

        // Suppress any accidental click trigger on the dragged button
        const preventClickHandler = (clickEvt) => {
          clickEvt.preventDefault();
          clickEvt.stopPropagation();
          clickEvt.stopImmediatePropagation();
        };
        el.addEventListener('click', preventClickHandler, { capture: true, once: true });
        setTimeout(() => {
          el.removeEventListener('click', preventClickHandler, { capture: true });
        }, 150);

        // Commit new order to storage
        const items = Array.from(this.container.querySelectorAll('.cqb-custom-btn:not(.cqb-btn-add)'));
        const orderedIds = items.map(item => item.dataset.id).filter(Boolean);

        if (typeof this.onReorder === 'function') {
          this.onReorder(orderedIds);
        }
      }
    }

    onPointerCancel(e) {
      this.cleanup();
    }

    cleanup() {
      window.removeEventListener('pointermove', this.onPointerMove, { capture: true });
      window.removeEventListener('pointerup', this.onPointerUp, { capture: true });
      window.removeEventListener('pointercancel', this.onPointerCancel, { capture: true });

      if (this.draggedElement) {
        this.draggedElement.classList.remove('cqb-dragging');
      }

      this.draggedElement = null;
      this.draggedButtonId = null;
      this.isDragging = false;
      this.hasExceededThreshold = false;
      this.activePointerId = null;
    }
  }

  window.CQBDragDrop = CQBDragDrop;
})(typeof window !== 'undefined' ? window : this);
