/**
 * Custom Quick Buttons - Selector & Element Interaction Engine
 * Generates resilient CSS selectors and provides fallback heuristics.
 */

(function (window) {
  'use strict';

  // Patterns that typically indicate auto-generated/dynamic attributes
  const DYNAMIC_PATTERNS = [
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, // UUID
    /^[0-9]+$/,                                                         // Pure number
    /^(ember|react-aria|ng-|vue-|_ng|jsx-|css-)[0-9a-zA-Z_-]+/i,        // Framework internal IDs
    /^[a-z0-9]{20,}$/i                                                  // Long random hash
  ];

  // Ephemeral/state classes to ignore when generating selectors
  const TRANSIENT_CLASSES = new Set([
    'active', 'focus', 'hover', 'selected', 'open', 'opened', 'visible', 'hidden',
    'disabled', 'enabled', 'current', 'show', 'collapsing', 'collapsed',
    'is-active', 'is-open', 'is-focused', 'is-selected', 'is-loading', 'loading'
  ]);

  const CQBSelector = {
    /**
     * Checks if a string looks like a random/dynamic hash or auto-generated ID
     */
    isDynamic(value) {
      if (!value || typeof value !== 'string') return true;
      const str = value.trim();
      if (str.length < 2) return true;
      return DYNAMIC_PATTERNS.some(rx => rx.test(str));
    },

    /**
     * Filters and sanitizes class list
     */
    getStableClasses(element) {
      if (!element || !element.classList) return [];
      const classes = Array.from(element.classList);
      return classes.filter(cls => {
        if (TRANSIENT_CLASSES.has(cls.toLowerCase())) return false;
        if (this.isDynamic(cls)) return false;
        // Avoid utility atomic classes like tailwind w-12, px-4 unless distinctive
        if (/^(p|m|px|py|pt|pb|pl|pr|w|h|text|bg|flex|grid)-[0-9]+/i.test(cls)) return false;
        return true;
      });
    },

    /**
     * Escapes CSS identifiers for querySelector
     */
    escapeCSS(str) {
      if (window.CSS && CSS.escape) {
        return CSS.escape(str);
      }
      return str.replace(/([!"#$%&'()*+,.\/:;<=>?@[\\\]^`{|}~])/g, '\\$1');
    },

    /**
     * Analyzes an element and returns a comprehensive metadata object
     */
    analyzeElement(el) {
      if (!el || el.nodeType !== Node.ELEMENT_NODE) {
        throw new Error('Ungültiges HTML-Element übergeben.');
      }

      const tagName = el.tagName.toLowerCase();
      const rawId = el.getAttribute('id');
      const isIdStable = rawId && !this.isDynamic(rawId);
      const stableClasses = this.getStableClasses(el);

      const attributes = {};
      const targetAttrs = [
        'data-testid', 'data-test', 'data-action', 'data-qa',
        'aria-label', 'name', 'type', 'role', 'title', 'value', 'href'
      ];
      targetAttrs.forEach(attr => {
        const val = el.getAttribute(attr);
        if (val && val.trim().length > 0 && !this.isDynamic(val)) {
          attributes[attr] = val.trim();
        }
      });

      const textContent = (el.innerText || el.textContent || '').trim().replace(/\s+/g, ' ').substring(0, 80);

      // XPath generator
      const xpath = this.generateXPath(el);

      // Primary resilient CSS selector
      const primarySelector = this.generateBestSelector(el, {
        tagName,
        rawId,
        isIdStable,
        stableClasses,
        attributes
      });

      return {
        tagName,
        id: isIdStable ? rawId : null,
        classes: stableClasses,
        attributes,
        textContent,
        xpath,
        primarySelector,
        timestamp: Date.now()
      };
    },

    /**
     * Generates the cleanest, most resilient CSS selector for an element
     */
    generateBestSelector(el, meta) {
      const { tagName, rawId, isIdStable, stableClasses, attributes } = meta;

      // 1. Stable ID
      if (isIdStable) {
        const idSelector = `#${this.escapeCSS(rawId)}`;
        try {
          if (document.querySelectorAll(idSelector).length === 1) {
            return idSelector;
          }
        } catch (e) {}
      }

      // 2. High-priority test/action data-attributes
      const highPriorityAttrs = ['data-testid', 'data-test', 'data-qa', 'data-action'];
      for (const attr of highPriorityAttrs) {
        if (attributes[attr]) {
          const sel = `${tagName}[${attr}="${this.escapeCSS(attributes[attr])}"]`;
          try {
            if (document.querySelectorAll(sel).length === 1) return sel;
          } catch (e) {}
        }
      }

      // 3. Name or aria-label attributes
      if (attributes['name']) {
        const sel = `${tagName}[name="${this.escapeCSS(attributes['name'])}"]`;
        try {
          if (document.querySelectorAll(sel).length === 1) return sel;
        } catch (e) {}
      }

      if (attributes['aria-label']) {
        const sel = `${tagName}[aria-label="${this.escapeCSS(attributes['aria-label'])}"]`;
        try {
          if (document.querySelectorAll(sel).length === 1) return sel;
        } catch (e) {}
      }

      // 4. Stable class combination
      if (stableClasses.length > 0) {
        const classSel = `${tagName}.${stableClasses.map(c => this.escapeCSS(c)).join('.')}`;
        try {
          if (document.querySelectorAll(classSel).length === 1) return classSel;
        } catch (e) {}
      }

      // 5. Hierarchical path: step up to find an anchor with ID/unique data attribute
      let curr = el;
      const pathParts = [];
      let depth = 0;

      while (curr && curr !== document.body && curr !== document.documentElement && depth < 5) {
        const tag = curr.tagName.toLowerCase();
        const cid = curr.getAttribute('id');
        if (cid && !this.isDynamic(cid)) {
          pathParts.unshift(`#${this.escapeCSS(cid)}`);
          break;
        }

        // Try nth-of-type
        let index = 1;
        let sibling = curr.previousElementSibling;
        while (sibling) {
          if (sibling.tagName.toLowerCase() === tag) index++;
          sibling = sibling.previousElementSibling;
        }

        const part = index > 1 ? `${tag}:nth-of-type(${index})` : tag;
        pathParts.unshift(part);

        curr = curr.parentElement;
        depth++;
      }

      if (pathParts.length > 0) {
        const hierarchicalSel = pathParts.join(' > ');
        try {
          if (document.querySelectorAll(hierarchicalSel).length === 1) {
            return hierarchicalSel;
          }
        } catch (e) {}
        return hierarchicalSel;
      }

      return tagName;
    },

    /**
     * Generates a stable XPath expression
     */
    generateXPath(element) {
      if (element.id && !this.isDynamic(element.id)) {
        return `//*[@id="${element.id}"]`;
      }
      const parts = [];
      let curr = element;
      while (curr && curr.nodeType === Node.ELEMENT_NODE && curr !== document.documentElement) {
        let count = 0;
        let sibling = curr.previousSibling;
        while (sibling) {
          if (sibling.nodeType === Node.ELEMENT_NODE && sibling.nodeName === curr.nodeName) {
            count++;
          }
          sibling = sibling.previousSibling;
        }
        const tag = curr.nodeName.toLowerCase();
        parts.unshift(count > 0 ? `${tag}[${count + 1}]` : tag);
        curr = curr.parentNode;
      }
      return '/' + parts.join('/');
    },

    /**
     * Resolves an element on the current page or inside an iframe using selector and resilient fallbacks
     */
    resolveElement(selectorData, rootDoc = null) {
      if (!selectorData) {
        return { status: 'error', message: 'Keine Selektordaten vorhanden.' };
      }

      const doc = rootDoc || (typeof document !== 'undefined' ? document : null);
      if (!doc) return { status: 'error', message: 'Kein Document verfügbar.' };

      // Handle iframe traversal
      if (selectorData.isInIframe && selectorData.iframeSelector) {
        try {
          const iframeEl = doc.querySelector(selectorData.iframeSelector);
          if (iframeEl) {
            const iframeDoc = iframeEl.contentDocument || iframeEl.contentWindow?.document;
            if (iframeDoc) {
              const innerData = { ...selectorData, isInIframe: false };
              return this.resolveElement(innerData, iframeDoc);
            }
          }
        } catch (e) {
          console.warn('[CQB] IFrame traversal warning:', e);
        }
      }

      const { primarySelector, id, attributes, textContent, tagName, xpath } = selectorData;

      // Strategy 1: Direct Primary Selector
      if (primarySelector) {
        try {
          const matches = Array.from(doc.querySelectorAll(primarySelector));
          const visibleMatches = matches.filter(this.isElementVisible);
          if (visibleMatches.length === 1) {
            return { status: 'success', element: visibleMatches[0], matchType: 'primary' };
          } else if (visibleMatches.length > 1) {
            // Pick match with closest text match
            const exactText = visibleMatches.find(el => (el.innerText || el.textContent || '').trim() === textContent);
            if (exactText) {
              return { status: 'success', element: exactText, matchType: 'primary_text_refined' };
            }
            return {
              status: 'multiple',
              element: visibleMatches[0],
              count: visibleMatches.length,
              message: `Mehrere (${visibleMatches.length}) passende Elemente gefunden.`
            };
          }
        } catch (e) {
          console.warn('[CQB] Primary selector error:', e);
        }
      }

      // Strategy 2: ID fallback
      if (id) {
        try {
          const elById = doc.getElementById ? doc.getElementById(id) : doc.querySelector(`#${this.escapeCSS(id)}`);
          if (elById && this.isElementVisible(elById)) {
            return { status: 'success', element: elById, matchType: 'id_fallback' };
          }
        } catch (e) {}
      }

      // Strategy 3: Key Attributes fallback
      if (attributes) {
        for (const attr of ['data-testid', 'data-test', 'data-action', 'aria-label', 'name']) {
          if (attributes[attr]) {
            try {
              const sel = `[${attr}="${this.escapeCSS(attributes[attr])}"]`;
              const matches = Array.from(doc.querySelectorAll(sel)).filter(this.isElementVisible);
              if (matches.length === 1) {
                return { status: 'success', element: matches[0], matchType: 'attribute_fallback' };
              }
            } catch (e) {}
          }
        }
      }

      // Strategy 4: Tag name + text content heuristic
      if (tagName && textContent && textContent.length > 0) {
        try {
          const candidates = Array.from(doc.querySelectorAll(tagName)).filter(this.isElementVisible);
          const matched = candidates.find(el => {
            const txt = (el.innerText || el.textContent || '').trim().replace(/\s+/g, ' ');
            return txt === textContent || txt.includes(textContent);
          });
          if (matched) {
            return { status: 'success', element: matched, matchType: 'text_heuristic' };
          }
        } catch (e) {}
      }

      // Strategy 5: XPath fallback
      if (xpath && doc.evaluate) {
        try {
          const result = doc.evaluate(xpath, doc, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
          if (result && result.singleNodeValue && result.singleNodeValue.nodeType === Node.ELEMENT_NODE) {
            return { status: 'success', element: result.singleNodeValue, matchType: 'xpath_fallback' };
          }
        } catch (e) {}
      }

      return {
        status: 'not_found',
        message: 'Das zugewiesene Original-Element konnte auf dieser Seite nicht gefunden werden.'
      };
    },

    /**
     * Checks if element is actually visible in the DOM
     */
    isElementVisible(el) {
      if (!el || !el.isConnected) return false;
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
        return false;
      }
      const rect = el.getBoundingClientRect();
      // An element with zero dimensions might be an invisible container
      return rect.width > 0 && rect.height > 0;
    },

    /**
     * Triggers realistic click interaction on the target element
     */
    triggerElement(el) {
      if (!el) {
        throw new Error('Kein Element zum Anklicken übergeben.');
      }

      // 1. Smooth scroll into viewport if partially out of view
      try {
        const rect = el.getBoundingClientRect();
        const isInViewport = (
          rect.top >= 0 &&
          rect.left >= 0 &&
          rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
          rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        );
        if (!isInViewport) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
        }
      } catch (e) {}

      // 2. Dispatch complete realistic user event chain
      const rect = el.getBoundingClientRect();
      const clientX = rect.left + rect.width / 2;
      const clientY = rect.top + rect.height / 2;

      const eventOpts = {
        bubbles: true,
        cancelable: true,
        view: window,
        clientX,
        clientY,
        button: 0,
        buttons: 1
      };

      try {
        el.dispatchEvent(new PointerEvent('pointerdown', eventOpts));
      } catch (e) {}

      try {
        el.dispatchEvent(new MouseEvent('mousedown', eventOpts));
      } catch (e) {}

      try {
        if (typeof el.focus === 'function') {
          el.focus({ preventScroll: true });
        }
      } catch (e) {}

      try {
        el.dispatchEvent(new PointerEvent('pointerup', eventOpts));
      } catch (e) {}

      try {
        el.dispatchEvent(new MouseEvent('mouseup', eventOpts));
      } catch (e) {}

      try {
        el.dispatchEvent(new MouseEvent('click', eventOpts));
      } catch (e) {}

      // Native fallback
      try {
        if (typeof el.click === 'function') {
          el.click();
        }
      } catch (e) {}

      // 3. Visual pulse indicator on the target
      this.pulseElement(el);

      return true;
    },

    /**
     * Brief animated pulse on the clicked original element
     */
    pulseElement(el) {
      try {
        const prevTransition = el.style.transition;
        const prevOutline = el.style.outline;
        const prevBoxShadow = el.style.boxShadow;

        el.style.transition = 'all 0.2s ease-in-out';
        el.style.outline = '2px solid #6366f1';
        el.style.boxShadow = '0 0 12px rgba(99, 102, 241, 0.8)';

        setTimeout(() => {
          el.style.transition = prevTransition;
          el.style.outline = prevOutline;
          el.style.boxShadow = prevBoxShadow;
        }, 400);
      } catch (e) {}
    }
  };

  window.CQBSelector = CQBSelector;
})(typeof window !== 'undefined' ? window : this);
