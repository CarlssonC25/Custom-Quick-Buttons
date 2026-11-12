/**
 * Custom Quick Buttons - Background Service Worker (Manifest V3)
 * Manages badge counters and tab lifecycle.
 */

const STORAGE_PREFIX = 'cqb_site_';

function getHostnameFromUrl(url) {
  try {
    if (!url) return null;
    const parsed = new URL(url);
    if (parsed.protocol === 'file:') return 'local_files';
    if (!parsed.hostname) return null;
    return parsed.hostname.toLowerCase();
  } catch (e) {
    return null;
  }
}

async function updateBadgeForTab(tabId, url) {
  const host = getHostnameFromUrl(url);
  if (!host) {
    chrome.action.setBadgeText({ tabId, text: '' });
    return;
  }

  const key = `${STORAGE_PREFIX}${host}`;
  chrome.storage.local.get([key], (res) => {
    if (chrome.runtime.lastError || !res[key]) {
      chrome.action.setBadgeText({ tabId, text: '' });
      return;
    }

    const data = res[key];
    if (data.enabled && Array.isArray(data.buttons) && data.buttons.length > 0) {
      chrome.action.setBadgeText({ tabId, text: String(data.buttons.length) });
      chrome.action.setBadgeBackgroundColor({ tabId, color: '#6366f1' });
    } else if (data.enabled) {
      chrome.action.setBadgeText({ tabId, text: 'ON' });
      chrome.action.setBadgeBackgroundColor({ tabId, color: '#10b981' });
    } else {
      chrome.action.setBadgeText({ tabId, text: '' });
    }
  });
}

// Update badge when tab is activated or updated
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  try {
    const tab = await chrome.tabs.get(activeInfo.tabId);
    if (tab && tab.url) {
      updateBadgeForTab(activeInfo.tabId, tab.url);
    }
  } catch (err) {}
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    updateBadgeForTab(tabId, tab.url);
  }
});

// React to storage changes to update badge immediately
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== 'local') return;

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs && tabs[0] && tabs[0].url) {
      updateBadgeForTab(tabs[0].id, tabs[0].url);
    }
  });
});
