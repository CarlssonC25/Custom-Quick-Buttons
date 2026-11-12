/**
 * Custom Quick Buttons - Storage Module
 * Manages per-website persistence using chrome.storage.local.
 */

(function (window) {
  'use strict';

  const STORAGE_PREFIX = 'cqb_site_';

  const DEFAULT_SITE_DATA = {
    enabled: false,        // Default: Inaktiv auf allen Seiten bis der Nutzer es im Popup aktiviert
    visible: true,         // Floating toolbar visibility
    collapsed: false,      // Toolbar collapsed state
    position: {
      x: null,
      y: null,
      isCustom: false
    },
    buttons: []
  };

  const CQBStorage = {
    /**
     * Extracts normalized domain/hostname for the current or given URL
     */
    getHostname(url) {
      try {
        if (!url && typeof window !== 'undefined' && window.location) {
          if (window.location.protocol === 'file:') {
            return 'local_files';
          }
          return window.location.hostname || 'unknown_host';
        }
        if (url) {
          const parsed = new URL(url);
          if (parsed.protocol === 'file:') return 'local_files';
          return parsed.hostname || 'unknown_host';
        }
      } catch (e) {
        // Fallback for non-standard schemes
      }
      return 'unknown_host';
    },

    /**
     * Storage key for domain
     */
    getKey(hostname) {
      const host = hostname || this.getHostname();
      return `${STORAGE_PREFIX}${host.toLowerCase()}`;
    },

    /**
     * Retrieves site settings and buttons
     */
    async getSiteData(hostname) {
      const key = this.getKey(hostname);
      return new Promise((resolve) => {
        try {
          chrome.storage.local.get([key], (result) => {
            if (chrome.runtime && chrome.runtime.lastError) {
              console.error('[CQB Storage] Read error:', chrome.runtime.lastError);
              resolve(JSON.parse(JSON.stringify(DEFAULT_SITE_DATA)));
              return;
            }
            const data = result ? result[key] : null;
            if (!data) {
              resolve(JSON.parse(JSON.stringify(DEFAULT_SITE_DATA)));
            } else {
              // Merge with defaults to guarantee all expected fields exist
              resolve({
                ...DEFAULT_SITE_DATA,
                ...data,
                position: { ...DEFAULT_SITE_DATA.position, ...(data.position || {}) },
                buttons: Array.isArray(data.buttons) ? data.buttons : []
              });
            }
          });
        } catch (e) {
          resolve(JSON.parse(JSON.stringify(DEFAULT_SITE_DATA)));
        }
      });
    },

    /**
     * Saves entire site data
     */
    async saveSiteData(hostname, siteData) {
      const key = this.getKey(hostname);
      return new Promise((resolve, reject) => {
        try {
          chrome.storage.local.set({ [key]: siteData }, () => {
            if (chrome.runtime && chrome.runtime.lastError) {
              console.error('[CQB Storage] Write error:', chrome.runtime.lastError);
              reject(chrome.runtime.lastError);
            } else {
              resolve(siteData);
            }
          });
        } catch (e) {
          reject(e);
        }
      });
    },

    /**
     * Partially updates site data
     */
    async updateSiteData(hostname, partial) {
      const current = await this.getSiteData(hostname);
      const updated = {
        ...current,
        ...partial,
        position: partial.position ? { ...current.position, ...partial.position } : current.position,
        buttons: partial.buttons !== undefined ? partial.buttons : current.buttons
      };
      return this.saveSiteData(hostname, updated);
    },

    /**
     * Adds a new button to the site's button list
     */
    async addButton(hostname, button) {
      const current = await this.getSiteData(hostname);
      const newButton = {
        id: button.id || 'btn_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
        name: button.name || 'Neuer Button',
        label: button.label || 'Button',
        textColor: button.textColor || '#ffffff',
        bgColor: button.bgColor || '#3b82f6',
        description: button.description || '',
        action: button.action || null,
        order: current.buttons.length
      };

      current.buttons.push(newButton);
      await this.saveSiteData(hostname, current);
      return newButton;
    },

    /**
     * Updates an existing button by ID
     */
    async updateButton(hostname, buttonId, updates) {
      const current = await this.getSiteData(hostname);
      const idx = current.buttons.findIndex((b) => b.id === buttonId);
      if (idx === -1) {
        throw new Error(`Button mit ID ${buttonId} wurde nicht gefunden.`);
      }

      current.buttons[idx] = {
        ...current.buttons[idx],
        ...updates
      };

      await this.saveSiteData(hostname, current);
      return current.buttons[idx];
    },

    /**
     * Deletes a button by ID
     */
    async deleteButton(hostname, buttonId) {
      const current = await this.getSiteData(hostname);
      current.buttons = current.buttons.filter((b) => b.id !== buttonId);
      // Re-index order
      current.buttons.forEach((b, i) => { b.order = i; });
      await this.saveSiteData(hostname, current);
      return current.buttons;
    },

    /**
     * Reorders buttons based on an array of IDs in new order
     */
    async reorderButtons(hostname, orderedIds) {
      const current = await this.getSiteData(hostname);
      const buttonMap = new Map(current.buttons.map(b => [b.id, b]));
      const newButtons = [];

      orderedIds.forEach((id, index) => {
        if (buttonMap.has(id)) {
          const btn = buttonMap.get(id);
          btn.order = index;
          newButtons.push(btn);
          buttonMap.delete(id);
        }
      });

      // Append any buttons not in orderedIds to prevent data loss
      buttonMap.forEach((btn) => {
        btn.order = newButtons.length;
        newButtons.push(btn);
      });

      current.buttons = newButtons;
      await this.saveSiteData(hostname, current);
      return current.buttons;
    },

    /**
     * Duplicates an existing button
     */
    async duplicateButton(hostname, buttonId) {
      const current = await this.getSiteData(hostname);
      const original = current.buttons.find(b => b.id === buttonId);
      if (!original) {
        throw new Error('Original-Button nicht gefunden.');
      }

      const duplicate = {
        ...JSON.parse(JSON.stringify(original)),
        id: 'btn_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
        name: `${original.name} (Kopie)`,
        label: `${original.label} (Kopie)`,
        order: current.buttons.length
      };

      current.buttons.push(duplicate);
      await this.saveSiteData(hostname, current);
      return duplicate;
    },

    /**
     * Listens for changes to storage for the current domain
     */
    onChanged(hostname, callback) {
      const targetKey = this.getKey(hostname);
      const listener = (changes, areaName) => {
        if (areaName === 'local' && changes[targetKey]) {
          callback(changes[targetKey].newValue, changes[targetKey].oldValue);
        }
      };
      chrome.storage.onChanged.addListener(listener);
      return () => chrome.storage.onChanged.removeListener(listener);
    }
  };

  window.CQBStorage = CQBStorage;
})(typeof window !== 'undefined' ? window : this);
