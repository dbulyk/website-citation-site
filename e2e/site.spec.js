import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const copy = (page) => page.getByRole('button', { name: 'Copy citation' });
const citation = (page) => page.locator('#citation');
const offer = (page) => page.locator('#auto-offer');
const status = (page) => page.locator('#copy-status');
const preset = (page, name) => page.getByRole('group', { name: 'Fictional examples' }).getByRole('button', { name, exact: true });

async function clipboardStub(page, mode = 'rich') {
  await page.addInitScript((mode) => {
    window.__clip = [];
    const write = async (items) => {
      if (mode !== 'rich') throw new Error('rich unavailable');
      const item = items[0];
      const plain = await (await item.getType('text/plain')).text();
      const html = await (await item.getType('text/html')).text();
      window.__clip.push({ plain, html, kind: 'rich' });
    };
    const writeText = async (plain) => {
      if (mode === 'fail') throw new Error('clipboard denied');
      window.__clip.push({ plain, kind: 'plain' });
    };
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { write, writeText } });
  }, mode);
}
async function chooseStyle(page, style) {
  await page.getByRole('radio', { name: style, exact: true }).check();
}

test.beforeEach(async ({ page }) => {
  await clipboardStub(page);
  await page.goto('/');
});

test('fictional person is ready immediately and output follows style, mode and form', async ({ page }) => {
  await expect(page.getByRole('heading', { name: 'Cite a website', exact: true })).toBeVisible();
  await expect(page.locator('#title')).toHaveValue('Growing herbs on a windowsill');
  await expect(preset(page, 'Person')).toHaveAttribute('aria-pressed', 'true');
  await expect(copy(page)).toBeEnabled();
  await expect(citation(page)).toHaveText('Bennett, M. (2024, April 18). Growing herbs on a windowsill. The Little Garden. https://example.com/windowsill-herbs');
  await expect(offer(page)).toBeHidden();
  await chooseStyle(page, 'MLA 9');
  await expect(citation(page)).toHaveText('Bennett, Maya. “Growing Herbs on a Windowsill.” The Little Garden, 18 Apr. 2024, example.com/windowsill-herbs.');
  await page.getByRole('radio', { name: 'In-text', exact: true }).check();
  await expect(citation(page)).toHaveText('(Bennett)');
  await page.getByRole('radio', { name: 'Narrative', exact: true }).check();
  await expect(citation(page)).toHaveText('Bennett');
  await chooseStyle(page, 'APA 7');
  await expect(citation(page)).toHaveText('Bennett (2024)');
  await page.getByRole('radio', { name: 'Parenthetical', exact: true }).check();
  await expect(citation(page)).toHaveText('(Bennett, 2024)');
});

test('all presets work in both styles, reset locator/errors, and manual edit clears preset', async ({ page }) => {
  for (const style of ['APA 7', 'MLA 9']) {
    await chooseStyle(page, style);
    for (const [name, title, marker] of [
      ['Person', 'Growing herbs on a windowsill', 'Bennett'],
      ['Organization', 'A guide to neighborhood trees', 'Green Street Project'],
      ['No author or date', 'A short history of paper', 'history of paper'],
    ]) {
      await preset(page, name).click();
      await expect(preset(page, name)).toHaveAttribute('aria-pressed', 'true');
      await expect(page.locator('#title')).toHaveValue(title);
      await expect(citation(page)).toContainText(new RegExp(marker, 'i'));
      await expect(copy(page)).toBeEnabled();
    }
  }
  await page.getByRole('radio', { name: 'In-text', exact: true }).check();
  await page.getByText('Additional source details (optional)', { exact: true }).click();
  await page.locator('#locator').fill('3');
  await page.locator('#url').fill('javascript:alert(1)');
  await preset(page, 'Person').click();
  await expect(page.locator('#locator')).toHaveValue('');
  await expect(page.locator('#url')).toHaveValue('https://example.com/windowsill-herbs');
  await expect(copy(page)).toBeEnabled();
  await page.locator('#title').fill('A different page');
  await expect(preset(page, 'Person')).toHaveAttribute('aria-pressed', 'false');
  await expect(citation(page)).toContainText('Bennett');
});

test('advanced authors and date precision update the output', async ({ page }) => {
  await page.getByText('Additional source details (optional)', { exact: true }).click();
  await page.getByRole('button', { name: 'Add author', exact: true }).click();
  await page.getByLabel('First name').last().fill('Ben');
  await page.getByLabel('Last name').last().fill('Jones');
  await expect(citation(page)).toContainText('Jones, B.');
  await page.getByRole('button', { name: 'Remove author 2', exact: true }).click();
  await expect(citation(page)).not.toContainText('Jones');
  await page.getByLabel('Year', { exact: true }).first().fill('2023');
  await page.getByLabel('Month', { exact: true }).first().fill('');
  await page.getByLabel('Day', { exact: true }).first().fill('');
  await expect(citation(page)).toContainText('(2023)');
  await page.getByLabel('Month', { exact: true }).first().fill('7');
  await expect(citation(page)).toContainText('(2023, July)');
  await page.getByRole('radio', { name: 'In-text', exact: true }).check();
  await page.getByLabel('Locator type').selectOption({ label: 'Paragraph' });
  await page.locator('#locator').fill('3');
  await expect(citation(page)).toContainText('para. 3');
  await page.getByLabel('Locator type').selectOption({ label: 'Section' });
  await expect(citation(page)).toContainText('3');
  await expect(citation(page)).not.toContainText('p. 3');
});

