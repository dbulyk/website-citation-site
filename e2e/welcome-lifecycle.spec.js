import { test, expect } from '@playwright/test';

const id = 'abcdefghijklmnopabcdefghijklmnop';
const url = `/welcome/?extensionId=${id}`;
const select = (page) => page.locator('footer').getByRole('combobox', { name: 'Choose a guide' });
const retry = (page) => page.getByRole('button', { name: 'Try again' });

async function setup(page, response = { ok: true, pinned: false }) {
  await page.addInitScript((response) => {
    window.__bridge = { calls: [], pending: [], response, deferred: false, error: false, hidden: false };
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => window.__bridge.hidden });
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => window.__bridge.hidden ? 'hidden' : 'visible' });
    const runtime = {
      get lastError() { return window.__bridge.error ? { message: 'Extension unavailable' } : undefined; },
      sendMessage(extensionId, message, callback) {
        const state = window.__bridge;
        state.calls.push({ extensionId, message });
        if (state.deferred) {
          return new Promise((resolve) => state.pending.push(() => {
            callback?.(state.response);
            resolve(state.response);
          }));
        }
        callback?.(state.response);
        return Promise.resolve(state.response);
      },
    };
    Object.defineProperty(window, 'chrome', { configurable: true, value: { runtime } });
  }, response);
  await page.clock.install();
}

async function advance(page, ms) {
  await page.clock.fastForward(ms);
  await page.evaluate(() => Promise.resolve());
}

async function calls(page) { return page.evaluate(() => window.__bridge.calls.length); }
async function visibility(page, hidden) {
  await page.evaluate((hidden) => {
    window.__bridge.hidden = hidden;
    document.dispatchEvent(new Event('visibilitychange'));
  }, hidden);
}

test('a pending status check never overlaps and hidden completion does not restart polling', async ({ page }) => {
  await setup(page);
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => { window.__bridge.deferred = true; });
  await advance(page, 1100);
  await expect.poll(() => calls(page)).toBe(1);
  await advance(page, 1600);
  expect(await calls(page)).toBe(1);
  await visibility(page, true);
  await page.evaluate(() => window.__bridge.pending.shift()());
  await advance(page, 2000);
  expect(await calls(page)).toBe(1);
  await page.evaluate(() => { window.__bridge.deferred = false; });
  await visibility(page, false);
  await expect.poll(() => calls(page)).toBe(2);
  await advance(page, 1600);
  expect(await calls(page)).toBe(3);
});

test('malformed status stops checks until retry and keeps the guide usable', async ({ page }) => {
  await setup(page, { ok: true, pinned: 'yes' });
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await advance(page, 1100);
  await expect(retry(page)).toBeVisible();
  const count = await calls(page);
  expect(count).toBe(1);
  await advance(page, 5000);
  expect(await calls(page)).toBe(count);
  await page.evaluate(() => { window.__bridge.response = { ok: true, pinned: true }; });
  await retry(page).click();
  await expect.poll(() => calls(page)).toBe(count + 1);
  await expect(page.getByRole('heading', { name: 'Cite your first page' })).toBeVisible();
});

test('runtime.lastError produces unavailable status and does not keep polling', async ({ page }) => {
  await setup(page);
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => { window.__bridge.error = true; });
  await advance(page, 1100);
  await expect(retry(page)).toBeVisible();
  expect(await calls(page)).toBe(1);
  await advance(page, 5000);
  expect(await calls(page)).toBe(1);
});

test('manual select keeps focus across polls, and invalid extension IDs are never messaged', async ({ page }) => {
  await setup(page);
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await advance(page, 1100);
  await expect.poll(() => calls(page)).toBe(1);
  await select(page).selectOption('usage');
  await select(page).focus();
  await page.evaluate(() => { window.__bridge.response = { ok: true, pinned: true }; });
  await advance(page, 1600);
  await expect.poll(() => calls(page)).toBe(2);
  await expect(select(page)).toBeFocused();
  await expect(select(page)).toHaveValue('usage');
  await page.goto('/welcome/?extensionId=invalid', { waitUntil: 'domcontentloaded' });
  await advance(page, 5000);
  expect(await calls(page)).toBe(0);
  await expect(select(page)).toBeVisible();
});

test('an unanswered status request times out and retry restores checking', async ({ page }) => {
  await setup(page);
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => { window.__bridge.deferred = true; });
  await advance(page, 1100);
  await expect.poll(() => calls(page)).toBe(1);
  await advance(page, 10000);
  await expect(retry(page)).toBeVisible();
  await advance(page, 5000);
  expect(await calls(page)).toBe(1);
  await page.evaluate(() => { window.__bridge.deferred = false; });
  await retry(page).click();
  await expect.poll(() => calls(page)).toBe(2);
});
