# Website Citation

Static homepage for [Website Citation](https://chromewebstore.google.com/detail/bgnhgjohgkcmdiaeggjnegfkhmgkjbob). It formats webpage references and in-text citations in APA 7 and MLA 9 in the browser using bundled styles and locale data.

## Development

```sh
npm ci
npm run dev
npm test
npm run build
npm run preview
```

Use the Node version range in `package.json`. Serve `dist/` at a domain root or under a subpath. The build copies `uninstall/index.html` byte-for-byte and includes [dependency credits and source](credits/index.html).

## Browser checks

```sh
npx playwright install chromium
npm run test:e2e
```

Playwright starts the built site on port 4180. See the [site verification skill](.cursor/skills/verify-citewebsite/SKILL.md) for additional checks.

The uninstall feedback page uses the [existing Google Form](https://docs.google.com/forms/d/10crbb0lMNYAhU1914ZYi319RNa-9A7g0d0fo-6gCm60/edit).
