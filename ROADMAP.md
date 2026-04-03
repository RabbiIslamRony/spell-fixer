# Spell Fixer — Implementation Roadmap

> Each season is independent. Complete one fully before moving to the next.
> Check off each task as you finish it.

---

## ✅ Season 0 — Already Done (Current State)

- [x] `manifest.json` — MV3 config
- [x] `dictionary.js` — ~3000 common English words as a Set
- [x] `spellchecker.js` — `isCorrect()` + `getSuggestions()` with Levenshtein distance
- [x] `content.js` — Mirror div + TreeWalker + popup + MutationObserver
- [x] `styles.css` — Highlight + popup styles
- [x] `popup.html` + `popup.js` — On/off toggle with storage sync
- [x] `HOW_IT_WORKS.md` — Full technical documentation

---

## 🔴 Season 1 — Chrome Web Store Ready (Must-Have)

> Without these, the store will reject your submission.

### 1.1 — Extension Icons

- [ ] Design a simple icon (red square with "ab" underline — matches current popup logo)
- [ ] Export as `icons/icon16.png` (16×16)
- [ ] Export as `icons/icon48.png` (48×48)
- [ ] Export as `icons/icon128.png` (128×128)
- [ ] Update `manifest.json`:
  ```json
  "icons": {
    "16":  "icons/icon16.png",
    "48":  "icons/icon48.png",
    "128": "icons/icon128.png"
  },
  "action": {
    "default_popup": "popup.html",
    "default_title": "Spell Fixer",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png"
    }
  }
  ```

### 1.2 — Privacy Policy Page

- [ ] Create `privacy.html` with the following content:
  - Extension name + version
  - "We do not collect any data"
  - "All data (custom words) stored locally via chrome.storage.local"
  - "No network requests are made"
  - "No third-party services used"
  - Contact email
- [ ] Host it on GitHub Pages (free) → get a public URL
- [ ] Save the URL — you'll need it during store submission

### 1.3 — Bigger Dictionary

- [ ] Download the wordlist from: `github.com/dwyl/english-words` → `words_alpha.txt` (370k words, public domain)
- [ ] Filter to top ~50,000 most common words (remove obscure/archaic words)
  - Tool: any online frequency list, e.g. from Project Gutenberg corpus
- [ ] Replace the word array in `dictionary.js` with the new list
- [ ] Test: type "beautiful", "receive", "separate" — should NOT be flagged
- [ ] Test: type "helllo", "wrold" — should still be flagged

### 1.4 — Store Listing Assets

- [ ] Write short description (max 132 characters):
  > "Real-time spell checker for every text box on the web. Works offline. No data sent anywhere."
- [ ] Write detailed description (store page body — 2–3 paragraphs)
- [ ] Take 3–5 screenshots at 1280×800:
  - Screenshot 1: misspelled word with red underline in a text input
  - Screenshot 2: suggestion popup open
  - Screenshot 3: extension popup (on/off toggle)
- [ ] Create promotional tile: 440×280px (required for featuring)
- [ ] Bump version in `manifest.json` to `"1.0.0"`

### 1.5 — Submit to Chrome Web Store

- [ ] Create Google Developer account ($5 one-time fee)
- [ ] Go to `chrome.google.com/webstore/devconsole`
- [ ] Zip the `spell-fixer/` folder (exclude `node_modules`, `.git`, `ROADMAP.md`)
- [ ] Upload zip → fill in listing → add privacy policy URL → submit for review
- [ ] Wait 1–3 business days for approval

---

## 🟡 Season 2 — Per-Site Control

> Users want to disable on banking sites, internal tools, etc.

### 2.1 — Storage schema change

- [ ] Add `disabledSites: []` array to `chrome.storage.local`

### 2.2 — `popup.html` changes

- [ ] Add a second row below the toggle:
  ```
  Disable on this site    [Disable / Enable]
  ```
- [ ] The button label changes based on whether the current hostname is in `disabledSites`

### 2.3 — `popup.js` changes

- [ ] On open: query current tab URL (`chrome.tabs.query`) → get hostname
- [ ] Check if hostname is in `disabledSites` → update button label
- [ ] On button click: add/remove hostname from `disabledSites` → save to storage

### 2.4 — `content.js` changes

- [ ] On init: read `disabledSites` from storage
- [ ] Check `window.location.hostname` against the list
- [ ] If match → skip `attachAll()`, do nothing on this page
- [ ] Listen for `storage.onChanged` for `disabledSites` → reload logic

### 2.5 — `manifest.json` changes

- [ ] Add `"tabs"` permission (needed to query current tab URL from popup)

### 2.6 — Test

- [ ] Open Gmail → disable → no red underlines anywhere on Gmail
- [ ] Open any other site → extension still works
- [ ] Re-enable on Gmail → underlines come back

---

## 🟡 Season 3 — Keyboard Navigation in Popup

> Arrow keys to navigate, Enter to apply, Escape to close.

