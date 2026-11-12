/**
 * Custom Quick Buttons - Content Script Orchestrator
 * Integrates storage, selector engine, floating toolbar, inspector, and modals inside Shadow DOM.
 */

(function () {
  'use strict';

  // Prevent multiple injections
  if (window.__CUSTOM_QUICK_BUTTONS_INITIALIZED__) {
    return;
  }
  window.__CUSTOM_QUICK_BUTTONS_INITIALIZED__ = true;

  const HOST_ID = '__custom_quick_buttons_root__';
  const hostname = CQBStorage.getHostname();
  const isTopFrame = (window.self === window.top);

  let hostElement = null;
  let shadowRoot = null;
  let siteData = null;

  let toast = null;
  let inspector = null;
  let modal = null;
  let contextMenu = null;
  let toolbar = null;

  /**
   * Initializes the extension environment for the current website
   */
  async function init() {
    // Only top frame renders the floating toolbar and manages site configuration
    if (!isTopFrame) {
      setupSubframeListeners();
      return;
    }

    try {
      siteData = await CQBStorage.getSiteData(hostname);

      if (siteData.enabled && siteData.visible) {
        mountUI();
      }

      setupMessageListeners();
      setupStorageListeners();
    } catch (err) {
      console.error('[Custom Quick Buttons] Initialization error:', err);
    }
  }

  /**
   * Subframe listeners for iframe action execution
   */
  function setupSubframeListeners() {
    window.addEventListener('message', (event) => {
      if (!event.data || event.data.type !== 'CQB_TRIGGER_IFRAME_ACTION') return;
      const selData = event.data.selectorData;
      if (!selData) return;

      try {
        const res = CQBSelector.resolveElement(selData, document);
        if (res.status === 'success' && res.element) {
          CQBSelector.triggerElement(res.element);
        }
      } catch (e) {}
    });
  }

  /**
   * Creates or mounts the isolated Shadow DOM host
   */
  function mountUI() {
    if (hostElement && hostElement.isConnected) {
      if (toolbar) {
        toolbar.renderButtons(siteData.buttons);
      }
      return;
    }

    hostElement = document.getElementById(HOST_ID);
    if (!hostElement) {
      hostElement = document.createElement('div');
      hostElement.id = HOST_ID;
      hostElement.style.position = 'fixed';
      hostElement.style.top = '0';
      hostElement.style.left = '0';
      hostElement.style.width = '0';
      hostElement.style.height = '0';
      hostElement.style.zIndex = '2147483647';
      hostElement.style.pointerEvents = 'none';
      document.documentElement.appendChild(hostElement);
    }

    if (!hostElement.shadowRoot) {
      shadowRoot = hostElement.attachShadow({ mode: 'open' });
      const styleEl = document.createElement('style');
      styleEl.textContent = window.CQB_SHADOW_STYLES || '';
      shadowRoot.appendChild(styleEl);
    } else {
      shadowRoot = hostElement.shadowRoot;
    }

    // Initialize Subsystems inside Shadow DOM
    toast = new CQBToast(shadowRoot);
    inspector = new CQBInspector(shadowRoot, hostElement);
    modal = new CQBModal(shadowRoot, inspector);

    contextMenu = new CQBContextMenu(shadowRoot, {
      onEdit: (btnData, focusTarget) => openEditModal(btnData, focusTarget),
      onToggleTextColor: (btnData) => handleToggleTextColor(btnData),
      onReassign: (btnData) => startDirectReassign(btnData),
      onDuplicate: (btnData) => handleDuplicate(btnData),
      onDelete: (btnData) => handleDelete(btnData)
    });

    toolbar = new CQBToolbar({
      shadowRoot: shadowRoot,
      siteData: siteData,
      onAdd: () => openCreateModal(),
      onClick: (btnData) => executeButtonAction(btnData),
      onContextMenu: (btnData, x, y) => contextMenu.show(x, y, btnData),
      onPositionChange: (newPos) => CQBStorage.updateSiteData(hostname, { position: newPos }),
      onCollapseChange: (isCollapsed) => CQBStorage.updateSiteData(hostname, { collapsed: isCollapsed }),
      onReorder: (newIds) => handleReorder(newIds)
    });
  }

  /**
   * Unmounts or hides UI when disabled
   */
  function unmountUI() {
    if (toolbar) {
      toolbar.destroy();
      toolbar = null;
    }
    if (hostElement && hostElement.parentNode) {
      hostElement.parentNode.removeChild(hostElement);
      hostElement = null;
      shadowRoot = null;
    }
  }

  /**
   * Executes the mapped original action of a button
   */
  async function executeButtonAction(buttonData) {
    if (!buttonData.action || !buttonData.action.selectorData) {
      toast.warning(`Dem Button "${buttonData.label}" ist noch keine Aktion zugewiesen. Klicken Sie mit rechts zum Bearbeiten.`);
      return;
    }

    const selData = buttonData.action.selectorData;

    // If target is marked as inside an iframe, also broadcast action trigger to subframes
    if (selData.isInIframe) {
      try {
        const frames = Array.from(document.querySelectorAll('iframe, frame'));
        frames.forEach(f => {
          try {
            f.contentWindow?.postMessage({
              type: 'CQB_TRIGGER_IFRAME_ACTION',
              selectorData: selData
            }, '*');
          } catch (e) {}
        });
      } catch (e) {}
    }

    const result = CQBSelector.resolveElement(selData);

    if (result.status === 'success') {
      try {
        CQBSelector.triggerElement(result.element);
      } catch (err) {
        console.error('[CQB] Click execution error:', err);
        toast.error(`Aktion fehlgeschlagen: ${err.message || 'Browser-Sicherheitseinschränkung'}`);
      }
    } else if (result.status === 'multiple') {
      // Trigger best match and warn
      try {
        CQBSelector.triggerElement(result.element);
        toast.warning(`Mehrere passende Elemente (${result.count}) gefunden. Bitte Selektor prüfen.`);
      } catch (err) {
        toast.error(`Fehler beim Ausführen: ${err.message}`);
      }
    } else {
      // Not found
      toast.error(
        `Original-Element für "${buttonData.label}" nicht gefunden.`,
        'Neu zuweisen',
        () => startDirectReassign(buttonData)
      );
    }
  }

  /**
   * Opens modal to create a new button
   */
  function openCreateModal() {
    modal.open({
      buttonData: null,
      onSave: async (newButton) => {
        try {
          const added = await CQBStorage.addButton(hostname, newButton);
          siteData = await CQBStorage.getSiteData(hostname);
          if (toolbar) toolbar.renderButtons(siteData.buttons);
          toast.success(`Button "${added.label}" erfolgreich erstellt.`);
        } catch (err) {
          toast.error(`Fehler beim Speichern: ${err.message || err}`);
        }
      }
    });
  }

  /**
   * Opens modal to edit an existing button
   */
  function openEditModal(buttonData, focusTarget = 'all') {
    modal.open({
      buttonData: buttonData,
      focusTarget: focusTarget,
      onSave: async (updated) => {
        try {
          await CQBStorage.updateButton(hostname, updated.id, updated);
          siteData = await CQBStorage.getSiteData(hostname);
          if (toolbar) toolbar.renderButtons(siteData.buttons);
          toast.success(`Button "${updated.label}" aktualisiert.`);
        } catch (err) {
          toast.error(`Fehler beim Speichern: ${err.message || err}`);
        }
      }
    });
  }

  /**
   * Quick toggle of button text color between black and white
   */
  async function handleToggleTextColor(buttonData) {
    const isWhite = (buttonData.textColor || '#ffffff').toLowerCase() === '#ffffff';
    const newColor = isWhite ? '#111111' : '#ffffff';
    try {
      await CQBStorage.updateButton(hostname, buttonData.id, { textColor: newColor });
      siteData = await CQBStorage.getSiteData(hostname);
      if (toolbar) toolbar.renderButtons(siteData.buttons);
      toast.info(`Textfarbe auf ${isWhite ? 'Schwarz' : 'Weiß'} geändert.`);
    } catch (err) {
      toast.error(`Fehler beim Ändern der Textfarbe: ${err.message}`);
    }
  }

  /**
   * Launches inspector directly to reassign element function
   */
  function startDirectReassign(buttonData) {
    toast.info(`Klicken Sie auf das neue Original-Element für "${buttonData.label}".`);
    inspector.start({
      onSelect: async (selectorData) => {
        try {
          await CQBStorage.updateButton(hostname, buttonData.id, {
            action: {
              type: 'click_original',
              selectorData: selectorData
            }
          });
          siteData = await CQBStorage.getSiteData(hostname);
          if (toolbar) toolbar.renderButtons(siteData.buttons);
          toast.success(`Funktion für "${buttonData.label}" erfolgreich aktualisiert!`);
        } catch (err) {
          toast.error(`Fehler bei der Zuweisung: ${err.message}`);
        }
      },
      onCancel: () => {
        toast.info('Zuweisung abgebrochen.');
      }
    });
  }

  /**
   * Handles button duplication
   */
  async function handleDuplicate(buttonData) {
    try {
      const duplicate = await CQBStorage.duplicateButton(hostname, buttonData.id);
      siteData = await CQBStorage.getSiteData(hostname);
      if (toolbar) toolbar.renderButtons(siteData.buttons);
      toast.success(`Button "${duplicate.label}" dupliziert.`);
    } catch (err) {
      toast.error(`Duplizieren fehlgeschlagen: ${err.message}`);
    }
  }

  /**
   * Handles button deletion
   */
  async function handleDelete(buttonData) {
    try {
      await CQBStorage.deleteButton(hostname, buttonData.id);
      siteData = await CQBStorage.getSiteData(hostname);
      if (toolbar) toolbar.renderButtons(siteData.buttons);
      toast.info(`Button "${buttonData.label}" gelöscht.`);
    } catch (err) {
      toast.error(`Löschen fehlgeschlagen: ${err.message}`);
    }
  }

  /**
   * Handles button reordering from Drag & Drop
   */
  async function handleReorder(newIds) {
    try {
      const updatedButtons = await CQBStorage.reorderButtons(hostname, newIds);
      siteData.buttons = updatedButtons;
      if (toolbar) toolbar.renderButtons(siteData.buttons);
    } catch (err) {
      console.error('[CQB] Error saving reorder:', err);
    }
  }

  /**
   * Listens for commands from Popup or Background worker
   */
  function setupMessageListeners() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      if (!request || !request.action) return;

      switch (request.action) {
        case 'PING':
          sendResponse({
            pong: true,
            hostname: hostname,
            siteData: siteData
          });
          break;

        case 'TOGGLE_ENABLED':
          siteData.enabled = request.enabled;
          CQBStorage.updateSiteData(hostname, { enabled: request.enabled }).then(() => {
            if (siteData.enabled && siteData.visible) {
              mountUI();
            } else {
              unmountUI();
            }
            sendResponse({ success: true, siteData });
          });
          return true; // asynchronous response

        case 'TOGGLE_VISIBILITY':
          siteData.visible = request.visible;
          CQBStorage.updateSiteData(hostname, { visible: request.visible }).then(() => {
            if (siteData.enabled && siteData.visible) {
              mountUI();
            } else {
              unmountUI();
            }
            sendResponse({ success: true, siteData });
          });
          return true;

        case 'CREATE_NEW_BUTTON':
          if (!siteData.enabled) {
            siteData.enabled = true;
            CQBStorage.updateSiteData(hostname, { enabled: true }).then(() => {
              mountUI();
              openCreateModal();
              sendResponse({ success: true });
            });
            return true;
          } else {
            mountUI();
            openCreateModal();
            sendResponse({ success: true });
          }
          break;

        case 'RESET_POSITION':
          if (toolbar) {
            toolbar.resetPositionToDefault();
            toast.info('Toolbar-Position auf unten links zurückgesetzt.');
          }
          sendResponse({ success: true });
          break;

        default:
          sendResponse({ unhandled: true });
          break;
      }
    });
  }

  /**
   * Listens for storage updates across tabs
   */
  function setupStorageListeners() {
    CQBStorage.onChanged(hostname, (newData) => {
      if (!newData) return;
      siteData = newData;
      if (siteData.enabled && siteData.visible) {
        mountUI();
      } else {
        unmountUI();
      }
    });
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
