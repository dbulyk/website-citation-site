import { test, expect } from '@playwright/test';

const result = page => page.locator('.result-sticky');
const copy = page => page.getByRole('button', { name: 'Copy citation' });
const offer = page => page.locator('#auto-offer');
const preset = (page, name) => page.getByRole('group', { name: 'Fictional examples' }).getByRole('button', { name, exact: true });
const radio = (page, name) => page.getByRole('radio', { name, exact: true });

async function documentRect(locator) {
  return locator.evaluate(el => {
    const r = el.getBoundingClientRect();
    return { top: r.top + window.scrollY, left: r.left + window.scrollX, width: r.width, height: r.height, bottom: r.bottom + window.scrollY };
  });
}
function stable(actual, expected, label) {
  for (const key of ['top', 'left', 'width', 'height']) {
    expect(Math.abs(actual[key] - expected[key]), `${label}: ${key}`).toBeLessThanOrEqual(1);
  }
}
async function stubClipboard(page) {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { write: async () => {}, writeText: async () => {} } });
  });
}
function intersects(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}
async function inViewport(locator, viewport) {
  await expect(locator).toBeVisible();
  const box = await locator.boundingBox();
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.y).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1);
  expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + 1);
}

for (const viewport of [{ width: 959, height: 704 }, { width: 1440, height: 900 }]) {
  test(`details disclosure keeps result stationary at ${viewport.width}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/');
    const summary = page.locator('.source-extra summary');
    await summary.scrollIntoViewIfNeeded();
    // Place the disclosure in view at a position that formerly released the sticky constraint.
    await page.evaluate(() => window.scrollTo(0, 820));
    await summary.focus({ preventScroll: true });
    const before = await documentRect(result(page));
    const scrollBefore = await page.evaluate(() => scrollY);
    await page.keyboard.press('Enter');
    await expect(page.locator('.source-extra')).toHaveAttribute('open', '');
    expect(await page.evaluate(() => scrollY)).toBe(scrollBefore);
    stable(await documentRect(result(page)), before, 'open');
    await page.keyboard.press('Enter');
    await expect(page.locator('.source-extra')).not.toHaveAttribute('open', '');
    stable(await documentRect(result(page)), before, 'close');
  });
}

for (const viewport of [{ width: 959, height: 704 }, { width: 390, height: 844 }]) {
  test(`copy and result bounds remain stable across examples and choices at ${viewport.width}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await inViewport(copy(page), viewport);
    const initialCopy = await documentRect(copy(page));
    const initialResult = await documentRect(result(page));
    for (const mode of ['Reference', 'In-text']) {
      await radio(page, mode).check();
      for (const style of ['APA 7', 'MLA 9']) {
        await radio(page, style).check();
        for (const name of ['Person', 'Organization', 'No author or date']) {
          await preset(page, name).click();
          await expect(preset(page, name)).toHaveAttribute('aria-pressed', 'true');
          const current = await documentRect(copy(page));
          expect(Math.abs(current.top - initialCopy.top), `${mode}, ${style}, ${name}: copy top`).toBeLessThanOrEqual(1);
          stable(await documentRect(result(page)), initialResult, `${mode}, ${style}, ${name}: result`);
        }
      }
    }
    await radio(page, 'Narrative').check();
    await expect(radio(page, 'Narrative')).toBeChecked();
    await radio(page, 'Parenthetical').check();
    await expect(radio(page, 'Parenthetical')).toBeChecked();
  });
}