### 3.1 — `content.js` — `showPopup()` changes

- [ ] After appending popup to DOM, focus the first suggestion button:
  ```js
  const firstBtn = popup.querySelector('.sf-popup-item');
  if (firstBtn) firstBtn.focus();
  ```
- [ ] Add `keydown` listener on the popup:
  ```
  ArrowDown  → move focus to next button
  ArrowUp    → move focus to previous button
  Enter      → click the currently focused button
  Escape     → closePopup()
  Tab        → move focus to next button (don't leave popup)
  ```
- [ ] Prevent default on ArrowUp/ArrowDown (stops page scroll)

### 3.2 — `styles.css` changes

- [ ] Add visible focus ring to `.sf-popup-item:focus`:
  ```css
  .sf-popup-item:focus {
    background: #e0f2fe;
    outline: 2px solid #0284c7;
    outline-offset: -2px;
  }
  ```

### 3.3 — Test

- [ ] Click a misspelled word → popup opens
- [ ] Press ↓ twice → third suggestion highlighted
- [ ] Press Enter → word replaced
- [ ] Click a word → popup opens → press Escape → popup closes

---

## 🟡 Season 4 — Auto-correct Common Typos

> Spacebar after a common typo → auto-fixes it silently.

### 4.1 — `spellchecker.js` changes

- [ ] Add `window.AUTOCORRECT_MAP` — a plain object with ~200 common typos:
  ```js
  window.AUTOCORRECT_MAP = {
    "teh": "the", "hte": "the", "adn": "and", "nad": "and",
    "recieve": "receive", "beleive": "believe", "seperate": "separate",
    "definately": "definitely", "occured": "occurred", "untill": "until",
    "wich": "which", "becuase": "because", "freind": "friend",
    "goverment": "government", "tommorrow": "tomorrow",
    // ... add ~180 more
  };
  ```

### 4.2 — `content.js` changes

- [ ] Add `keydown` listener for `Space` and `Enter` on attached input/textarea fields
- [ ] On space/enter: read the word just before the cursor:
  ```js
  const before = el.value.slice(0, el.selectionStart);
  const match  = before.match(/([A-Za-z']+)$/);
  const word   = match ? match[1].toLowerCase() : null;
  ```
- [ ] If `AUTOCORRECT_MAP[word]` exists → replace that word with the correction
- [ ] Show a brief visual flash on the corrected word (optional, CSS animation)

### 4.3 — Settings toggle (optional but recommended)

- [ ] Add "Auto-correct typos" toggle in `popup.html` (default: on)
- [ ] Save as `autoCorrect: true/false` in storage
- [ ] `content.js` reads this flag before applying auto-correct

### 4.4 — Test

- [ ] Type "teh " (with space) → becomes "the "
- [ ] Type "recieve " → becomes "receive "
- [ ] Type "YouTube " → unchanged (CamelCase skipped)

---

## 🟡 Season 5 — Ignore / Ignore All

> Users can dismiss a specific word without adding it to their permanent dictionary.

### 5.1 — `content.js` changes

- [ ] Add module-level `const ignoredWords = new Set();`
- [ ] In `isCorrect()` call → also check `ignoredWords.has(normWord)`
- [ ] Update `runCheck()` to pass ignored words into the check

### 5.2 — Popup changes (in `showPopup()`)

- [ ] Add "Ignore" button between suggestions and "Add to dictionary":
  ```
  ✗ helllo
  ─────────────
  DID YOU MEAN
    hello
    hell
  ─────────────
  Ignore once       ← removes underline for this session only
  + Add "helllo"    ← permanent (existing)
  ```
- [ ] "Ignore once" click handler:
  ```js
  ignoredWords.add(popupMeta.normWord);
  recheckAll();
  closePopup();
  ```

### 5.3 — Test

- [ ] Type "github" → shows as misspelled
- [ ] Click → "Ignore once" → underline disappears
- [ ] Refresh page → "github" is flagged again (session-only)
- [ ] Type "github" → "Add to dictionary" → refresh → stays accepted

---

## 🟡 Season 6 — Stats in Popup

> Shows the user how many words were checked and how many errors found.

### 6.1 — `content.js` changes

- [ ] Track stats per page:
  ```js
  let stats = { checked: 0, errors: 0 };
  ```
- [ ] Update counts in `updateMirror()` and `checkContentEditable()`
- [ ] Respond to messages from popup:
  ```js
  chrome.runtime.onMessage.addListener(function(msg, sender, reply) {
    if (msg.type === 'GET_STATS') reply(stats);
  });
  ```

### 6.2 — `popup.js` changes

- [ ] On popup open: send `{ type: 'GET_STATS' }` to active tab
- [ ] Display result in `popup.html`:
  ```
  47 words checked · 2 errors
  ```

### 6.3 — `manifest.json` changes

- [ ] Add `"tabs"` permission if not already added (from Season 2)

### 6.4 — Test

