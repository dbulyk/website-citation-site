import { readFile } from 'node:fs/promises';
import { defineConfig } from 'vite';
import { canonicalOrigin, generateSitemap, indexablePages } from './seo.js';

const htmlInputs = [...Object.keys(indexablePages), '/demo/', '/welcome/example/']
  .map((route) => `${route.slice(1)}index.html`);

const staticFiles = [
  'uninstall/index.html',
  'third-party/NOTICE.md',
  'third-party/citeproc-LICENSE',
  'third-party/CPAL-1.0.txt',
  'third-party/CC-BY-SA-3.0.txt',
  'third-party/citeproc-2.4.63.tgz',
  'src/csl/apa.js',
  'src/csl/mla.js',
  'src/csl/en-US.js',
  'src/formatter.js',
];

export default defineConfig({
  base: './',
  define: { __CANONICAL_ORIGIN__: JSON.stringify(canonicalOrigin) },
  build: {
    rolldownOptions: {
      input: htmlInputs,
    },
  },
  plugins: [{
    name: 'site-seo',
    transformIndexHtml(_, { path }) {
      const route = path.replace(/index\.html$/, '');
      if (!htmlInputs.includes(`${route.slice(1)}index.html`) || indexablePages[route]) return;
      return [{ tag: 'link', attrs: { rel: 'canonical', href: new URL(route, canonicalOrigin).href }, injectTo: 'head' }];
    },
    async generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: await generateSitemap() });
      const source = `User-agent: *\nAllow: /\nSitemap: ${canonicalOrigin}/sitemap.xml\n`;
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source });
    },
  }, {
    name: 'copy-static-files',
    async generateBundle() {
      for (const fileName of staticFiles) {
        const source = await readFile(new URL(fileName, import.meta.url));
        this.emitFile({ type: 'asset', fileName, source });
      }
    },
  }],
});