for (const viewport of [{ width: 959, height: 704 }, { width: 390, height: 844 }]) {
  test(`first copy offer fits and does not move focus or cover controls at ${viewport.width}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await stubClipboard(page);
    await page.goto('/');
    const before = await documentRect(result(page));
    const scrollBefore = await page.evaluate(() => scrollY);
    await copy(page).click();
    await expect(offer(page)).toBeVisible();
    await expect(copy(page)).toBeFocused();
    expect(await page.evaluate(() => scrollY)).toBe(scrollBefore);
    stable(await documentRect(result(page)), before, 'offer appearance');
    await inViewport(offer(page).getByRole('link', { name: 'Get the Chrome extension' }), viewport);
    await inViewport(offer(page).getByRole('button', { name: 'Close' }), viewport);
    await inViewport(offer(page).getByRole('button', { name: 'Continue on website' }), viewport);
    const offerBox = await offer(page).boundingBox();
    expect(intersects(offerBox, await copy(page).boundingBox()), 'offer covers Copy').toBe(false);
    if (viewport.width > 700) expect(intersects(offerBox, await page.locator('#source-details').boundingBox()), 'offer covers form').toBe(false);
  });
}

test('offer dismisses on Escape and outside editing still works', async ({ browser }) => {
  for (const dismissal of ['Escape', 'editor']) {
    const context = await browser.newContext({ baseURL: 'http://127.0.0.1:4180', viewport: { width: 959, height: 704 } });
    const page = await context.newPage();
    await stubClipboard(page);
    await page.goto('/');
    await copy(page).click();
    await expect(offer(page)).toBeVisible();
    if (dismissal === 'Escape') await page.keyboard.press('Escape');
    else {
      await page.locator('#title').click();
      await page.locator('#title').fill('Edited title');
      await expect(page.locator('#title')).toHaveValue('Edited title');
      await expect(page.locator('#citation')).toContainText('Edited title');
    }
    await expect(offer(page)).toBeHidden();
    await context.close();
  }
});

test('long manually entered citation grows without clipping and remains selectable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const sheet = page.locator('.citation-sheet');
  const shortHeight = (await documentRect(sheet)).height;
  const title = 'A long detailed title about a fictional source '.repeat(35);
  await page.locator('#title').fill(title);
  const citation = page.locator('#citation');
  await expect(citation).toContainText('fictional source');
  expect((await documentRect(sheet)).height).toBeGreaterThan(shortHeight);
  expect(await citation.evaluate(el => el.scrollHeight <= el.clientHeight + 1 && getComputedStyle(el).userSelect !== 'none')).toBe(true);
});

test('defers the first offer when the viewport cannot fit its actions', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 256 });
  await stubClipboard(page);
  await page.goto('/');
  await copy(page).evaluate(el => el.scrollIntoView({ block: 'center' }));
  await copy(page).click();
  await expect(page.locator('#copy-status')).toContainText(/copied/i);
  await expect(offer(page)).toBeHidden();

  const largerViewport = { width: 390, height: 844 };
  await page.setViewportSize(largerViewport);
  await copy(page).evaluate(el => el.scrollIntoView({ block: 'center' }));
  await copy(page).click();
  await expect(offer(page)).toBeVisible();
  await inViewport(offer(page).getByRole('link', { name: 'Get the Chrome extension' }), largerViewport);
});

test('scrolled mobile offer leaves source form and Copy unobscured', async ({ page }) => {
  const viewport = { width: 390, height: 844 };
  await page.setViewportSize(viewport);
  await stubClipboard(page);
  await page.goto('/');
  await copy(page).evaluate(el => window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 30));
  const scrollBefore = await page.evaluate(() => window.scrollY);
  await copy(page).click();
  await expect(offer(page)).toBeVisible();
  expect(await page.evaluate(() => window.scrollY)).toBe(scrollBefore);
  for (const action of [offer(page).getByRole('link', { name: 'Get the Chrome extension' }), offer(page).getByRole('button', { name: 'Close' }), offer(page).getByRole('button', { name: 'Continue on website' })]) await inViewport(action, viewport);
  const offerBox = await offer(page).boundingBox();
  expect(intersects(offerBox, await copy(page).boundingBox()), 'offer covers Copy').toBe(false);
  expect(intersects(offerBox, await page.locator('#source-details').boundingBox()), 'offer covers source form').toBe(false);
});
