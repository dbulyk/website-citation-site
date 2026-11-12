import { readFile } from 'node:fs/promises';
import { defineConfig } from 'vite';

const staticFiles = [
  'uninstall/index.html',
  'credits/index.html',
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
  build: {
    rolldownOptions: { input: ['index.html', 'demo/index.html'] },
  },
  plugins: [{
    name: 'copy-static-files',
    async generateBundle() {
      for (const fileName of staticFiles) {
        const source = await readFile(new URL(fileName, import.meta.url));
        this.emitFile({ type: 'asset', fileName, source });
      }
    },
  }],
});