test('invalid URL and missing title prevent stale copy, then repair restores output', async ({ page }) => {
  await page.locator('#url').fill('javascript:alert(1)');
  await expect(page.locator('#url-error')).not.toBeEmpty();
  await expect(copy(page)).toBeDisabled();
  await expect(citation(page)).not.toContainText('https://example.com/windowsill-herbs');
  await expect(offer(page)).toBeHidden();
  await page.locator('#url').fill('https://example.org/fixed');
  await expect(copy(page)).toBeEnabled();
  await page.locator('#title').fill('');
  await expect(page.locator('#title-error')).not.toBeEmpty();
  await expect(copy(page)).toBeDisabled();
  await page.locator('#title').fill('Restored page');
  await expect(copy(page)).toBeEnabled();
  await expect(citation(page)).toContainText('Restored page');
  expect(await page.evaluate(() => window.__clip)).toHaveLength(0);
});

test('copy writes current rich and plain values before first session offer', async ({ page }) => {
  const text = await citation(page).textContent();
  await copy(page).click();
  await expect(status(page)).toContainText(/copied/i);
  await expect(offer(page)).toBeVisible();
  const writes = await page.evaluate(() => window.__clip);
  expect(writes).toHaveLength(1);
  expect(writes[0].kind).toBe('rich');
  expect(writes[0].plain).toBe(text);
  expect(writes[0].html).toMatch(/<(i|em)>/);
  await page.getByRole('button', { name: 'Continue on website' }).click();
  await expect(offer(page)).toBeHidden();
  await copy(page).click();
  await expect(offer(page)).toBeHidden();
  await page.reload();
  await copy(page).click();
  await expect(offer(page)).toBeHidden();
});

test('rich copy failure falls back to plain copy', async ({ browser }) => {
  const context = await browser.newContext({ baseURL: 'http://127.0.0.1:4180' });
  const page = await context.newPage();
  await clipboardStub(page, 'fallback');
  await page.goto('/');
  const text = await citation(page).textContent();
  await copy(page).click();
  await expect(status(page)).toContainText(/copied/i);
  await expect(offer(page)).toBeVisible();
  expect(await page.evaluate(() => window.__clip)).toEqual([{ plain: text, kind: 'plain' }]);
  await context.close();
});

test('clipboard rejection displays error without success or offer', async ({ browser }) => {
  const context = await browser.newContext({ baseURL: 'http://127.0.0.1:4180' });
  const page = await context.newPage();
  await clipboardStub(page, 'fail');
  await page.goto('/');
  await copy(page).click();
  await expect(status(page)).toContainText(/couldn.t copy|unable to copy|failed to copy/i);
  await expect(status(page)).not.toContainText(/citation copied/i);
  await expect(offer(page)).toBeHidden();
  expect(await page.evaluate(() => window.__clip)).toHaveLength(0);
  await context.close();
});

test('explicit capture and library dialogs trap focus, Escape closes and returns focus', async ({ page }) => {
  for (const name of ['Capture details with the extension', 'Save in extension library']) {
    const trigger = page.getByRole('button', { name, exact: true });
    await trigger.focus();
    await page.keyboard.press('Enter');
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText(/extension/i);
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab');
      expect(await dialog.evaluate((el) => el.contains(document.activeElement))).toBe(true);
    }
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
  }
  await expect(page.locator('#title')).toHaveValue('Growing herbs on a windowsill');
});

for (const viewport of [{ width: 1440, height: 900 }, { width: 958, height: 704 }, { width: 768, height: 1024 }, { width: 390, height: 844 }]) {
  test(`initial controls, accessibility and overflow at ${viewport.width}x${viewport.height}`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    await page.reload();
    for (const element of [page.getByRole('link', { name: 'Get the Chrome extension' }).first(), copy(page)]) {
      await expect(element).toBeVisible();
      const rect = await element.boundingBox();
      expect(rect.x).toBeGreaterThanOrEqual(0);
      expect(rect.y).toBeGreaterThanOrEqual(0);
      expect(rect.x + rect.width).toBeLessThanOrEqual(viewport.width);
      expect(rect.y + rect.height).toBeLessThanOrEqual(viewport.height);
    }
    await page.screenshot({ path: testInfo.outputPath(`initial-${viewport.width}x${viewport.height}.png`), fullPage: true });
    const violations = (await new AxeBuilder({ page }).analyze()).violations.filter(v => ['serious', 'critical'].includes(v.impact));
    expect(violations).toEqual([]);
    await page.locator('#title').fill('LongUnbrokenTitle'.repeat(30));
    await page.locator('#url').fill(`https://example.org/${'longsegment'.repeat(50)}`);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });
}
