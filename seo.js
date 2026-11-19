import { readFileSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { localizedUrl } from './src/canonical.js';

const uninstall = readFileSync(new URL('./uninstall/index.html', import.meta.url), 'utf8');
export const canonicalOrigin = new URL(uninstall.match(/<link rel="canonical" href="([^"]+)">/)[1]).origin;

export const indexablePages = {
  '/': './src/site-copy/',
  '/welcome/': './welcome/locales/',
  '/credits/': null,
};

function escapeXml(value) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

async function pageEntries([route, localeDirectory]) {
  const base = new URL(route, canonicalOrigin).href;
  const locales = localeDirectory
    ? (await readdir(new URL(localeDirectory, import.meta.url), { withFileTypes: true }))
      .filter((file) => file.isFile() && file.name.endsWith('.json'))
      .map((file) => file.name.slice(0, -'.json'.length)).sort()
    : ['en'];
  const variants = locales.map((locale) => ({ tag: locale.replaceAll('_', '-'), url: localizedUrl(base, locale) }));
  const alternates = [...variants, { tag: 'x-default', url: base }]
    .map(({ tag, url }) => `    <xhtml:link rel="alternate" hreflang="${escapeXml(tag)}" href="${escapeXml(url)}"/>`);

  return variants.flatMap(({ url }) => ['  <url>', `    <loc>${escapeXml(url)}</loc>`, ...alternates, '  </url>']);
}

export async function generateSitemap() {
  const pages = await Promise.all(Object.entries(indexablePages).map(pageEntries));
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    ...pages.flat(),
    '</urlset>',
    '',
  ].join('\n');
}
