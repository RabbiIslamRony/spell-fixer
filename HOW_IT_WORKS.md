# Spell Fixer — How It Works

## Overview

Spell Fixer is a Chrome Extension (Manifest V3) that checks spelling in real time on any webpage — inside text inputs, textareas, and rich-text editors. It works entirely offline with no external API calls.

---

## File Structure

```
spell-fixer/
├── manifest.json      — Extension config (MV3)
├── dictionary.js      — ~3000 common English words as a Set
├── spellchecker.js    — isCorrect() and getSuggestions() engine
├── content.js         — Core logic injected into every page
├── styles.css         — Highlight and popup styles
├── popup.html         — Extension toolbar popup (on/off toggle)
└── popup.js           — Reads/writes chrome.storage.local
```

---

## Step-by-Step Flow

### 1. Extension Loads

When you visit any page, Chrome injects these files (in order):

```
dictionary.js → spellchecker.js → content.js + styles.css
```

`content.js` first reads `chrome.storage.local` to get:
- `enabled` — whether spell check is on or off (default: on)
- `userWords` — any custom words you've added to the dictionary

---

### 2. Field Detection

`content.js` scans the page for editable fields using this selector:

```
input[type="text"]
input[type="search"]
input (no type attribute)
textarea
[contenteditable="true"]
[contenteditable=""]
```

**Skipped fields:** `password`, `email`, `number`, `tel`, `url`, `file`, `date`, `range`, `color`, `readonly`, `disabled`.

A `MutationObserver` watches the DOM so that fields added dynamically (e.g. in React/Vue SPAs) are also picked up automatically.

---

### 3. Spell Checking — Two Different Approaches

The extension uses different strategies depending on the field type.

---

#### A) `<input>` and `<textarea>` — Mirror Div Technique

HTML inputs don't let you style individual characters inside them. So the extension creates an invisible **mirror div** that overlays the input exactly.

```
┌─────────────────────────────┐  ← Mirror div (z-index: 99998)
│  Hello wrold                │    color: transparent (invisible text)
│        ─────                │    red border-bottom on misspelled span
└─────────────────────────────┘
┌─────────────────────────────┐  ← Real <input> (background: transparent)
│  Hello wrold                │    user types here, sees their text
└─────────────────────────────┘
```

**How the mirror works:**

1. A `<div class="sf-mirror">` is appended to `document.body` with `position: fixed`.
2. JS copies all font/padding/border styles from the input onto the mirror so they look identical.
3. The mirror's position and size is kept in sync using `getBoundingClientRect()` — updated on every scroll and resize via a `ResizeObserver`.
4. The mirror has `pointer-events: none` so mouse clicks and keyboard events pass straight through to the real input.
5. The real input gets `background-color: transparent` so the red underlines from the mirror show through.
6. Mirror text is `color: transparent` — only the `border-bottom: 2px solid #E24B4A` on error spans is visible.

**On every keystroke (debounced 300ms):**

```
el.value → tokenise() → isCorrect() for each word
                              ↓
              misspelled → <span class="sf-error"> in mirror
              correct   → plain text node in mirror
```

---

#### B) `[contenteditable]` — TreeWalker Technique

For rich-text editors (Gmail, Notion, etc.) the content is real DOM, so the extension can directly wrap misspelled words in `<span>` elements.

**On every keystroke (debounced 300ms):**

1. **Save caret position** — counts characters from the root to the cursor so it can be restored later.
2. **Remove old spans** — all existing `<span class="sf-error">` are unwrapped back to plain text nodes.
3. **Normalize** — `el.normalize()` merges adjacent text nodes created by the unwrap step.
4. **TreeWalker** — walks every text node in the element (skipping `<script>`, `<style>`).
5. **Tokenise each text node** — split into word and non-word tokens. If any word is misspelled, replace the text node with a `DocumentFragment` of mixed text nodes + error spans.
6. **Restore caret** — walks the new DOM and places the cursor back at the saved character offset.

---

### 4. The Spell-Check Algorithm

#### `isCorrect(word, userWords)`

```
1. Skip if: length < 2, ALL CAPS, contains digit, CamelCase,
            contains @, looks like a URL or domain
2. Normalise: lowercase → strip non-alpha → strip leading/trailing '
              → strip possessive 's  ("John's" → "john")
3. Return true if: in SPELL_DICT  OR  in userWords
```

#### `getSuggestions(word, userWords)`

Uses **Levenshtein distance** (edit distance):

