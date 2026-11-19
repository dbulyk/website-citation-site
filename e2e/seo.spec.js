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

test('built HTML declares static canonicals only for routes without localized canonicals', async ({ page, request }) => {
  await page.route('**/*', (route) => route.abort());
  for (const [path, href] of [
    ['/', null],
    ['/welcome/', null],
    ['/welcome/example/', `${origin}/welcome/example/`],
    ['/credits/', `${origin}/credits/`],
    ['/demo/', `${origin}/demo/`],
    ['/uninstall/', `${origin}/uninstall/`],
  ]) {
    const response = await request.get(path, { maxRedirects: 0 });
    expect(response.status(), path).toBe(200);
    const links = await page.evaluate((html) => {
      const parsed = new DOMParser().parseFromString(html, 'text/html');
      return Array.from(parsed.querySelectorAll('link[rel~="canonical"]'), (link) => ({
        href: link.getAttribute('href'),
        inHead: parsed.head.contains(link),
      }));
    }, await response.text());
    expect.soft(links, path).toEqual(href ? [{ href, inHead: true }] : []);
  }
});

test('home and welcome canonicalize through the validated locale on load', async ({ page }) => {
  for (const [path, expected] of [
    ['/', '/'],
    ['/?lang=ru', '/?lang=ru'],
    ['/?lang=ru&extensionId=abcdefghijklmnopabcdefghijklmnop#details', '/?lang=ru'],
    ['/?lang=de', '/'],
    ['/welcome/', '/welcome/'],
    ['/welcome/?lang=de', '/welcome/?lang=de'],
    ['/welcome/?extensionId=abcdefghijklmnopabcdefghijklmnop&lang=de&pinned=true#usage', '/welcome/?lang=de'],
    ['/welcome/?lang=pt_BR', '/welcome/?lang=pt_BR'],
    ['/welcome/?lang=en&pinned=true', '/welcome/'],
    ['/welcome/?lang=xx-invalid', '/welcome/'],
    ['/welcome/example/?lang=de', '/welcome/example/'],
  ]) {
    await page.goto(path);
    await expect(page.locator('link[rel~="canonical"]'), path).toHaveCount(1);
    await expect(page.locator(canonical), path).toHaveAttribute('href', `${origin}${expected}`);
  }
});

test('the Filipino welcome page keeps its locale in the canonical and document language', async ({ page }) => {
  await page.goto('/welcome/?lang=fil');
  await expect(page.locator(canonical)).toHaveAttribute('href', `${origin}/welcome/?lang=fil`);
  await expect(page.locator('html')).toHaveAttribute('lang', 'fil');
});
