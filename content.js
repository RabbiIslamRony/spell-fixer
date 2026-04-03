// Spell Fixer — Content Script
// Requires: dictionary.js (window.SPELL_DICT)
//           spellchecker.js (window.isCorrect, window.getSuggestions)

(function () {
  'use strict';

  // ── Guard against double-injection ──────────────────────────────────────────
  if (window.__sfLoaded) return;
  window.__sfLoaded = true;

  // ── State ────────────────────────────────────────────────────────────────────
  let enabled        = true;
  let userWords      = [];
  let siteDisabled   = false;
  let autoCorrect    = true;
  let highlightColor = '#E24B4A';

  const ignoredWords = new Set();  // session-only ignored words
  const fieldStats   = new Map();  // el → { checked, errors }

  // WeakMap<el, HTMLDivElement>              – mirror div for input/textarea
  const mirrors  = new WeakMap();
  // WeakMap<el, number>                     – debounce timer id
  const timers   = new WeakMap();
  // WeakMap<el, Array<{word,start,end}>>    – misspelled char-ranges
  const ranges   = new WeakMap();
  // WeakSet<el>                             – already-attached fields
  const attached = new WeakSet();

  let activePopup = null;   // currently visible popup node
  let popupMeta   = null;   // { word, normWord, el, start, end, span, isCE }

  // ── Field selector ───────────────────────────────────────────────────────────
  const SELECTOR = [
    'input[type="text"]:not([readonly]):not([disabled])',
    'input[type="search"]:not([readonly]):not([disabled])',
    'input:not([type]):not([readonly]):not([disabled])',
    'textarea:not([readonly]):not([disabled])',
    '[contenteditable="true"]:not([readonly])',
    '[contenteditable=""]:not([readonly])'
  ].join(',');

  // ── Tokeniser ────────────────────────────────────────────────────────────────
  // Splits text into word tokens ([A-Za-z']+) and non-word tokens, each with
  // their character start index preserved.
  function tokenise(str) {
    const re = /([A-Za-z']+)|([^A-Za-z']+)/g;
    const tokens = [];
    let m;
    while ((m = re.exec(str)) !== null) {
      tokens.push({ text: m[0], isWord: !!m[1], start: m.index });
    }
    return tokens;
  }

  // ── Misspelling check (includes session-ignored words) ──────────────────────
  function isMisspelled(word) {
    if (window.isCorrect(word, userWords)) return false;
    const norm = word.toLowerCase()
      .replace(/[^a-z']/g, '').replace(/^'+|'+$/g, '').replace(/'s$/, '');
    return !ignoredWords.has(norm);
  }

  // ── Highlight color ───────────────────────────────────────────────────────────
  function applyHighlightColor(color) {
    highlightColor = color;
    let styleEl = document.getElementById('sf-color-style');
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'sf-color-style';
      document.head.appendChild(styleEl);
    }
    styleEl.textContent =
      '.sf-error { border-bottom-color: ' + color + ' !important; } ' +
      '[contenteditable] .sf-error { background: ' + color + '1a !important; }';
  }

  // ── Initialise from storage ──────────────────────────────────────────────────
  chrome.storage.local.get(['enabled', 'userWords', 'disabledSites', 'autoCorrect', 'highlightColor'], function (data) {
    enabled      = data.enabled !== false;
    userWords    = data.userWords || [];
    siteDisabled = (data.disabledSites || []).includes(window.location.hostname);
    autoCorrect  = data.autoCorrect !== false;
    applyHighlightColor(data.highlightColor || '#E24B4A');
    if (enabled && !siteDisabled) {
      attachAll();
      // Re-sync mirror geometry after web fonts finish loading.
      // Many sites (like those using Google Fonts) swap fonts after document_idle,
      // which changes character widths and shifts underline positions.
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(function () {
          if (!enabled || siteDisabled) return;
          document.querySelectorAll(SELECTOR).forEach(function (el) {
            if (!isInputOrTextarea(el)) return;
            const mirror = mirrors.get(el);
            if (mirror && mirror.isConnected) syncMirrorGeometry(el, mirror);
          });
          recheckAll();
        });
      }
    }
  });

  chrome.storage.onChanged.addListener(function (changes) {
    if ('enabled' in changes) {
      enabled = changes.enabled.newValue;
      if (enabled && !siteDisabled) { attachAll(); recheckAll(); }
      else                            detachAll();
    }
    if ('userWords' in changes) {
      userWords = changes.userWords.newValue || [];
      recheckAll();
    }
    if ('disabledSites' in changes) {
      siteDisabled = (changes.disabledSites.newValue || []).includes(window.location.hostname);
      if (siteDisabled)        detachAll();
      else if (enabled)        { attachAll(); recheckAll(); }
    }
    if ('autoCorrect' in changes) {
      autoCorrect = changes.autoCorrect.newValue !== false;
    }
    if ('highlightColor' in changes) {
      applyHighlightColor(changes.highlightColor.newValue || '#E24B4A');
    }
  });

  // ── Attach / Detach ──────────────────────────────────────────────────────────
  function attachAll() {
    document.querySelectorAll(SELECTOR).forEach(attachField);
  }

  function detachAll() {
    // Remove mirror divs from DOM
    document.querySelectorAll('.sf-mirror').forEach(function (m) { m.remove(); });
    // Unwrap sf-error spans in contenteditables
    document.querySelectorAll('.sf-error').forEach(unwrapSpan);
    // Restore input backgrounds
    document.querySelectorAll('.sf-field-active').forEach(function (el) {
      el.classList.remove('sf-field-active');
    });
    closePopup();
  }

  function recheckAll() {
    document.querySelectorAll(SELECTOR).forEach(function (el) {
      if (attached.has(el)) runCheck(el);
    });
  }

  function attachField(el) {
    if (attached.has(el)) return;
    if (isSkippedType(el)) return;
    attached.add(el);

    if (isInputOrTextarea(el)) {
      buildMirror(el);
      el.classList.add('sf-field-active');

      el.addEventListener('keydown', function (e) {
        if (!autoCorrect || !enabled || siteDisabled) return;
        if (e.key !== ' ' && e.key !== 'Enter') return;
        const before   = el.value.slice(0, el.selectionStart);
        const match    = before.match(/([A-Za-z']+)$/);
        if (!match) return;
        const original = match[1];
        const mapped   = window.AUTOCORRECT_MAP[original.toLowerCase()];
        if (!mapped) return;
        // Preserve initial capital (e.g. "Teh" → "The"), skip ALL-CAPS / CamelCase
        if (/[A-Z]/.test(original.slice(1))) return;  // CamelCase or ALL-CAPS — skip
        const correction = /^[A-Z]/.test(original)
          ? mapped[0].toUpperCase() + mapped.slice(1)
          : mapped;
        const wordStart = el.selectionStart - original.length;
        const after     = el.value.slice(el.selectionStart);
        el.value = el.value.slice(0, wordStart) + correction + after;
        const newPos = wordStart + correction.length;
        el.setSelectionRange(newPos, newPos);
        el.dispatchEvent(new Event('input', { bubbles: true }));
      });
    }

    el.addEventListener('input',  function ()  { debouncedCheck(el); });
    el.addEventListener('scroll', function ()  { syncMirrorScroll(el); });
    el.addEventListener('click',  function (e) {
      // Use setTimeout so selectionStart is up-to-date (Chrome sets it sync,
      // but the timeout costs nothing and is safe cross-browser).
      setTimeout(function () { handleInputClick(e, el); }, 0);
    });

    if (enabled) debouncedCheck(el);
  }

  function isSkippedType(el) {
    const t = (el.getAttribute('type') || '').toLowerCase();
    return t === 'password' || t === 'hidden' || t === 'email' ||
           t === 'number'   || t === 'tel'    || t === 'url'   ||
           t === 'color'    || t === 'date'   || t === 'time'  ||
           t === 'range'    || t === 'file';
  }

  function isInputOrTextarea(el) {
    return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA';
  }

  // ── Mirror Div ───────────────────────────────────────────────────────────────
  // A transparent overlay (position:fixed, pointer-events:none, z-index:99998)
  // that sits on top of the real field. Its text is color:transparent so only
  // the red border-bottom on .sf-error spans is visible to the user. The real
  // field has background:transparent so the underlines show through.

  const MIRROR_PROPS = [
    'fontFamily','fontSize','fontWeight','fontStyle','fontVariant','fontStretch',
    'lineHeight','letterSpacing','wordSpacing','textTransform','textIndent',
    'paddingTop','paddingRight','paddingBottom','paddingLeft',
    'borderTopWidth','borderRightWidth','borderBottomWidth','borderLeftWidth',
    'borderTopStyle','borderRightStyle','borderBottomStyle','borderLeftStyle',
    'boxSizing','tabSize'
  ];

  function buildMirror(el) {
    const mirror = document.createElement('div');
    mirror.className = 'sf-mirror';
    document.body.appendChild(mirror);
    mirrors.set(el, mirror);
    syncMirrorGeometry(el, mirror);
  }

  function syncMirrorGeometry(el, mirror) {
    const cs   = window.getComputedStyle(el);
    const rect = el.getBoundingClientRect();

    MIRROR_PROPS.forEach(function (p) { mirror.style[p] = cs[p]; });

    // textarea wraps; single-line input clips horizontally
    if (el.tagName === 'TEXTAREA') {
      mirror.style.whiteSpace    = 'pre-wrap';
      mirror.style.overflowWrap  = 'break-word';
    } else {
      mirror.style.whiteSpace    = 'pre';
      mirror.style.overflowWrap  = 'normal';
    }
    mirror.style.overflow = 'hidden';

    mirror.style.top    = rect.top    + 'px';
    mirror.style.left   = rect.left   + 'px';
    mirror.style.width  = rect.width  + 'px';
    mirror.style.height = rect.height + 'px';
  }

  function syncMirrorScroll(el) {
    const mirror = mirrors.get(el);
    if (mirror && mirror.isConnected) {
      mirror.scrollTop  = el.scrollTop;
      mirror.scrollLeft = el.scrollLeft;
    }
  }

  // ── Single module-level scroll / resize listeners ────────────────────────────
  // These handle all mirrors at once — avoids N listeners for N fields.
  let scrollRafPending = false;
  window.addEventListener('scroll', function () {
    if (scrollRafPending) return;
    scrollRafPending = true;
    requestAnimationFrame(function () {
      scrollRafPending = false;
      document.querySelectorAll(SELECTOR).forEach(function (el) {
        if (!isInputOrTextarea(el)) return;
        const mirror = mirrors.get(el);
        if (!mirror || !mirror.isConnected) return;
        const rect = el.getBoundingClientRect();
        mirror.style.top  = rect.top  + 'px';
        mirror.style.left = rect.left + 'px';
      });
    });
  }, { passive: true, capture: true });

  window.addEventListener('resize', function () {
    document.querySelectorAll(SELECTOR).forEach(function (el) {
      if (!isInputOrTextarea(el)) return;
      const mirror = mirrors.get(el);
      if (!mirror || !mirror.isConnected) return;
      syncMirrorGeometry(el, mirror);
    });
  }, { passive: true });

  // ── Debounce + Run ───────────────────────────────────────────────────────────
  function debouncedCheck(el) {
    clearTimeout(timers.get(el));
    timers.set(el, setTimeout(function () { runCheck(el); }, 300));
  }

  function runCheck(el) {
    if (!enabled || siteDisabled) return;
    if (isInputOrTextarea(el)) updateMirror(el);
    else                       checkContentEditable(el);
  }

  // ── Mirror Update (input / textarea) ─────────────────────────────────────────
  function updateMirror(el) {
    let mirror = mirrors.get(el);

    // If the mirror was removed from the DOM (e.g. after disable→re-enable),
    // rebuild it rather than silently doing nothing.
    if (!mirror || !mirror.isConnected) {
      buildMirror(el);
      el.classList.add('sf-field-active');
      mirror = mirrors.get(el);
    }
    if (!mirror) return;

    syncMirrorGeometry(el, mirror);

    const tokens     = tokenise(el.value);
    const wordRanges = [];
    const frag       = document.createDocumentFragment();
    let wordsChecked = 0, errorCount = 0;

    tokens.forEach(function (tok) {
      if (tok.isWord) {
        wordsChecked++;
        if (isMisspelled(tok.text)) {
          errorCount++;
          const span = document.createElement('span');
          span.className = 'sf-error';
          span.appendChild(document.createTextNode(tok.text));
          frag.appendChild(span);
          wordRanges.push({ word: tok.text, start: tok.start, end: tok.start + tok.text.length });
        } else {
          frag.appendChild(document.createTextNode(tok.text));
        }
      } else {
        frag.appendChild(document.createTextNode(tok.text));
      }
    });

    fieldStats.set(el, { checked: wordsChecked, errors: errorCount });

    // Clear without innerHTML
    while (mirror.firstChild) mirror.removeChild(mirror.firstChild);
    mirror.appendChild(frag);

    syncMirrorScroll(el);
    ranges.set(el, wordRanges);
  }

  // ── ContentEditable Check ────────────────────────────────────────────────────
  function checkContentEditable(el) {
    if (el.__sfProcessing) return;
    el.__sfProcessing = true;
    try {
      const isFocused   = document.activeElement === el;
      const caretOffset = isFocused ? getCaretOffset(el) : -1;

      // Remove all existing error spans (restore plain text)
      el.querySelectorAll('.sf-error').forEach(unwrapSpan);
      el.normalize();

      // Walk text nodes and annotate misspellings
      const walker = document.createTreeWalker(
        el, NodeFilter.SHOW_TEXT,
        {
          acceptNode: function (node) {
            const p = node.parentElement;
            if (!p) return NodeFilter.FILTER_REJECT;
            const t = p.tagName;
            if (t === 'SCRIPT' || t === 'STYLE' || t === 'NOSCRIPT')
              return NodeFilter.FILTER_REJECT;
            return NodeFilter.FILTER_ACCEPT;
          }
        }
      );

      const textNodes = [];
      let n;
      while ((n = walker.nextNode())) textNodes.push(n);

      let wordsChecked = 0, errorCount = 0;

      textNodes.forEach(function (textNode) {
        const tokens = tokenise(textNode.nodeValue);
        let hasBad = false;
        tokens.forEach(function (t) {
          if (!t.isWord) return;
          wordsChecked++;
          if (isMisspelled(t.text)) { hasBad = true; errorCount++; }
        });
        if (!hasBad) return;

        const frag = document.createDocumentFragment();
        tokens.forEach(function (tok) {
          if (tok.isWord && isMisspelled(tok.text)) {
            const span = document.createElement('span');
            span.className      = 'sf-error';
            span.dataset.sfWord = tok.text;
            span.appendChild(document.createTextNode(tok.text));
            frag.appendChild(span);
          } else {
            frag.appendChild(document.createTextNode(tok.text));
          }
        });
        textNode.parentNode.replaceChild(frag, textNode);
      });

      fieldStats.set(el, { checked: wordsChecked, errors: errorCount });

      if (isFocused && caretOffset >= 0) setCaretOffset(el, caretOffset);
    } finally {
      el.__sfProcessing = false;
    }
  }

  function unwrapSpan(span) {
    if (span.parentNode) {
      span.parentNode.replaceChild(document.createTextNode(span.textContent), span);
    }
  }

  // ── Caret helpers for contenteditable ────────────────────────────────────────
  function getCaretOffset(root) {
    const sel = window.getSelection();
    if (!sel || !sel.rangeCount) return 0;
    const pre = sel.getRangeAt(0).cloneRange();
    pre.selectNodeContents(root);
    pre.setEnd(sel.getRangeAt(0).startContainer, sel.getRangeAt(0).startOffset);
    return pre.toString().length;
  }

  function setCaretOffset(root, target) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let count = 0, node;
    while ((node = walker.nextNode())) {
      const len = node.nodeValue.length;
      if (count + len >= target) {
        try {
          const r = document.createRange();
          r.setStart(node, target - count);
          r.collapse(true);
          const sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(r);
        } catch (_) {}
        return;
      }
      count += len;
    }
  }

  // ── Click Handling ────────────────────────────────────────────────────────────
  function handleInputClick(e, el) {
    updateMirror(el);  // ensure ranges reflect the current value before hit-testing
    const pos  = el.selectionStart;
    const hit  = (ranges.get(el) || []).find(function (r) {
      return pos >= r.start && pos <= r.end;
    });
    if (hit) showPopup(e.clientX, e.clientY, hit.word, el, hit.start, hit.end, false, null);
    else     closePopup();
  }

  // Capture-phase click handler handles both:
  //  • clicks on .sf-error spans inside contenteditables
  //  • clicks outside the popup (to close it)
  document.addEventListener('click', function (e) {
    const span = e.target.closest && e.target.closest('.sf-error');
    if (span) {
      const ce = span.closest('[contenteditable]');
      if (ce) {
        // Don't preventDefault — let the browser place the cursor too
        showPopup(e.clientX, e.clientY,
          span.dataset.sfWord || span.textContent,
          ce, null, null, true, span);
        return;
      }
    }
    if (activePopup && !activePopup.contains(e.target)) closePopup();
  }, true);

  // ── Popup ─────────────────────────────────────────────────────────────────────
  function showPopup(clientX, clientY, word, el, start, end, isCE, span) {
    closePopup();

    const normWord = word.toLowerCase()
      .replace(/[^a-z']/g, '')
      .replace(/^'+|'+$/g, '')
      .replace(/'s$/, '');

    popupMeta = { word, normWord, el, start, end, isCE, span };

    const suggestions = window.getSuggestions(word, userWords);
    const popup = document.createElement('div');
    popup.className = 'sf-popup';

    // ── Header: shows the misspelled word in red ──
    const header = document.createElement('div');
    header.className = 'sf-popup-header';

    const xMark = document.createElement('span');
    xMark.className = 'sf-popup-header-x';
    xMark.appendChild(document.createTextNode('✗'));

    const wordEl = document.createElement('span');
    wordEl.className = 'sf-popup-header-word';
    wordEl.appendChild(document.createTextNode(word));

    header.appendChild(xMark);
    header.appendChild(wordEl);
    popup.appendChild(header);

    // ── Suggestions ──
    if (suggestions.length === 0) {
      const empty = document.createElement('span');
      empty.className = 'sf-popup-empty';
      empty.appendChild(document.createTextNode('No suggestions found'));
      popup.appendChild(empty);
    } else {
      const label = document.createElement('span');
      label.className = 'sf-popup-label';
      label.appendChild(document.createTextNode('Did you mean'));
      popup.appendChild(label);

      suggestions.forEach(function (s) {
        const btn = document.createElement('button');
        btn.type      = 'button';
        btn.className = 'sf-popup-item';
        btn.appendChild(document.createTextNode(s.word));
        btn.addEventListener('mousedown', function (e) {
          e.preventDefault();
          applyReplacement(s.word);
          closePopup();
        });
        popup.appendChild(btn);
      });
    }

    // ── Divider ──
    const divider = document.createElement('div');
    divider.className = 'sf-popup-divider';
    popup.appendChild(divider);

    // ── Ignore once ──
    const ignoreBtn = document.createElement('button');
    ignoreBtn.type      = 'button';
    ignoreBtn.className = 'sf-popup-item sf-popup-ignore';
    ignoreBtn.appendChild(document.createTextNode('Ignore once'));
    ignoreBtn.addEventListener('mousedown', function (e) {
      e.preventDefault();
      ignoredWords.add(popupMeta.normWord || popupMeta.word.toLowerCase());
      recheckAll();
      closePopup();
    });
    popup.appendChild(ignoreBtn);

    // ── Add to dictionary ──
    const addBtn = document.createElement('button');
    addBtn.type      = 'button';
    addBtn.className = 'sf-popup-item sf-popup-add';
    // Label: '+ Add "word"' using the normalised form
    addBtn.appendChild(document.createTextNode('+ Add \u201c' + (normWord || word) + '\u201d'));
    addBtn.addEventListener('mousedown', function (e) {
      e.preventDefault();
      addToUserDict(popupMeta.normWord || popupMeta.word);
      closePopup();
    });
    popup.appendChild(addBtn);

    // ── Position popup — clamp inside viewport ──
    document.body.appendChild(popup);
    const pw = popup.offsetWidth  || 190;
    const ph = popup.offsetHeight || 130;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const GAP = 8;
    let left = clientX + GAP;
    let top  = clientY + GAP;
    if (left + pw > vw - 4) left = clientX - pw - GAP;
    if (top  + ph > vh - 4) top  = clientY - ph - GAP;
    popup.style.left = Math.max(4, left) + 'px';
    popup.style.top  = Math.max(4, top)  + 'px';

    activePopup = popup;

    // ── Keyboard navigation ──
    const btns = Array.from(popup.querySelectorAll('.sf-popup-item'));
    if (btns.length > 0) btns[0].focus();

    popup.addEventListener('keydown', function (e) {
      const items = Array.from(popup.querySelectorAll('.sf-popup-item'));
      const idx   = items.indexOf(document.activeElement);

      if (e.key === 'ArrowDown' || (e.key === 'Tab' && !e.shiftKey)) {
        e.preventDefault();
        items[(idx + 1) % items.length].focus();
      } else if (e.key === 'ArrowUp' || (e.key === 'Tab' && e.shiftKey)) {
        e.preventDefault();
        items[(idx - 1 + items.length) % items.length].focus();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (idx >= 0) items[idx].dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
      } else if (e.key === 'Escape') {
        closePopup();
      }
    });
  }

  function closePopup() {
    if (activePopup) {
      if (activePopup.parentNode) activePopup.parentNode.removeChild(activePopup);
      activePopup = null;
      popupMeta   = null;
    }
  }

  // ── Word Replacement ──────────────────────────────────────────────────────────
  function applyReplacement(replacement) {
    if (!popupMeta) return;
    const { el, start, end, isCE, span, word } = popupMeta;

    if (!isCE) {
      // input / textarea — direct string replacement
      el.value = el.value.slice(0, start) + replacement + el.value.slice(end);
      const newPos = start + replacement.length;
      el.setSelectionRange(newPos, newPos);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    } else {
      // contenteditable — use the stored span reference so we always replace
      // the exact span the user clicked, even if the same word appears multiple times.
      const target = (span && span.isConnected)
        ? span
        : el.querySelector('.sf-error[data-sf-word="' + CSS.escape(word) + '"]');
      if (target && target.parentNode) {
        const textNode = document.createTextNode(replacement);
        target.parentNode.replaceChild(textNode, target);
        try {
          const r = document.createRange();
          r.setStartAfter(textNode);
          r.collapse(true);
          const sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(r);
        } catch (_) {}
        el.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }
  }

  // ── User Dictionary ───────────────────────────────────────────────────────────
  function addToUserDict(word) {
    if (!word) return;
    chrome.storage.local.get('userWords', function (data) {
      const words = data.userWords || [];
      if (!words.includes(word)) {
        words.push(word);
        chrome.storage.local.set({ userWords: words });
        // storage.onChanged fires → recheckAll() runs automatically
      }
    });
  }

  // ── Global Close Triggers ─────────────────────────────────────────────────────
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closePopup();
  });

  document.addEventListener('scroll', function () {
    if (activePopup) closePopup();
  }, { capture: true, passive: true });

  // ── MutationObserver — pick up dynamically added fields (SPAs, etc.) ─────────
  const mutationObs = new MutationObserver(function (mutations) {
    if (!enabled) return;
    mutations.forEach(function (mutation) {
      mutation.addedNodes.forEach(function (node) {
        if (node.nodeType !== Node.ELEMENT_NODE) return;
        if (node.matches && node.matches(SELECTOR))  attachField(node);
        if (node.querySelectorAll) {
          node.querySelectorAll(SELECTOR).forEach(attachField);
        }
      });
    });
  });

  if (document.body) {
    mutationObs.observe(document.body, { childList: true, subtree: true });
  } else {
    document.addEventListener('DOMContentLoaded', function () {
      mutationObs.observe(document.body, { childList: true, subtree: true });
      if (enabled) attachAll();
    });
  }

  // ── Stats message listener ────────────────────────────────────────────────────
  chrome.runtime.onMessage.addListener(function (msg, _sender, sendResponse) {
    if (msg.type === 'GET_STATS') {
      let checked = 0, errors = 0;
      fieldStats.forEach(function (s) { checked += s.checked; errors += s.errors; });
      sendResponse({ checked: checked, errors: errors });
    } else if (msg.type === 'SET_COLOR') {
      applyHighlightColor(msg.color);
    }
  });

})();