```
1. Normalise the misspelled word
2. Build candidate pool = SPELL_DICT + userWords
3. Pre-filter: skip candidates where |len(candidate) - len(word)| > 2
   (they can't have distance ≤ 3, so no need to compute)
4. Compute Levenshtein for each remaining candidate (cap at 10,000)
5. Keep only candidates with distance ≤ 3
6. Sort ascending by distance, return top 5
```

**Levenshtein distance** = minimum number of single-character edits
(insert, delete, substitute) to turn one word into another.

```
"helllo" → "hello"  distance = 1  (delete one 'l')
"wrold"  → "world"  distance = 2  (transpose w↔o, insert d... etc.)
```

---

### 5. Clicking a Misspelled Word

#### In `<input>` / `<textarea>`:

1. User clicks the field. The browser sets `el.selectionStart` to the cursor character position.
2. The click handler (via `setTimeout(0)`) reads `selectionStart`.
3. It looks up which stored `{word, start, end}` range contains that position.
4. If found → `showPopup()` is called.

#### In `[contenteditable]`:

1. The `<span class="sf-error">` is a real DOM element, so a delegated click listener on `document` catches it.
2. The span reference is passed directly to `showPopup()` so the exact span is always targeted — even if the same misspelled word appears multiple times.

---

### 6. The Suggestion Popup

```
┌─────────────────────┐
│ ✗  helllo           │  ← misspelled word in red header
├─────────────────────┤
│ DID YOU MEAN        │
│   hello             │  ← best suggestion (dist = 1)
│   hell              │  ← dist = 2
│   help              │  ← dist = 3
├─────────────────────┤
│ + Add "helllo"      │  ← saves to chrome.storage.local
└─────────────────────┘
```

- Built entirely with `createElement` / `createTextNode` — no `innerHTML`.
- Positioned using `clientX/Y` from the click event, clamped to viewport edges.
- **Clicking a suggestion** → replaces the word in the real field, triggers `input` event so the mirror re-renders.
- **Clicking "Add"** → saves the normalised word to `chrome.storage.local` → `storage.onChanged` fires → all open fields are re-checked automatically.
- **Closes on:** Escape key, click outside popup, page scroll.

---

### 7. Word Replacement

#### `<input>` / `<textarea>`:
```js
el.value = el.value.slice(0, start) + replacement + el.value.slice(end);
el.setSelectionRange(newPos, newPos);  // place cursor after replacement
el.dispatchEvent(new Event('input')); // re-trigger spell check
```

#### `[contenteditable]`:
```js
// Uses the stored span reference — always replaces the right occurrence
span.parentNode.replaceChild(document.createTextNode(replacement), span);
// Then restores cursor to after the replacement
```

---

### 8. On/Off Toggle (Extension Popup)

The toolbar popup has a toggle switch. Its state is saved to `chrome.storage.local`:

```
ON  → chrome.storage.local.set({ enabled: true })
OFF → chrome.storage.local.set({ enabled: false })
```

`content.js` listens with `chrome.storage.onChanged`:

```
enabled = true  → attachAll() + recheckAll() (re-creates mirrors if needed)
enabled = false → remove all mirror divs, unwrap all sf-error spans,
                  restore input backgrounds
```

---

### 9. Skipped Words

The following are never flagged as misspelled:

| Pattern | Example | Reason |
|---|---|---|
| Length < 2 | `a`, `I` | Too short to check |
| ALL CAPS | `NASA`, `HTTP` | Likely acronym |
| Contains digit | `mp4`, `2nd` | Code / ordinal |
| CamelCase | `iPhone`, `YouTube` | Brand / code |
| Contains `@` | `user@mail` | Email address |
| Starts with `http` | `https://...` | URL |
| Looks like domain | `example.com` | Domain name |
| Possessive `'s` stripped | `John's` → `john` | Checked without possessive |

---

### 10. Security

- **Zero `innerHTML`** with user or page content — all DOM writes use `createTextNode()` and `createElement()`.
- **Zero network requests** — everything runs locally.
- **Zero eval / dynamic script loading.**
- The extension only requests the `storage` permission.

---

### 11. Performance

| Technique | Benefit |
|---|---|
| Debounce 300ms | Spell check runs only after typing stops |
| Length pre-filter in `getSuggestions` | Skips ~60% of dictionary before any Levenshtein |
| 10,000 Levenshtein cap | Prevents slowdown on very long inputs |
| `ResizeObserver` | Efficient mirror resize sync — no polling |
| Single `scroll`/`resize` listener | One handler for all fields, not N handlers |
| `WeakMap` / `WeakSet` | No memory leaks — entries are GC'd with their elements |