- [ ] Open a page with some text inputs → type a mix of correct and misspelled words
- [ ] Click extension icon → popup shows accurate count

---

## 🟢 Season 7 — Phonetic Suggestions

> "recieve" sounds like "receive" — Levenshtein misses this. Soundex catches it.

### 7.1 — `spellchecker.js` changes

- [ ] Implement Soundex algorithm:
  ```js
  function soundex(word) {
    // Standard Soundex: keep first letter, encode consonants
    // Returns e.g. "R200" for both "receive" and "recieve"
  }
  ```
- [ ] Build a phonetic index on load:
  ```js
  const phoneticIndex = new Map(); // soundex code → [words]
  SPELL_DICT.forEach(w => {
    const code = soundex(w);
    if (!phoneticIndex.has(code)) phoneticIndex.set(code, []);
    phoneticIndex.get(code).push(w);
  });
  ```
- [ ] In `getSuggestions()`: merge Levenshtein results with phonetic matches
- [ ] Deduplicate + re-sort by combined score

### 7.2 — Test

- [ ] Type "recieve" → "receive" appears as first suggestion
- [ ] Type "definately" → "definitely" appears
- [ ] Type "helllo" → "hello" still appears (Levenshtein still works)

---

## 🟢 Season 8 — Export / Import Custom Dictionary

> Users accumulate a personal word list over time — they should be able to back it up.

### 8.1 — `popup.html` changes

- [ ] Add a small "Dictionary" section below the toggle:
  ```
  Custom words: 12
  [Export]  [Import]
  ```

### 8.2 — `popup.js` changes

- [ ] **Export button**:
  ```js
  // Read userWords from storage → create JSON blob → trigger download
  const blob = new Blob([JSON.stringify(words)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  // Create <a download="spell-fixer-words.json"> and click it
  ```
- [ ] **Import button**:
  ```js
  // Open file picker → read JSON → merge with existing userWords → save
  ```
- [ ] Show word count next to label

### 8.3 — Test

- [ ] Add 3 custom words → Export → open the JSON file → words are there
- [ ] Clear storage → Import the file → words are back → extension recognises them

---

## 🟢 Season 9 — Highlight Color Customization

> Let users choose a color other than red.

### 9.1 — `popup.html` changes

- [ ] Add a color row:
  ```
  Underline color   [● Red] [● Blue] [● Orange] [● Green]
  ```
  or a small `<input type="color">` picker

### 9.2 — `popup.js` changes

- [ ] Save chosen color as `highlightColor` in storage
- [ ] On change: send message to content script to update color

### 9.3 — `content.js` changes

- [ ] On init: read `highlightColor` from storage
- [ ] Inject a `<style id="sf-color-override">` tag into the page:
  ```js
  styleEl.textContent = `.sf-error { border-bottom-color: ${color} !important; }`;
  ```
- [ ] Listen for storage change on `highlightColor` → update the style tag

### 9.4 — Test

- [ ] Change color to blue → all underlines turn blue immediately
- [ ] Reload page → blue color persists

---

## 🟢 Season 10 — Onboarding Page

> First-time users don't know how to use the extension. Show them.

### 10.1 — `background.js` (new file — service worker)

- [ ] Create `background.js`:
  ```js
  chrome.runtime.onInstalled.addListener(function(details) {
    if (details.reason === 'install') {
      chrome.tabs.create({ url: 'onboarding.html' });
    }
  });
  ```
- [ ] Add to `manifest.json`:
  ```json
  "background": { "service_worker": "background.js" }
  ```

### 10.2 — `onboarding.html` (new file)

- [ ] Section 1: "How to use" — 3 steps with visuals
  1. Type in any text box on any website
  2. Misspelled words get a red underline
  3. Click the underline → choose a suggestion or add to dictionary
- [ ] Section 2: "Tips"
  - Words in ALL CAPS, URLs, numbers are never flagged
  - Click the extension icon to turn it on/off
  - Your custom words are saved permanently
- [ ] Section 3: Link to privacy policy, GitHub, support email

### 10.3 — Test

- [ ] Remove extension → re-install → onboarding tab opens automatically
- [ ] Update extension → onboarding does NOT open (only on fresh install)

---

## Summary Table

| Season | Feature | Effort | Impact |
|--------|---------|--------|--------|
| 1 | Store ready (icons, privacy, dictionary) | Medium | 🔴 Required |
| 2 | Per-site disable | Small | 🟡 High |
| 3 | Keyboard navigation | Small | 🟡 High |
| 4 | Auto-correct typos | Medium | 🟡 High |
| 5 | Ignore / Ignore All | Small | 🟡 High |
| 6 | Stats in popup | Medium | 🟡 Medium |
| 7 | Phonetic suggestions | Medium | 🟢 Medium |
| 8 | Export / Import dictionary | Small | 🟢 Medium |
| 9 | Highlight color | Small | 🟢 Low |
| 10 | Onboarding page | Small | 🟢 Medium |
