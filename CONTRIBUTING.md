# Contributing to Spell Fixer

Thank you for your interest in contributing to Spell Fixer! Your help makes the project better for everyone.

## How to contribute

1. Fork the repository.
2. Create a new branch:
   - `git checkout -b feature/my-feature`
3. Implement your changes.
4. Add tests (if applicable):
   - `test/test-logic.js`
   - `test/test-browser.js`
5. Run tests locally (Playwright may require setup).
6. Commit your changes:
   - `git commit -m "feat: ..."`
7. Push to your fork:
   - `git push origin feature/my-feature`
8. Open a Pull Request and describe:
   - what you changed
   - why the change is needed
   - any testing you performed

## Good first issues

- Add missing `chrome.tabs` based “disable on this site” option.
- Support keyboard navigation in the suggestion popup.
- Add autocorrect table in `spellchecker.js`.
- Increase dictionary size and improve performance.

## Reporting issues

- Please include:
  - browser and OS version
  - steps to reproduce
  - expected vs actual behavior
  - extension version

## Style guide

- JavaScript files should use clear variable names and comments for complex logic.
- Keep functions small and focused.
- Use existing code patterns in `content.js` and `spellchecker.js`.

## License

By contributing, you agree that your changes will be licensed under the MIT license.
