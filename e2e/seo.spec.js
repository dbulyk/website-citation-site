import { expect, test } from '@playwright/test';

const origin = 'https://citewebsite.app';
const canonical = 'head link[rel~="canonical"]';

test('sitemap locations serve directly and robots advertises the sitemap', async ({ page, request }) => {
  const sitemap = await request.get('/sitemap.xml', { maxRedirects: 0 });
  expect(sitemap.status()).toBe(200);
  expect(sitemap.headers()['content-type']).toMatch(/\bxml\b/i);
  const locations = await page.evaluate((xml) => {
    const sitemap = new DOMParser().parseFromString(xml, 'application/xml');
    if (sitemap.querySelector('parsererror')) throw new Error('Invalid sitemap XML');
    return Array.from(sitemap.getElementsByTagNameNS('http://www.sitemaps.org/schemas/sitemap/0.9', 'loc'), (loc) => loc.textContent);
  }, await sitemap.text());
  expect(locations.length).toBeGreaterThan(0);
  for (const location of locations) {
    const url = new URL(location);
    const response = await request.get(`${url.pathname}${url.search}`, { maxRedirects: 0 });
    expect(response.status(), location).toBe(200);
    expect(response.headers()['content-type'], location).toContain('text/html');
  }

  const robots = await request.get('/robots.txt', { maxRedirects: 0 });
  expect(robots.status()).toBe(200);
  expect((await robots.text()).trim().split('\n')).toEqual([
    'User-agent: *',
    'Allow: /',
    `Sitemap: ${origin}/sitemap.xml`,
  ]);
});

test('every built HTML route declares exactly one canonical in its static head', async ({ page, request }) => {
  await page.route('**/*', (route) => route.abort());
  for (const path of ['/', '/welcome/', '/welcome/example/', '/credits/', '/demo/', '/uninstall/']) {
    const response = await request.get(path, { maxRedirects: 0 });
    expect(response.status(), path).toBe(200);
    const links = await page.evaluate((html) => {
      const parsed = new DOMParser().parseFromString(html, 'text/html');
      return Array.from(parsed.querySelectorAll('link[rel~="canonical"]'), (link) => ({
        href: link.getAttribute('href'),
        inHead: parsed.head.contains(link),
      }));
    }, await response.text());
    expect(links, path).toEqual([{ href: `${origin}${path}`, inHead: true }]);
  }
});

test('home and welcome canonicalize through the validated locale on load', async ({ page }) => {
  for (const [path, expected] of [
    ['/?lang=ru', '/?lang=ru'],
    ['/?lang=de', '/'],
    ['/welcome/?lang=de', '/welcome/?lang=de'],
    ['/welcome/?extensionId=abcdefghijklmnopabcdefghijklmnop&lang=de&pinned=true#usage', '/welcome/?lang=de'],
    ['/welcome/?lang=pt_BR', '/welcome/?lang=pt_BR'],
    ['/welcome/?lang=en&pinned=true', '/welcome/'],
    ['/welcome/?lang=xx-invalid', '/welcome/'],
    ['/welcome/example/?lang=de', '/welcome/example/'],
  ]) {
    await page.goto(path);
    await expect(page.locator(canonical), path).toHaveAttribute('href', `${origin}${expected}`);
  }
});
