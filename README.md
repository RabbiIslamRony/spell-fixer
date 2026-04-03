# Spell Fixer

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Open Source](https://img.shields.io/badge/Open%20Source-Yes-brightgreen)](#)

## 🚀 Overview

Spell Fixer is a Chrome extension (Manifest V3) that performs offline, real-time spell checking in text fields, textareas, and rich-text editors on any website. No remote API, no user data collection — everything runs locally.

- Website-wide, per-page correction highlights
- Real-time misspelling underlines and suggestions
- Keyboard-friendly and accessible architecture
- Supports custom words via `chrome.storage.local`

## 👤 Owner / Maintainer

Created and maintained by [rabbiislamrony](https://github.com/rabbiislamrony).

Source repository: https://github.com/rabbiislamrony

## 🌍 Open Source

This project is fully open source and free to use, fork, modify, and share under the MIT license.

## 📦 Installation (Developer)

1. Clone or download this repository.
2. Open Chrome, go to `chrome://extensions`.
3. Enable **Developer mode**.
4. Click **Load unpacked** and select this `spell-fixer/` folder.
5. Ensure the extension is enabled.
6. Visit any website and start typing.

## 🧩 Features

- Spell checking in:
  - `input[type=text]`, `input[type=search]`
  - `textarea`
  - `[contenteditable=true]`
- Mirror-div rendering for text inputs/textareas, with inline red underlines.
- TreeWalker approach for contenteditable fields (Word wrap around DOM nodes).
- Suggestion popup with corrections and "Add word".
- Custom dictionary (`userWords`) stored in `chrome.storage.local`.
- On/off toggle in extension popup (`popup.html`).
- Works offline with local dictionary (`dictionary.js` + `spellchecker.js`).

## 🛠️ File structure

- `manifest.json` — extension metadata (MV3)
- `content.js` — injection logic
- `spellchecker.js` — tokenization + spelling + suggestions
- `dictionary.js` — ~3000 words set (can be expanded)
- `popup.html` / `popup.js` — enable/disable toggle
- `styles.css` — highlight and popup UI styling

## 🧪 Usage

1. Click a misspelled word or underline.
2. Pick a suggestion from the popup.
3. Use **Add word** to whitelist and avoid future false positives.
4. Toggle the extension on/off from the popup.

## 🛡️ Privacy

- No telemetry
- No third-party network requests
- Custom words stored only in user local Chrome storage

## ✅ Roadmap / Improvements

Suggested improvements (server by current `ROADMAP.md`):

1. Better dictionary (50k+ words) to reduce false positives.
2. Per-site disable settings (housekeeping, banking sites).
3. Keyboard navigation for suggestion dropdown (ArrowUp/Down, Enter, Esc).
4. Autocorrect common typos (e.g., `teh` → `the`).
5. Ignore / Ignore-all convenience controls.
6. Add international language support (Bengali documentation + multi-lingual dictionary).

## 💡 Contribution

Contributions are welcome!

- Open an issue for bugs or feature requests
- Fork and submit a pull request
- Add tests in `test/test-logic.js` and `test/test-browser.js`

Please follow standard GitHub flow:

1. Fork repository
2. Create feature branch: `git checkout -b feature-name`
3. Make changes and test locally
4. Commit: `git commit -m "feat: ..."`
5. Push: `git push origin feature-name`
6. Open Pull Request

## 📘 Suggestion for this repo

- Add `CONTRIBUTING.md` and `CODE_OF_CONDUCT.md`
- Add a public GitHub Pages or `privacy.html` as privacy policy for Chrome Web Store
- Add more context in `README` and `HOW_IT_WORKS` with screenshot examples

## 🧾 License

This project is licensed under MIT License - see [LICENSE](LICENSE) for details.
