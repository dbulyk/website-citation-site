import assert from 'node:assert/strict';
import { readdir } from 'node:fs/promises';
import test from 'node:test';
import { generateSitemap } from '../seo.js';

const origin = 'https://citewebsite.app';

async function localeCodes(directory) {
  const files = await readdir(new URL(directory, import.meta.url), { withFileTypes: true });
  return files.filter((file) => file.isFile() && file.name.endsWith('.json'))
    .map((file) => file.name.slice(0, -'.json'.length));
}

test('sitemap has one URL per public route and locale with symmetric hreflang sets', async () => {
  const xml = await generateSitemap();
  const [declaration, root, ...lines] = xml.trimEnd().split('\n');
  assert.equal(declaration, '<?xml version="1.0" encoding="UTF-8"?>');
  assert.equal(root, '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">');
  assert.equal(lines.pop(), '</urlset>');

  const body = lines.join('\n');
  const urlPattern = /<url>\s*<loc>([^<]+)<\/loc>([\s\S]*?)<\/url>/g;
  const entries = [...body.matchAll(urlPattern)];
  assert.equal(body.replace(urlPattern, '').trim(), '', 'only complete url entries');

  const expected = new Map();
  for (const [path, locales] of [
    ['/', await localeCodes('../src/site-copy/')],
    ['/welcome/', await localeCodes('../welcome/locales/')],
    ['/credits/', ['en']],
  ]) {
    const base = `${origin}${path}`;
    const variants = locales.map((code) => [code.replaceAll('_', '-'), code === 'en' ? base : `${base}?lang=${encodeURIComponent(code)}`]);
    const alternates = [...variants, ['x-default', base]].sort();
    for (const [, url] of variants) expected.set(url, alternates);
  }

  assert.deepEqual(entries.map(([, url]) => url).sort(), [...expected.keys()].sort());
  const linkPattern = /<xhtml:link rel="alternate" hreflang="([a-zA-Z0-9-]+)" href="([^"<]+)"\/>/g;
  for (const [, url, links] of entries) {
    assert.ok(url.startsWith(`${origin}/`));
    assert.equal(links.replace(linkPattern, '').trim(), '', `only complete alternate links for ${url}`);
    const alternates = [...links.matchAll(linkPattern)].map(([, tag, href]) => [tag, href]);
    assert.deepEqual(alternates.sort(), expected.get(url), url);
  }
});
