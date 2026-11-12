/**
 * Custom Quick Buttons - Encapsulated Shadow DOM Styles
 */

(function (window) {
  'use strict';

  const SHADOW_STYLES = `
    /* Reset & Base inside Shadow DOM */
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      font-size: 13px;
      line-height: 1.4;
      -webkit-font-smoothing: antialiased;
    }

    :host {
      all: initial;
      position: fixed;
      top: 0;
      left: 0;
      width: 0;
      height: 0;
      z-index: 2147483647;
      pointer-events: none;
    }

    /* Floating Toolbar Container */
    .cqb-toolbar-wrapper {
      position: fixed;
      bottom: 24px;
      left: 24px;
      z-index: 2147483647;
      pointer-events: auto;
      user-select: none;
      display: flex;
      flex-direction: column;
      gap: 6px;
      transition: opacity 0.2s ease, transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .cqb-toolbar {
      display: flex;
      align-items: center;
      background: rgba(24, 24, 27, 0.94);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid rgba(63, 63, 70, 0.85);
      border-radius: 12px;
      padding: 6px 8px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.05);
      gap: 6px;
      max-width: 90vw;
    }

    /* Drag Handle */
    .cqb-drag-handle {
      cursor: grab;
      color: #71717a;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 4px 2px;
      border-radius: 6px;
      transition: color 0.15s, background-color 0.15s;
    }

    .cqb-drag-handle:hover {
      color: #e4e4e7;
      background: rgba(255, 255, 255, 0.06);
    }

    .cqb-drag-handle:active {
      cursor: grabbing;
    }

    .cqb-drag-handle svg {
      width: 14px;
      height: 14px;
      fill: currentColor;
    }

    /* Minimize / Collapse Toggle */
    .cqb-btn-collapse {
      background: transparent;
      border: none;
      color: #71717a;
      width: 24px;
      height: 24px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.15s ease;
      padding: 0;
    }

    .cqb-btn-collapse:hover {
      color: #f4f4f5;
      background: rgba(255, 255, 255, 0.08);
    }

    .cqb-btn-collapse svg {
      width: 14px;
      height: 14px;
      fill: none;
      stroke: currentColor;
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
      transition: transform 0.2s ease;
    }

    /* Collapsed Toolbar State */
    .cqb-toolbar-wrapper.collapsed .cqb-toolbar-buttons,
    .cqb-toolbar-wrapper.collapsed .cqb-btn-add {
      display: none !important;
    }

    .cqb-toolbar-wrapper.collapsed .cqb-btn-collapse svg {
      transform: rotate(180deg);
    }

    .cqb-toolbar-wrapper.collapsed .cqb-toolbar {
      padding: 4px 6px;
      border-radius: 20px;
    }

    .cqb-collapsed-indicator {
      display: none;
      font-size: 11px;
      font-weight: 600;
      color: #a1a1aa;
      padding: 0 4px;
      cursor: pointer;
    }

    .cqb-toolbar-wrapper.collapsed .cqb-collapsed-indicator {
      display: inline-block;
    }

    /* Buttons Container */
    .cqb-toolbar-buttons {
      display: flex;
      align-items: center;
      gap: 6px;
      overflow-x: auto;
      max-width: calc(85vw - 120px);
      padding: 2px 0;
      scrollbar-width: thin;
      scrollbar-color: #3f3f46 transparent;
    }

    .cqb-toolbar-buttons::-webkit-scrollbar {
      height: 4px;
    }

    .cqb-toolbar-buttons::-webkit-scrollbar-thumb {
      background: #3f3f46;
      border-radius: 4px;
    }

    /* Individual Quick Buttons */
    .cqb-custom-btn {
      position: relative;
      height: 34px;
      min-width: 38px;
      padding: 0 12px;
      border-radius: 7px;
      border: 1px solid rgba(255, 255, 255, 0.12);
      font-size: 13px;
      font-weight: 500;
      letter-spacing: 0.01em;
      white-space: nowrap;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
      transition: transform 0.15s ease, box-shadow 0.15s ease, filter 0.15s ease;
      touch-action: none;
    }

    .cqb-custom-btn:hover {
      transform: translateY(-1px);
      filter: brightness(1.08);
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
    }

    .cqb-custom-btn:active {
      transform: translateY(1px);
      filter: brightness(0.95);
    }

    /* Dragging States */
    .cqb-custom-btn.cqb-dragging {
      opacity: 0.45;
      transform: scale(0.96);
      cursor: grabbing;
      box-shadow: 0 8px 16px rgba(0, 0, 0, 0.4);
    }

    .cqb-custom-btn.cqb-drag-over-left {
      border-left: 3px solid #6366f1 !important;
      padding-left: 9px;
    }

    .cqb-custom-btn.cqb-drag-over-right {
      border-right: 3px solid #6366f1 !important;
      padding-right: 9px;
    }

    /* Plus (+) Button */
    .cqb-btn-add {
      height: 34px;
      width: 34px;
      min-width: 34px;
      border-radius: 7px;
      border: 1px dashed #6366f1;
      background: rgba(99, 102, 241, 0.14);
      color: #a5b4fc;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-size: 18px;
      font-weight: 500;
      transition: all 0.15s ease;
      flex-shrink: 0;
    }

    .cqb-btn-add:hover {
      background: #6366f1;
      color: #ffffff;
      border-style: solid;
      transform: translateY(-1px);
      box-shadow: 0 4px 10px rgba(99, 102, 241, 0.4);
    }

    .cqb-btn-add svg {
      width: 16px;
      height: 16px;
      fill: none;
      stroke: currentColor;
      stroke-width: 2.2;
      stroke-linecap: round;
      stroke-linejoin: round;
    }

    /* Tooltip */
    .cqb-tooltip {
      position: absolute;
      bottom: calc(100% + 8px);
      left: 50%;
      transform: translateX(-50%) translateY(4px);
      background: #18181b;
      color: #f4f4f5;
      border: 1px solid #3f3f46;
      border-radius: 6px;
      padding: 4px 8px;
      font-size: 11px;
      white-space: nowrap;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.15s ease, transform 0.15s ease;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.35);
      z-index: 100;
    }

    .cqb-has-tooltip:hover .cqb-tooltip {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }

    /* Context Menu */
    .cqb-context-menu {
      position: fixed;
      z-index: 2147483647;
      background: #18181b;
      border: 1px solid #3f3f46;
      border-radius: 8px;
      padding: 5px;
      min-width: 190px;
      box-shadow: 0 10px 25px -5px rgba(0,0,0,0.6), 0 8px 10px -6px rgba(0,0,0,0.5);
      pointer-events: auto;
      user-select: none;
      display: flex;
      flex-direction: column;
      gap: 2px;
      animation: cqbFadeIn 0.12s ease-out;
    }

    .cqb-menu-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 7px 10px;
      border-radius: 5px;
      color: #e4e4e7;
      font-size: 12px;
      cursor: pointer;
      background: transparent;
      border: none;
      width: 100%;
      text-align: left;
      transition: background-color 0.1s, color 0.1s;
    }

    .cqb-menu-item:hover {
      background: rgba(99, 102, 241, 0.2);
      color: #ffffff;
    }

    .cqb-menu-item.danger {
      color: #f87171;
    }

    .cqb-menu-item.danger:hover {
      background: rgba(239, 68, 68, 0.2);
      color: #fca5a5;
    }

    .cqb-menu-separator {
      height: 1px;
      background: #27272a;
      margin: 3px 0;
    }

    .cqb-menu-icon {
      width: 14px;
      height: 14px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    /* In-Page Modal Dialog */
    .cqb-modal-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.65);
      backdrop-filter: blur(4px);
      -webkit-backdrop-filter: blur(4px);
      z-index: 2147483647;
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: auto;
      animation: cqbFadeIn 0.15s ease-out;
    }

    .cqb-modal {
      background: #18181b;
      border: 1px solid #3f3f46;
      border-radius: 12px;
      width: 440px;
      max-width: calc(100vw - 32px);
      max-height: calc(100vh - 40px);
      box-shadow: 0 20px 35px -5px rgba(0,0,0,0.8), 0 10px 15px -5px rgba(0,0,0,0.6);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      color: #f4f4f5;
      animation: cqbScaleUp 0.18s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .cqb-modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 18px;
      border-bottom: 1px solid #27272a;
      background: #1e1e24;
    }

    .cqb-modal-title {
      font-size: 15px;
      font-weight: 600;
      color: #f4f4f5;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .cqb-modal-close {
      background: transparent;
      border: none;
      color: #a1a1aa;
      cursor: pointer;
      width: 28px;
      height: 28px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      transition: all 0.15s;
    }

    .cqb-modal-close:hover {
      background: rgba(255, 255, 255, 0.1);
      color: #ffffff;
    }

    .cqb-modal-body {
      padding: 18px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .cqb-form-group {
      display: flex;
      flex-direction: column;
      gap: 5px;
    }

    .cqb-label {
      font-size: 12px;
      font-weight: 500;
      color: #a1a1aa;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .cqb-input {
      background: #27272a;
      border: 1px solid #3f3f46;
      border-radius: 7px;
      padding: 8px 11px;
      color: #f4f4f5;
      font-size: 13px;
      outline: none;
      transition: border-color 0.15s, box-shadow 0.15s;
    }

    .cqb-input:focus {
      border-color: #6366f1;
      box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.3);
    }

    /* Color picker row */
    .cqb-color-row {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    .cqb-color-swatch {
      width: 26px;
      height: 26px;
      border-radius: 50%;
      cursor: pointer;
      border: 2px solid transparent;
      transition: transform 0.15s, border-color 0.15s;
      flex-shrink: 0;
    }

    .cqb-color-swatch:hover {
      transform: scale(1.15);
    }

    .cqb-color-swatch.active {
      border-color: #ffffff;
      box-shadow: 0 0 0 2px #6366f1;
    }

    .cqb-native-color-picker {
      width: 32px;
      height: 32px;
      border: 1px solid #3f3f46;
      border-radius: 6px;
      background: #27272a;
      cursor: pointer;
      padding: 1px;
    }

    .cqb-text-color-toggle {
      display: flex;
      background: #27272a;
      border: 1px solid #3f3f46;
      border-radius: 7px;
      padding: 2px;
      gap: 2px;
      width: fit-content;
    }

    .cqb-text-color-btn {
      background: transparent;
      border: none;
      padding: 4px 10px;
      border-radius: 5px;
      font-size: 12px;
      font-weight: 500;
      color: #a1a1aa;
      cursor: pointer;
      transition: all 0.12s;
    }

    .cqb-text-color-btn.active {
      background: #3f3f46;
      color: #ffffff;
      box-shadow: 0 1px 3px rgba(0,0,0,0.3);
    }

    /* Function assignment box */
    .cqb-function-box {
      border: 1px dashed #3f3f46;
      border-radius: 8px;
      padding: 12px;
      background: #1e1e24;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .cqb-function-status {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      color: #a1a1aa;
    }

    .cqb-function-status.assigned {
      color: #34d399;
    }

    .cqb-target-info {
      font-size: 11px;
      color: #94a3b8;
      background: #141416;
      padding: 6px 10px;
      border-radius: 5px;
      border: 1px solid #27272a;
      font-family: monospace;
      word-break: break-all;
    }

    .cqb-btn-assign {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      background: #27272a;
      border: 1px solid #3f3f46;
      color: #e4e4e7;
      padding: 7px 12px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.15s;
    }

    .cqb-btn-assign:hover {
      background: #3f3f46;
      color: #ffffff;
      border-color: #6366f1;
    }

    /* Live Preview Section */
    .cqb-preview-container {
      background: #141416;
      border: 1px solid #27272a;
      border-radius: 8px;
      padding: 14px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 6px;
    }

    .cqb-preview-label {
      font-size: 11px;
      color: #71717a;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    /* Modal Footer */
    .cqb-modal-footer {
      padding: 12px 18px;
      background: #1e1e24;
      border-top: 1px solid #27272a;
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 8px;
    }

    .cqb-btn-secondary {
      background: #27272a;
      border: 1px solid #3f3f46;
      color: #d4d4d8;
      padding: 7px 14px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 500;
      transition: all 0.15s;
    }

    .cqb-btn-secondary:hover {
      background: #3f3f46;
      color: #ffffff;
    }

    .cqb-btn-primary {
      background: #6366f1;
      border: 1px solid #4f46e5;
      color: #ffffff;
      padding: 7px 16px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 500;
      box-shadow: 0 2px 4px rgba(99, 102, 241, 0.3);
      transition: all 0.15s;
    }

    .cqb-btn-primary:hover {
      background: #4f46e5;
      transform: translateY(-1px);
      box-shadow: 0 4px 8px rgba(99, 102, 241, 0.4);
    }

    /* Inspector Bar & Overlay */
    .cqb-inspector-bar {
      position: fixed;
      top: 16px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(24, 24, 27, 0.96);
      backdrop-filter: blur(10px);
      border: 1px solid #6366f1;
      border-radius: 30px;
      padding: 8px 18px;
      color: #f4f4f5;
      font-size: 13px;
      font-weight: 500;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6), 0 0 15px rgba(99, 102, 241, 0.4);
      z-index: 2147483647;
      pointer-events: auto;
      display: flex;
      align-items: center;
      gap: 12px;
      animation: cqbSlideDown 0.2s ease-out;
    }

    .cqb-inspector-cancel {
      background: rgba(239, 68, 68, 0.2);
      border: 1px solid rgba(239, 68, 68, 0.5);
      color: #fca5a5;
      padding: 3px 10px;
      border-radius: 12px;
      font-size: 11px;
      cursor: pointer;
      transition: all 0.15s;
    }

    .cqb-inspector-cancel:hover {
      background: #ef4444;
      color: #ffffff;
    }

    .cqb-inspector-box {
      position: fixed;
      pointer-events: none;
      border: 2px solid #6366f1;
      background: rgba(99, 102, 241, 0.18);
      border-radius: 4px;
      z-index: 2147483646;
      transition: top 0.05s ease-out, left 0.05s ease-out, width 0.05s ease-out, height 0.05s ease-out;
      box-shadow: 0 0 10px rgba(99, 102, 241, 0.5);
    }

    .cqb-inspector-tag {
      position: absolute;
      top: -24px;
      left: 0;
      background: #6366f1;
      color: #ffffff;
      padding: 2px 6px;
      font-size: 11px;
      font-weight: 600;
      border-radius: 3px;
      white-space: nowrap;
      pointer-events: none;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
    }

    /* Toast Notification */
    .cqb-toast-container {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 2147483647;
      display: flex;
      flex-direction: column;
      gap: 8px;
      pointer-events: none;
    }

    .cqb-toast {
      pointer-events: auto;
      background: #18181b;
      border: 1px solid #3f3f46;
      border-radius: 8px;
      padding: 10px 14px;
      color: #f4f4f5;
      font-size: 13px;
      box-shadow: 0 10px 20px rgba(0,0,0,0.4);
      display: flex;
      align-items: center;
      gap: 10px;
      max-width: 380px;
      animation: cqbSlideInRight 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      transition: opacity 0.2s, transform 0.2s;
    }

    .cqb-toast.success { border-left: 3px solid #10b981; }
    .cqb-toast.error   { border-left: 3px solid #ef4444; }
    .cqb-toast.warning { border-left: 3px solid #f59e0b; }
    .cqb-toast.info    { border-left: 3px solid #6366f1; }

    .cqb-toast-action {
      background: #27272a;
      border: 1px solid #3f3f46;
      color: #e4e4e7;
      padding: 3px 8px;
      border-radius: 4px;
      font-size: 11px;
      cursor: pointer;
      margin-left: auto;
      white-space: nowrap;
    }

    .cqb-toast-action:hover {
      background: #3f3f46;
      color: #ffffff;
    }

    /* Keyframes */
    @keyframes cqbFadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes cqbScaleUp {
      from { opacity: 0; transform: scale(0.95); }
      to { opacity: 1; transform: scale(1); }
    }

    @keyframes cqbSlideDown {
      from { opacity: 0; transform: translate(-50%, -10px); }
      to { opacity: 1; transform: translate(-50%, 0); }
    }

    @keyframes cqbSlideInRight {
      from { opacity: 0; transform: translateX(20px); }
      to { opacity: 1; transform: translateX(0); }
    }
  `;

  window.CQB_SHADOW_STYLES = SHADOW_STYLES;
})(typeof window !== 'undefined' ? window : this);
