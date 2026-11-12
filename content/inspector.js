/**
 * Custom Quick Buttons - Element Inspector & Picker
 * Interactively highlights and selects elements on the host web page, including elements inside IFRAMES.
 */

(function (window) {
  'use strict';

  class CQBInspector {
    constructor(shadowRoot, rootHostElement) {
      this.shadowRoot = shadowRoot;
      this.rootHostElement = rootHostElement;
      this.isActive = false;
      this.highlightBox = null;
      this.banner = null;
      this.tagTooltip = null;
      this.currentTarget = null;
      this.currentIframe = null;
      this.onSelectCallback = null;
      this.onCancelCallback = null;
      this.attachedDocs = new Set();

      this.handleMouseMove = this.handleMouseMove.bind(this);
      this.handleClick = this.handleClick.bind(this);
      this.handleKeyDown = this.handleKeyDown.bind(this);
    }

    start({ onSelect, onCancel }) {
      if (this.isActive) this.stop();

      this.isActive = true;
      this.onSelectCallback = onSelect;
      this.onCancelCallback = onCancel;
      this.attachedDocs.clear();

      // 1. Create Top Banner
      this.banner = document.createElement('div');
      this.banner.className = 'cqb-inspector-bar';
      this.banner.innerHTML = `
        <span>🎯 <strong>Auswahlmodus:</strong> Bewegen Sie die Maus über den Original-Button und klicken Sie darauf.</span>
        <button type="button" class="cqb-inspector-cancel">Abbrechen (ESC)</button>
      `;

      this.banner.querySelector('.cqb-inspector-cancel').onclick = (e) => {
        e.stopPropagation();
        this.cancel();
      };

      // 2. Create Highlight Box
      this.highlightBox = document.createElement('div');
      this.highlightBox.className = 'cqb-inspector-box';
      this.highlightBox.style.display = 'none';

      this.tagTooltip = document.createElement('div');
      this.tagTooltip.className = 'cqb-inspector-tag';
      this.highlightBox.appendChild(this.tagTooltip);

      this.shadowRoot.appendChild(this.banner);
      this.shadowRoot.appendChild(this.highlightBox);

      // 3. Attach Event Listeners to main document and all accessible iframes
      this.attachToDocument(document);

      // Change cursor
      if (document.body) {
        document.body.style.cursor = 'crosshair';
      }
    }

    attachToDocument(doc) {
      if (!doc || this.attachedDocs.has(doc)) return;
      this.attachedDocs.add(doc);

      try {
        doc.addEventListener('mousemove', this.handleMouseMove, { capture: true, passive: true });
        doc.addEventListener('click', this.handleClick, { capture: true });
        doc.addEventListener('keydown', this.handleKeyDown, { capture: true });

        // Recursively find and attach to iframes
        const iframes = doc.querySelectorAll('iframe, frame');
        iframes.forEach(iframe => {
          try {
            const subDoc = iframe.contentDocument || iframe.contentWindow?.document;
            if (subDoc) {
              this.attachToDocument(subDoc);
            }
          } catch (e) {
            // Cross-origin iframe
          }
        });
      } catch (err) {}
    }

    stop() {
      if (!this.isActive) return;
      this.isActive = false;

      if (this.banner && this.banner.parentNode) {
        this.banner.parentNode.removeChild(this.banner);
      }
      if (this.highlightBox && this.highlightBox.parentNode) {
        this.highlightBox.parentNode.removeChild(this.highlightBox);
      }

      this.banner = null;
      this.highlightBox = null;
      this.tagTooltip = null;
      this.currentTarget = null;
      this.currentIframe = null;

      // Detach from all documents
      this.attachedDocs.forEach(doc => {
        try {
          doc.removeEventListener('mousemove', this.handleMouseMove, { capture: true });
          doc.removeEventListener('click', this.handleClick, { capture: true });
          doc.removeEventListener('keydown', this.handleKeyDown, { capture: true });
        } catch (e) {}
      });
      this.attachedDocs.clear();

      if (document.body) {
        document.body.style.cursor = '';
      }
    }

    cancel() {
      this.stop();
      if (typeof this.onCancelCallback === 'function') {
        this.onCancelCallback();
      }
    }

    /**
     * Resolves an element's absolute viewport coordinates, taking nested iframes into account
     */
    getElementViewportInfo(el) {
      const rect = el.getBoundingClientRect();
      let top = rect.top;
      let left = rect.left;
      let currDoc = el.ownerDocument;
      let parentIframe = null;

      while (currDoc && currDoc !== document) {
        const win = currDoc.defaultView;
        if (!win) break;
        try {
          const parentDoc = win.parent.document;
          const frames = Array.from(parentDoc.querySelectorAll('iframe, frame'));
          const frameEl = frames.find(f => {
            try { return f.contentWindow === win; } catch (e) { return false; }
          });
          if (frameEl) {
            if (!parentIframe) parentIframe = frameEl;
            const fRect = frameEl.getBoundingClientRect();
            top += fRect.top;
            left += fRect.left;
            currDoc = parentDoc;
          } else {
            break;
          }
        } catch (e) {
          break;
        }
      }

      return {
        top,
        left,
        width: rect.width,
        height: rect.height,
        parentIframe
      };
    }

    handleMouseMove(e) {
      if (!this.isActive) return;

      const path = e.composedPath ? e.composedPath() : [];
      if (this.banner && (path.includes(this.banner) || (this.banner.contains && this.banner.contains(e.target)))) {
        if (this.highlightBox) this.highlightBox.style.display = 'none';
        this.currentTarget = null;
        this.currentIframe = null;
        return;
      }

      // Check if mouse event came directly from an element inside an iframe
      let target = e.target;
      const doc = e.currentTarget && e.currentTarget.nodeType === Node.DOCUMENT_NODE ? e.currentTarget : document;

      // If outer window event, determine elementFromPoint
      if (doc === document) {
        target = document.elementFromPoint(e.clientX, e.clientY) || e.target;
      }

      // If hovering over an iframe from the outside, attempt to drill down into the iframe's inner element
      if (target && (target.tagName === 'IFRAME' || target.tagName === 'FRAME')) {
        try {
          const subDoc = target.contentDocument || target.contentWindow?.document;
          if (subDoc) {
            this.attachToDocument(subDoc);
            const fRect = target.getBoundingClientRect();
            const subX = e.clientX - fRect.left;
            const subY = e.clientY - fRect.top;
            const inner = subDoc.elementFromPoint(subX, subY);
            if (inner && inner !== subDoc.documentElement && inner !== subDoc.body) {
              target = inner;
            }
          }
        } catch (err) {}
      }

      if (!target || target === this.rootHostElement || (this.rootHostElement && this.rootHostElement.contains(target)) || (path && path.includes(this.rootHostElement))) {
        if (this.highlightBox) this.highlightBox.style.display = 'none';
        this.currentTarget = null;
        this.currentIframe = null;
        return;
      }

      // Compute viewport coordinates (with iframe offset if inside an iframe)
      const vp = this.getElementViewportInfo(target);
      this.currentTarget = target;
      this.currentIframe = vp.parentIframe;

      if (this.highlightBox) {
        this.highlightBox.style.display = 'block';
        this.highlightBox.style.top = `${vp.top}px`;
        this.highlightBox.style.left = `${vp.left}px`;
        this.highlightBox.style.width = `${vp.width}px`;
        this.highlightBox.style.height = `${vp.height}px`;

        const isIframe = !!vp.parentIframe;
        const tagPrefix = isIframe ? '[iFrame] ' : '';
        const tagName = target.tagName.toLowerCase();
        const id = target.id ? `#${target.id}` : '';
        const rawText = (target.innerText || target.textContent || '').trim().replace(/\s+/g, ' ');
        const textSample = rawText ? ` "${rawText.substring(0, 20)}${rawText.length > 20 ? '...' : ''}"` : '';

        this.tagTooltip.textContent = `${tagPrefix}<${tagName}${id}>${textSample}`;
      }
    }

    handleClick(e) {
      if (!this.isActive) return;

      const path = e.composedPath ? e.composedPath() : [];
      if (this.banner && (path.includes(this.banner) || (this.banner.contains && this.banner.contains(e.target)))) {
        return;
      }

      if (this.rootHostElement && (e.target === this.rootHostElement || (path && path.includes(this.rootHostElement)))) {
        return;
      }

      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      const target = this.currentTarget || e.target;
      if (!target) return;

      try {
        const selectorData = CQBSelector.analyzeElement(target);

        // If element is inside an iframe, record iframe metadata
        if (this.currentIframe) {
          selectorData.isInIframe = true;
          selectorData.iframeSelector = CQBSelector.generateBestSelector(
            this.currentIframe,
            CQBSelector.analyzeElement(this.currentIframe)
          );
        }

        this.stop();

        if (typeof this.onSelectCallback === 'function') {
          this.onSelectCallback(selectorData, target);
        }
      } catch (err) {
        console.error('[CQB Inspector] Error analyzing element:', err);
        this.stop();
        if (typeof this.onCancelCallback === 'function') {
          this.onCancelCallback(err);
        }
      }
    }

    handleKeyDown(e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        this.cancel();
      }
    }
  }

  window.CQBInspector = CQBInspector;
})(typeof window !== 'undefined' ? window : this);
