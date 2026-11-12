import { test, expect } from '@playwright/test';

const extensionId = 'abcdefghijklmnopabcdefghijklmnop';
const pin = (page) => page.getByRole('heading', { name: 'Pin Website Citation' });
const usage = (page) => page.getByRole('heading', { name: 'Cite your first page' });
const guide = (page) => page.locator('footer').getByRole('combobox', { name: 'Choose a guide' });

async function mockStatus(page, initial) {
  await page.addInitScript((initial) => {
    window.__statusResponse = initial;
    window.__statusCalls = [];
    Object.defineProperty(window, 'chrome', { configurable: true, value: {
      runtime: {
        sendMessage(id, message, callback) {
          window.__statusCalls.push({ id, message });
          const response = window.__statusResponse;
          if (typeof callback === 'function') queueMicrotask(() => callback(response));
          return Promise.resolve(response);
        },
      },
    } });
  }, initial);
  await page.clock.install();
}

async function firstCheck(page) {
  await page.clock.fastForward(1100);
  await expect.poll(() => page.evaluate(() => window.__statusCalls.length)).toBeGreaterThan(0);
}

test('direct welcome is a usable guide and its footer select and hash override switch modes', async ({ page }) => {
  await page.goto('/welcome/', { waitUntil: 'domcontentloaded' });
  await expect(pin(page)).toBeVisible();
  await expect(page.getByText('Pin status is unknown.')).toBeVisible();
  await expect(guide(page).locator('option')).toHaveText(['How to pin the extension', 'How to cite a page']);
  await guide(page).selectOption({ label: 'How to cite a page' });
  await expect(usage(page)).toBeVisible();
  await expect(page).toHaveURL(/#usage$/);
  await page.evaluate(() => { location.hash = '#pin'; });
  await expect(pin(page)).toBeVisible();
  await expect(guide(page)).toHaveValue('pin');
});

test('status updates switch automatically but a manual selection persists through later polling', async ({ page }) => {
  await mockStatus(page, { ok: true, pinned: false });
  await page.goto(`/welcome/?extensionId=${extensionId}`, { waitUntil: 'domcontentloaded' });
  await firstCheck(page);
  expect(await page.evaluate(() => window.__statusCalls[0])).toEqual({
    id: extensionId, message: { type: 'wc-welcome-status', version: 1 },
  });
  await expect(pin(page)).toBeVisible();
  await page.evaluate(() => { window.__statusResponse = { ok: true, pinned: true }; });
  await page.clock.fastForward(1600);
  await expect(usage(page)).toBeVisible();
  await guide(page).selectOption({ label: 'How to pin the extension' });
  await page.clock.fastForward(1600);
  await expect(pin(page)).toBeVisible();
  await expect(guide(page)).toHaveValue('pin');
});

test('hash override survives a pinned status and unavailable status can be retried', async ({ page }) => {
  await mockStatus(page, { ok: false });
  await page.goto(`/welcome/?extensionId=${extensionId}#pin`, { waitUntil: 'domcontentloaded' });
  await firstCheck(page);
  await expect(page.getByText('Could not check the pin status.')).toBeVisible();
  const retry = page.getByRole('button', { name: 'Try again' });
  await expect(retry).toBeVisible();
  const calls = await page.evaluate(() => window.__statusCalls.length);
  await page.clock.fastForward(5000);
  expect(await page.evaluate(() => window.__statusCalls.length)).toBe(calls);
  await page.evaluate(() => { window.__statusResponse = { ok: true, pinned: true }; });
  await retry.click();
  await expect.poll(() => page.evaluate(() => window.__statusCalls.length)).toBeGreaterThan(calls);
  await expect(pin(page)).toBeVisible();
  await expect(guide(page)).toHaveValue('pin');
});

test('example is a local article with visible citation metadata and a return link', async ({ page }) => {
  await page.goto(`/welcome/?extensionId=${extensionId}#usage`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('link', { name: 'Try an example' }).click();
  await expect(page).toHaveURL(/\/welcome\/example\//);
  const article = page.locator('article');
  await expect(article).toBeVisible();
  const metadata = await page.evaluate(() => Object.fromEntries(
    ['citation_title', 'citation_author', 'citation_publication_date', 'citation_publisher'].map(name =>
      [name, document.querySelector(`meta[name="${name}"]`)?.content]),
  ));
  for (const value of Object.values(metadata)) expect(value).toBeTruthy();
  await expect(article).toContainText(metadata.citation_title);
  await expect(article).toContainText(metadata.citation_author);
  await expect(article).toContainText(metadata.citation_publisher);
  await expect(article.locator('time')).toHaveAttribute('datetime', metadata.citation_publication_date);
  const back = page.getByRole('link', { name: 'Back to the guide' });
  await back.click();
  await expect(page).toHaveURL(new RegExp(`/welcome/\\?.*extensionId=${extensionId}.*#usage$`));
  await expect(usage(page)).toBeVisible();
});
