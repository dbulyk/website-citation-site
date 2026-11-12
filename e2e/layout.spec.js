import { test, expect } from '@playwright/test';

const result = page => page.locator('.result-sticky');
const copy = page => page.getByRole('button', { name: /^Copy (citation|again)$/ });
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
  test(`details disclosure works from keyboard at ${viewport.width}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto('/');
    const summary = page.locator('.source-extra summary');
    await summary.scrollIntoViewIfNeeded();
    // Place the disclosure in view at a position that formerly released the sticky constraint.
    await page.evaluate(() => window.scrollTo(0, 820));
    await summary.focus({ preventScroll: true });
    const scrollBefore = await page.evaluate(() => scrollY);
    await page.keyboard.press('Enter');
    await expect(page.locator('.source-extra')).toHaveAttribute('open', '');
    expect(await page.evaluate(() => scrollY)).toBe(scrollBefore);
    await page.keyboard.press('Enter');
    await expect(page.locator('.source-extra')).not.toHaveAttribute('open', '');
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

for (const viewport of [{ width: 959, height: 704 }, { width: 390, height: 844 }, { width: 320, height: 700 }]) {
  test(`inline copy actions do not overlap or shift surrounding content at ${viewport.width}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await stubClipboard(page);
    await page.goto('/');
    const before = await documentRect(result(page));
    const formBefore = await documentRect(page.locator('#source-details'));
    await copy(page).click();
    await expect(offer(page)).toBeVisible();
    await expect(copy(page)).toBeFocused();
    stable(await documentRect(result(page)), before, 'offer appearance');
    stable(await documentRect(page.locator('#source-details')), formBefore, 'source form');
    const actions = [copy(page), offer(page), page.getByRole('button', { name: 'Close', exact: true })];
    for (const action of actions) {
      await expect(action).toBeVisible();
      const rect = await action.boundingBox();
      expect(rect.height).toBeGreaterThanOrEqual(44);
    }
    for (let i = 0; i < actions.length; i++) for (let j = i + 1; j < actions.length; j++) {
      expect(intersects(await actions[i].boundingBox(), await actions[j].boundingBox())).toBe(false);
    }
    expect(intersects(await offer(page).boundingBox(), await page.locator('#source-details').boundingBox())).toBe(false);
  });
}

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
