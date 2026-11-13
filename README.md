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

Edit the walkthrough's fictional sample and citations in [demo/index.html](demo/index.html). Vite builds it as a separate local page embedded by the homepage.

## Browser checks

```sh
npx playwright install chromium
npm run test:e2e
```

Playwright starts the built site on port 4180. See the [site verification skill](.cursor/skills/verify-citewebsite/SKILL.md) for additional checks.

The uninstall feedback page uses the [existing Google Form](https://docs.google.com/forms/d/10crbb0lMNYAhU1914ZYi319RNa-9A7g0d0fo-6gCm60/edit).

## Production deployment

[Site checks and deploy](.github/workflows/deploy.yml) runs the unit and browser tests on pull requests to `main`. A push to `main` also publishes the tested build to [citewebsite.app](https://citewebsite.app/). For a manual deployment, open the workflow in GitHub Actions and choose **Run workflow** on `main`. At the start of the deployment job, the workflow skips the transfer if the tested commit differs from the current head of `main`.

In GitHub, restrict the `production` environment to the `main` branch and set its `CITEWEBSITE_DEPLOY_KEY` secret to the dedicated deployment private key. Set these repository variables.

- `CITEWEBSITE_DEPLOY_HOST` is the SSH host.
- `CITEWEBSITE_DEPLOY_USER` is the deployment account, `wcsite-deploy`.
- `CITEWEBSITE_DEPLOY_KNOWN_HOSTS` contains the verified SSH host key in OpenSSH `known_hosts` format.

The deployment account owns the site's files under `/var/www/citewebsite.app`. Its public key has the OpenSSH `restrict` option and the forced command `/usr/bin/rrsync -wo -munge -no-del /var/www/citewebsite.app`. Use the rsync receiver's restricted paths relative to this directory.

The workflow uploads hashed assets before updating the rest of the site and leaves old hashed assets available for cached pages. It compares the homepage, the welcome page, and the new hashed assets with the tested build over HTTPS. If the workflow reports a failed publication, inspect the failed step and run it again on the current `main` after correcting the issue. To roll back a site change, revert it on `main` so the workflow tests and publishes the reverted build.
