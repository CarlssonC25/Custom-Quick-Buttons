/**
 * Custom Quick Buttons - Extension Integrity & Test Suite
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('=== Custom Quick Buttons: Extension Validation ===\n');

let failed = 0;

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    failed++;
  } else {
    console.log(`✓ PASS: ${message}`);
  }
}

// 1. Verify Manifest
console.log('\n--- 1. Checking Manifest V3 ---');
const manifestPath = path.join(__dirname, '..', 'manifest.json');
assert(fs.existsSync(manifestPath), 'manifest.json exists');

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
assert(manifest.manifest_version === 3, 'Manifest version is 3');
assert(manifest.name === 'Custom Quick Buttons', 'Name is "Custom Quick Buttons"');
assert(manifest.action && manifest.action.default_popup, 'Popup is configured');
assert(manifest.background && manifest.background.service_worker, 'Background service worker is configured');
assert(manifest.content_scripts && manifest.content_scripts.length > 0, 'Content script is configured');
assert(manifest.permissions.includes('storage'), 'Has storage permission');

// 2. Check Icons
console.log('\n--- 2. Checking Icons ---');
for (const [size, iconFile] of Object.entries(manifest.icons)) {
  const iconPath = path.join(__dirname, '..', iconFile);
  assert(fs.existsSync(iconPath), `Icon ${size}x${size} exists (${iconFile})`);
  const stat = fs.statSync(iconPath);
  assert(stat.size > 50, `Icon ${size}x${size} is non-empty (${stat.size} bytes)`);
}

// 3. Syntax check on all JavaScript files
console.log('\n--- 3. Checking JS Syntax ---');
const jsFiles = [
  'lib/storage.js',
  'lib/selector.js',
  'content/styles.js',
  'content/toast.js',
  'content/contextmenu.js',
  'content/inspector.js',
  'content/modal.js',
  'content/dragdrop.js',
  'content/toolbar.js',
  'content/content.js',
  'background/background.js',
  'popup/popup.js'
];

for (const relPath of jsFiles) {
  const absPath = path.join(__dirname, '..', relPath);
  assert(fs.existsSync(absPath), `${relPath} exists`);
  try {
    execSync(`node -c "${absPath}"`);
    console.log(`✓ PASS: Syntax valid for ${relPath}`);
  } catch (err) {
    console.error(`❌ FAIL: Syntax error in ${relPath}: ${err.message}`);
    failed++;
  }
}

// 4. Test Storage Logic
console.log('\n--- 4. Testing Storage Module Logic ---');
const mockStorage = {};
global.chrome = {
  runtime: { id: 'mock-cqb-extension-id', lastError: null },
  storage: {
    local: {
      get: (keys, cb) => {
        const res = {};
        keys.forEach(k => { if (mockStorage[k] !== undefined) res[k] = mockStorage[k]; });
        cb(res);
      },
      set: (items, cb) => {
        Object.assign(mockStorage, items);
        cb();
      }
    },
    onChanged: {
      addListener: () => {},
      removeListener: () => {}
    }
  }
};

global.window = {
  location: { hostname: 'example.com', protocol: 'https:' }
};

// Load storage.js
require('../lib/storage.js');
const CQBStorage = global.window.CQBStorage;

(async () => {
  const initial = await CQBStorage.getSiteData('example.com');
  assert(initial.enabled === false, 'Default site data is disabled (off by default)');
  assert(Array.isArray(initial.buttons) && initial.buttons.length === 0, 'Initial buttons array is empty');

  // Activate site
  await CQBStorage.updateSiteData('example.com', { enabled: true });
  const activated = await CQBStorage.getSiteData('example.com');
  assert(activated.enabled === true, 'Site data successfully activated for example.com');

  // Add Button
  const btn1 = await CQBStorage.addButton('example.com', {
    name: 'Speichern',
    label: 'Speichern',
    bgColor: '#10b981',
    textColor: '#ffffff'
  });
  assert(btn1 && btn1.id, 'Button was added with an ID');

  const btn2 = await CQBStorage.addButton('example.com', {
    name: 'Zähler',
    label: 'Zähler +1',
    bgColor: '#3b82f6',
    textColor: '#ffffff'
  });

  const updated = await CQBStorage.getSiteData('example.com');
  assert(updated.buttons.length === 2, 'Two buttons stored for example.com');

  // Reorder Buttons
  await CQBStorage.reorderButtons('example.com', [btn2.id, btn1.id]);
  const reordered = await CQBStorage.getSiteData('example.com');
  assert(reordered.buttons[0].id === btn2.id && reordered.buttons[1].id === btn1.id, 'Buttons order persisted correctly');

  // Delete Button
  await CQBStorage.deleteButton('example.com', btn1.id);
  const afterDelete = await CQBStorage.getSiteData('example.com');
  assert(afterDelete.buttons.length === 1 && afterDelete.buttons[0].id === btn2.id, 'Button deleted successfully');

  console.log('\n=============================================');
  if (failed === 0) {
    console.log('🎉 ALL INTEGRITY CHECKS PASSED SUCCESSFULLY!');
  } else {
    console.error(`⚠️ ${failed} CHECKS FAILED!`);
    process.exit(1);
  }
})();
