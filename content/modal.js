/**
 * Custom Quick Buttons - Button Editor & Creation Modal
 * Displays an encapsulated dialog inside the Shadow DOM with live preview, color pickers, and website hotkey isolation.
 */

(function (window) {
  'use strict';

  const PRESET_BG_COLORS = [
    '#4f46e5', // Indigo
    '#2563eb', // Blue
    '#059669', // Emerald
    '#d97706', // Amber
    '#e11d48', // Rose
    '#7c3aed', // Purple
    '#27272a', // Anthracite / Zinc
    '#0f172a'  // Dark Slate
  ];

  class CQBModal {
    constructor(shadowRoot, inspector) {
      this.shadowRoot = shadowRoot;
      this.inspector = inspector;
      this.activeModal = null;
      this.currentData = null;
      this.isEditing = false;
      this.focusTarget = 'all';
      this.onSaveCallback = null;
      this.globalKeyInterceptor = null;
    }

    /**
     * Opens modal for creating a new button or editing an existing one
     */
    open({ buttonData = null, focusTarget = 'all', onSave }) {
      this.close();
      this.isEditing = !!buttonData;
      this.focusTarget = focusTarget;
      this.onSaveCallback = onSave;

      this.currentData = buttonData ? JSON.parse(JSON.stringify(buttonData)) : {
        id: null,
        name: 'Neuer Button',
        label: 'Button',
        textColor: '#ffffff',
        bgColor: '#4f46e5',
        description: '',
        action: null
      };

      this.render();
    }

    render() {
      const backdrop = document.createElement('div');
      backdrop.className = 'cqb-modal-backdrop';

      const modal = document.createElement('div');
      modal.className = 'cqb-modal';

      modal.innerHTML = `
        <div class="cqb-modal-header">
          <div class="cqb-modal-title">
            <span>${this.isEditing ? '✏️ Button bearbeiten' : '➕ Neuer Quick Button'}</span>
          </div>
          <button type="button" class="cqb-modal-close" title="Schließen">&times;</button>
        </div>

        <div class="cqb-modal-body">
          <div class="cqb-form-group">
            <label class="cqb-label">Button-Text</label>
            <input type="text" class="cqb-input" id="cqb-input-label" placeholder="z. B. Speichern" value="${this.escapeHtml(this.currentData.label || this.currentData.name || '')}">
          </div>

          <div class="cqb-form-group">
            <label class="cqb-label">Textfarbe</label>
            <div class="cqb-text-color-toggle">
              <button type="button" class="cqb-text-color-btn ${this.currentData.textColor === '#ffffff' ? 'active' : ''}" data-color="#ffffff">Weiß</button>
              <button type="button" class="cqb-text-color-btn ${this.currentData.textColor === '#111111' ? 'active' : ''}" data-color="#111111">Schwarz</button>
            </div>
          </div>

          <div class="cqb-form-group">
            <label class="cqb-label">Hintergrundfarbe</label>
            <div class="cqb-color-row">
              ${PRESET_BG_COLORS.map(color => `
                <div class="cqb-color-swatch ${this.currentData.bgColor.toLowerCase() === color.toLowerCase() ? 'active' : ''}"
                     style="background-color: ${color};"
                     data-color="${color}"></div>
              `).join('')}
              <input type="color" class="cqb-native-color-picker" id="cqb-input-bg-native" value="${this.currentData.bgColor}" title="Eigene Farbe wählen">
            </div>
          </div>

          <div class="cqb-form-group">
            <label class="cqb-label">Funktion des Original-Buttons übernehmen</label>
            <div class="cqb-function-box">
              <div class="cqb-function-status" id="cqb-func-status">
                ${this.currentData.action && this.currentData.action.selectorData
                  ? '<span style="color: #34d399;">✓ Original-Element zugeordnet</span>'
                  : '<span>⚠️ Noch keine Original-Aktion zugewiesen</span>'
                }
              </div>
              <div class="cqb-target-info" id="cqb-target-info" style="${this.currentData.action && this.currentData.action.selectorData ? '' : 'display: none;'}">
                ${this.formatSelectorSummary(this.currentData.action && this.currentData.action.selectorData)}
              </div>
              <div style="display: flex; gap: 8px;">
                <button type="button" class="cqb-btn-assign" id="cqb-btn-pick-element">
                  🎯 Element auf Webseite auswählen
                </button>
                <button type="button" class="cqb-btn-secondary" id="cqb-btn-clear-element" style="${this.currentData.action && this.currentData.action.selectorData ? '' : 'display: none;'}; font-size: 11px; padding: 4px 8px;">
                  Zurücksetzen
                </button>
              </div>
            </div>
          </div>

          <div class="cqb-form-group">
            <label class="cqb-label">Beschreibung / Tooltip (optional)</label>
            <input type="text" class="cqb-input" id="cqb-input-desc" placeholder="Erklärung bei Mausberührung" value="${this.escapeHtml(this.currentData.description || '')}">
          </div>

          <!-- Live Preview -->
          <div class="cqb-preview-container">
            <div class="cqb-preview-label">Live-Vorschau</div>
            <button type="button" class="cqb-custom-btn" id="cqb-preview-btn" style="background-color: ${this.currentData.bgColor}; color: ${this.currentData.textColor};">
              ${this.escapeHtml(this.currentData.label || 'Vorschau')}
            </button>
          </div>
        </div>

        <div class="cqb-modal-footer">
          <button type="button" class="cqb-btn-secondary" id="cqb-btn-cancel">Abbrechen</button>
          <button type="button" class="cqb-btn-primary" id="cqb-btn-save">Speichern</button>
        </div>
      `;

      backdrop.appendChild(modal);
      this.shadowRoot.appendChild(backdrop);
      this.activeModal = backdrop;

      this.bindEvents(backdrop);
    }

    bindEvents(backdrop) {
      const labelInput = backdrop.querySelector('#cqb-input-label');
      const descInput = backdrop.querySelector('#cqb-input-desc');
      const previewBtn = backdrop.querySelector('#cqb-preview-btn');
      const nativeColor = backdrop.querySelector('#cqb-input-bg-native');
      const closeBtn = backdrop.querySelector('.cqb-modal-close');
      const cancelBtn = backdrop.querySelector('#cqb-btn-cancel');
      const saveBtn = backdrop.querySelector('#cqb-btn-save');
      const pickBtn = backdrop.querySelector('#cqb-btn-pick-element');
      const clearBtn = backdrop.querySelector('#cqb-btn-clear-element');

      // Setup Website Hotkey Isolation
      this.setupHotkeyIsolation(backdrop, labelInput, saveBtn);

      // Live updates
      const updatePreview = () => {
        const text = labelInput.value.trim() || 'Button';
        previewBtn.textContent = text;
        previewBtn.style.backgroundColor = this.currentData.bgColor;
        previewBtn.style.color = this.currentData.textColor;
      };

      labelInput.oninput = () => {
        this.currentData.label = labelInput.value;
        this.currentData.name = labelInput.value;
        updatePreview();
      };

      descInput.oninput = () => {
        this.currentData.description = descInput.value;
      };

      // Text color toggle
      backdrop.querySelectorAll('.cqb-text-color-btn').forEach(btn => {
        btn.onclick = () => {
          backdrop.querySelectorAll('.cqb-text-color-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this.currentData.textColor = btn.dataset.color;
          updatePreview();
        };
      });

      // Background swatches
      backdrop.querySelectorAll('.cqb-color-swatch').forEach(swatch => {
        swatch.onclick = () => {
          backdrop.querySelectorAll('.cqb-color-swatch').forEach(s => s.classList.remove('active'));
          swatch.classList.add('active');
          this.currentData.bgColor = swatch.dataset.color;
          nativeColor.value = swatch.dataset.color;
          updatePreview();
        };
      });

      nativeColor.oninput = (e) => {
        backdrop.querySelectorAll('.cqb-color-swatch').forEach(s => s.classList.remove('active'));
        this.currentData.bgColor = e.target.value;
        updatePreview();
      };

      // Inspector element picker
      pickBtn.onclick = () => {
        backdrop.style.display = 'none';
        this.removeHotkeyIsolation();

        this.inspector.start({
          onSelect: (selectorData, element) => {
            backdrop.style.display = 'flex';
            this.setupHotkeyIsolation(backdrop, labelInput, saveBtn);

            this.currentData.action = {
              type: 'click_original',
              selectorData: selectorData
            };

            // Autofill label if user hasn't typed anything yet
            if (!labelInput.value && selectorData.textContent) {
              labelInput.value = selectorData.textContent;
              this.currentData.label = selectorData.textContent;
              this.currentData.name = selectorData.textContent;
            }

            // Update UI status
            const statusEl = backdrop.querySelector('#cqb-func-status');
            const infoEl = backdrop.querySelector('#cqb-target-info');
            statusEl.innerHTML = '<span style="color: #34d399;">✓ Original-Element zugeordnet</span>';
            infoEl.style.display = 'block';
            infoEl.textContent = this.formatSelectorSummary(selectorData);
            clearBtn.style.display = 'inline-block';
            updatePreview();
          },
          onCancel: () => {
            backdrop.style.display = 'flex';
            this.setupHotkeyIsolation(backdrop, labelInput, saveBtn);
          }
        });
      };

      clearBtn.onclick = () => {
        this.currentData.action = null;
        backdrop.querySelector('#cqb-func-status').innerHTML = '<span>⚠️ Noch keine Original-Aktion zugewiesen</span>';
        const infoEl = backdrop.querySelector('#cqb-target-info');
        infoEl.style.display = 'none';
        infoEl.textContent = '';
        clearBtn.style.display = 'none';
      };

      // Close & Cancel
      closeBtn.onclick = () => this.close();
      cancelBtn.onclick = () => this.close();
      backdrop.onclick = (e) => {
        if (e.target === backdrop) this.close();
      };

      // Save
      saveBtn.onclick = () => {
        const textVal = labelInput.value.trim() || 'Button';

        this.currentData.label = textVal;
        this.currentData.name = textVal;
        this.currentData.description = descInput.value.trim();

        if (typeof this.onSaveCallback === 'function') {
          this.onSaveCallback(this.currentData);
        }
        this.close();
      };

      // Focus target input
      setTimeout(() => {
        if (this.focusTarget === 'label') {
          labelInput.focus();
          labelInput.select();
        } else if (this.focusTarget === 'bgcolor') {
          nativeColor.focus();
          nativeColor.click();
        } else {
          labelInput.focus();
        }
      }, 60);
    }

    /**
     * Blocks all website-level hotkeys so typed characters never trigger website shortcuts
     */
    setupHotkeyIsolation(backdrop, labelInput, saveBtn) {
      this.removeHotkeyIsolation();

      const modalEl = backdrop.querySelector('.cqb-modal');
      const descInput = backdrop.querySelector('#cqb-input-desc');

      // Stop propagation at input level in capture & bubble
      const stopEventPropagation = (e) => {
        e.stopPropagation();
        e.stopImmediatePropagation();

        if (e.key === 'Escape') {
          e.preventDefault();
          this.close();
        } else if (e.key === 'Enter' && e.target === labelInput) {
          e.preventDefault();
          saveBtn.click();
        }
      };

      [labelInput, descInput, modalEl, backdrop].forEach(el => {
        if (!el) return;
        ['keydown', 'keyup', 'keypress'].forEach(evtType => {
          el.addEventListener(evtType, stopEventPropagation, { capture: true });
        });
      });

      // Intercept on window in capture phase to prevent web page hotkey handlers from firing
      this.globalKeyInterceptor = (e) => {
        if (!this.activeModal) return;

        const path = e.composedPath ? e.composedPath() : [];
        const isFromModal = path.some(el => el && el.classList && (el.classList.contains('cqb-modal') || el.classList.contains('cqb-modal-backdrop')));

        if (isFromModal) {
          // The user is typing inside our modal. Prevent the host page from seeing this key event!
          e.stopImmediatePropagation();
        } else {
          // A key event fired on the document while our modal is active: suppress it!
          e.preventDefault();
          e.stopImmediatePropagation();
        }
      };

      window.addEventListener('keydown', this.globalKeyInterceptor, { capture: true });
      window.addEventListener('keyup', this.globalKeyInterceptor, { capture: true });
      window.addEventListener('keypress', this.globalKeyInterceptor, { capture: true });
    }

    removeHotkeyIsolation() {
      if (this.globalKeyInterceptor) {
        window.removeEventListener('keydown', this.globalKeyInterceptor, { capture: true });
        window.removeEventListener('keyup', this.globalKeyInterceptor, { capture: true });
        window.removeEventListener('keypress', this.globalKeyInterceptor, { capture: true });
        this.globalKeyInterceptor = null;
      }
    }

    formatSelectorSummary(selData) {
      if (!selData) return '';
      const parts = [];
      if (selData.isInIframe) {
        parts.push('<strong>[iFrame]</strong>');
      }
      if (selData.tagName) parts.push(`<${selData.tagName}>`);
      if (selData.id) parts.push(`#${selData.id}`);
      if (selData.textContent) parts.push(`"${selData.textContent}"`);
      if (selData.primarySelector) parts.push(`[${selData.primarySelector}]`);
      return parts.join(' ');
    }

    escapeHtml(str) {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }

    close() {
      this.removeHotkeyIsolation();

      if (this.activeModal && this.activeModal.parentNode) {
        this.activeModal.parentNode.removeChild(this.activeModal);
      }
      this.activeModal = null;
      this.currentData = null;
      this.onSaveCallback = null;
    }
  }

  window.CQBModal = CQBModal;
})(typeof window !== 'undefined' ? window : this);
