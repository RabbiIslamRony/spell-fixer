# Spell Fixer Release Notes

## v1.0.0 — Initial public release (2026-04-03)

### Overview
Spell Fixer is a free, open-source Chrome extension for real-time spell checking on any webpage.

- Works offline with local dictionary and no network calls.
- Supports text inputs, textareas, and contenteditable fields.
- Highlights misspelled words with underline and suggestions popup.
- Custom word dictionary via `chrome.storage.local`.
- On/off toggle in popup (`popup.html`).
- MIT license, authored by [rabbiislamrony](https://github.com/rabbiislamrony).

### What’s included
- `manifest.json` (Manifest V3) configuration.
- `dictionary.js` (~3000 words) offline dictionary.
- `spellchecker.js` normalization, `isCorrect`, `getSuggestions`, and Levenshtein distance.
- `content.js` mirror div + TreeWalker DOM error highlighting.
- `styles.css` UI styling.
- `popup.html` and `popup.js` on/off control.
- `HOW_IT_WORKS.md` detailed technical docs.
- `ROADMAP.md` future improvements plan.

### GitHub status
- Repository pushed at: https://github.com/RabbiIslamRony/spell-fixer
- Release tag created: `v1.0.0`.
- README, MIT LICENSE, CONTRIBUTING, CODE_OF_CONDUCT added.

### Next improvements (Roadmap)
- Bigger dictionary (50k+ words)
- Per-site disable list
- Keyboard navigation in popup
- Autocorrect common typos
- Ignore / Ignore-all behavior
- International language support

### Usage
1. Load unpacked from `chrome://extensions`.
2. Enable extension.
3. Type in any text field; misspelled words are corrected inline.
4. Use suggestions popup to apply, or add word to dictionary.

### Notes
- Public open-source release is complete.
- For GitHub Pages / Chrome Web Store a `privacy.html` and icons are recommended.
