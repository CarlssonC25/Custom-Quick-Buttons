/**
 * Custom Quick Buttons - Popup Controller
 */

(function () {
  'use strict';

  let currentTab = null;
  let currentHostname = null;
  let currentSiteData = null;

  const siteDomainEl = document.getElementById('site-domain');
  const toggleEnabled = document.getElementById('toggle-enabled');
  const toggleVisible = document.getElementById('toggle-visible');
  const statusDesc = document.getElementById('status-desc');
  const btnResetPos = document.getElementById('btn-reset-pos');
  const buttonsCountEl = document.getElementById('buttons-count');
  const buttonsListEl = document.getElementById('buttons-list');

  async function init() {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      if (!tabs || !tabs[0] || !tabs[0].url) {
        showUnsupportedState('Kein aktiver Tab gefunden');
        return;
      }

      currentTab = tabs[0];
      const url = currentTab.url;

      // Check for restricted schemes (chrome://, brave://, edge://, about:)
      if (/^(chrome|brave|edge|about|chrome-extension):/i.test(url)) {
        showUnsupportedState('Systemseiten werden nicht unterstützt');
        return;
      }

      currentHostname = CQBStorage.getHostname(url);
      siteDomainEl.textContent = currentHostname;
      siteDomainEl.title = currentHostname;

      loadSiteData();
    });

    bindEvents();
  }

  function showUnsupportedState(message) {
    siteDomainEl.textContent = 'Nicht verfügbar';
    statusDesc.textContent = message;
    toggleEnabled.disabled = true;
    toggleVisible.disabled = true;
    btnResetPos.disabled = true;
  }

  async function loadSiteData() {
    if (!currentHostname) return;
    currentSiteData = await CQBStorage.getSiteData(currentHostname);

    toggleEnabled.checked = !!currentSiteData.enabled;
    toggleVisible.checked = !!currentSiteData.visible;
    updateStatusText(currentSiteData.enabled);

    renderButtonsList(currentSiteData.buttons || []);
  }

  function updateStatusText(enabled) {
    if (enabled) {
      statusDesc.textContent = 'Aktiv – Toolbar wird auf dieser Website angezeigt';
      statusDesc.style.color = '#34d399';
    } else {
      statusDesc.textContent = 'Inaktiv – Plugin auf dieser Domain deaktiviert';
      statusDesc.style.color = '#82828e';
    }
  }

  function renderButtonsList(buttons) {
    buttonsCountEl.textContent = String(buttons.length);
    buttonsListEl.innerHTML = '';

    if (buttons.length === 0) {
      buttonsListEl.innerHTML = `
        <div class="empty-state">
          <span>Noch keine eigenen Buttons für diese Webseite vorhanden.</span>
          <span class="empty-hint">Klicken Sie oben auf „Neuen Button erstellen“ oder auf das (+) in der schwebenden Leiste.</span>
        </div>
      `;
      return;
    }

    const sorted = buttons.slice().sort((a, b) => (a.order || 0) - (b.order || 0));

    sorted.forEach((btn) => {
      const item = document.createElement('div');
      item.className = 'btn-item';

      const preview = document.createElement('span');
      preview.className = 'btn-pill-preview';
      preview.style.backgroundColor = btn.bgColor || '#3b82f6';
      preview.style.color = btn.textColor || '#ffffff';
      preview.textContent = btn.label || btn.name || 'Button';

      const info = document.createElement('div');
      info.className = 'btn-item-info';

      const name = document.createElement('span');
      name.className = 'btn-item-name';
      name.textContent = btn.name || btn.label;

      const sub = document.createElement('span');
      sub.className = 'btn-item-sub';
      if (btn.action && btn.action.selectorData) {
        const s = btn.action.selectorData;
        sub.textContent = `Aktion: <${s.tagName || 'el'}> ${s.textContent ? `"${s.textContent}"` : ''}`;
      } else {
        sub.textContent = 'Keine Original-Aktion zugewiesen';
        sub.style.color = '#f59e0b';
      }

      info.appendChild(name);
      info.appendChild(sub);

      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'btn-item-delete';
      delBtn.title = 'Button löschen';
      delBtn.innerHTML = `
        <svg viewBox="0 0 24 24">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        </svg>
      `;
      delBtn.onclick = async (e) => {
        e.stopPropagation();
        await CQBStorage.deleteButton(currentHostname, btn.id);
        loadSiteData();
      };

      item.appendChild(preview);
      item.appendChild(info);
      item.appendChild(delBtn);

      buttonsListEl.appendChild(item);
    });
  }

  function bindEvents() {
    toggleEnabled.onchange = async () => {
      const isEnabled = toggleEnabled.checked;
      updateStatusText(isEnabled);
      await CQBStorage.updateSiteData(currentHostname, { enabled: isEnabled });

      if (currentTab && currentTab.id) {
        chrome.tabs.sendMessage(currentTab.id, {
          action: 'TOGGLE_ENABLED',
          enabled: isEnabled
        }).catch(() => {});
      }
    };

    toggleVisible.onchange = async () => {
      const isVisible = toggleVisible.checked;
      await CQBStorage.updateSiteData(currentHostname, { visible: isVisible });

      if (currentTab && currentTab.id) {
        chrome.tabs.sendMessage(currentTab.id, {
          action: 'TOGGLE_VISIBILITY',
          visible: isVisible
        }).catch(() => {});
      }
    };

    btnResetPos.onclick = async () => {
      await CQBStorage.updateSiteData(currentHostname, {
        position: { x: null, y: null, isCustom: false }
      });

      if (currentTab && currentTab.id) {
        chrome.tabs.sendMessage(currentTab.id, {
          action: 'RESET_POSITION'
        }).catch(() => {});
      }
    };
  }

  document.addEventListener('DOMContentLoaded', init);
})();
