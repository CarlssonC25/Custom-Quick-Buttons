/**
 * Custom Quick Buttons - Toast Notification System
 * Renders notifications inside the Shadow DOM container.
 */

(function (window) {
  'use strict';

  class CQBToast {
    constructor(shadowRoot) {
      this.shadowRoot = shadowRoot;
      this.container = null;
      this.init();
    }

    init() {
      if (!this.shadowRoot) return;
      let c = this.shadowRoot.querySelector('.cqb-toast-container');
      if (!c) {
        c = document.createElement('div');
        c.className = 'cqb-toast-container';
        this.shadowRoot.appendChild(c);
      }
      this.container = c;
    }

    show({ message, type = 'info', duration = 3500, actionLabel = null, onAction = null }) {
      if (!this.container) this.init();
      if (!this.container) return;

      const toast = document.createElement('div');
      toast.className = `cqb-toast ${type}`;

      let icon = 'ℹ️';
      if (type === 'success') icon = '✓';
      if (type === 'error') icon = '⚠️';
      if (type === 'warning') icon = '⚡';

      const iconSpan = document.createElement('span');
      iconSpan.textContent = icon;
      toast.appendChild(iconSpan);

      const textSpan = document.createElement('span');
      textSpan.textContent = message;
      toast.appendChild(textSpan);

      if (actionLabel && typeof onAction === 'function') {
        const actionBtn = document.createElement('button');
        actionBtn.className = 'cqb-toast-action';
        actionBtn.textContent = actionLabel;
        actionBtn.onclick = (e) => {
          e.stopPropagation();
          onAction();
          this.dismiss(toast);
        };
        toast.appendChild(actionBtn);
      }

      this.container.appendChild(toast);

      if (duration > 0) {
        setTimeout(() => {
          this.dismiss(toast);
        }, duration);
      }

      return toast;
    }

    dismiss(toast) {
      if (!toast || !toast.parentNode) return;
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(20px)';
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 200);
    }

    success(message, duration = 3000) {
      return this.show({ message, type: 'success', duration });
    }

    error(message, actionLabel = null, onAction = null, duration = 5000) {
      return this.show({ message, type: 'error', duration, actionLabel, onAction });
    }

    warning(message, duration = 4000) {
      return this.show({ message, type: 'warning', duration });
    }

    info(message, duration = 3000) {
      return this.show({ message, type: 'info', duration });
    }
  }

  window.CQBToast = CQBToast;
})(typeof window !== 'undefined' ? window : this);
