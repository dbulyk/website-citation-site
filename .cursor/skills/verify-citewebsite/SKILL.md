---
name: verify-citewebsite
description: Verify Website Citation site changes, including APA and MLA formatting, the built homepage, clipboard and dialogs, responsive controls, and preserved static routes.
---

# Verify Website Citation

Run commands from the site repository.

1. Run `npm ci`, `npm test`, and `npm run build`. Compare the uninstall files with `cmp uninstall/index.html dist/uninstall/index.html` and record their SHA-256 values.
2. Run `npm run test:e2e` with Playwright Chromium installed. Its server builds and previews the site on port 4180. Check that Install and Copy fit at 1440×900, 958×704, 768×1024 and 390×844. Check the long-value cases, serious and critical axe findings, console errors, and keyboard focus on modal dismissal.
3. Serve `dist/` from a directory below the server root. Verify the default citation, local Credits and source downloads, and uninstall output at that subpath. After loading the page, confirm formatting works without further network requests.
4. Run a real clipboard smoke in a disposable browser environment or preserve and restore the previous clipboard contents. Check both text and HTML formats on a successful write. Report fixture, browser and clipboard results from the runs actually performed.
