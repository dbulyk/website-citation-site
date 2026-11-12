import { test, expect } from '@playwright/test';

for (const width of [1022, 768, 390, 320]) {
  test(`walkthrough capture, style, save and restart at ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    const demo = page.frameLocator('iframe[title="Interactive website citation walkthrough"]');
    const capture = demo.getByRole('button', { name: 'Cite this page', exact: true });
    const save = demo.getByRole('button', { name: 'Save to library', exact: true });
    const hint = demo.locator('.cw-hint');
    async function checkHint(target) {
      await expect(hint).toBeVisible();
      // The tip of the approved arrow path is at (24, 26) in its SVG viewBox.
      const tip = await hint.locator('svg').evaluate(svg => {
        const point = svg.createSVGPoint(); point.x = 24; point.y = 26;
        const p = point.matrixTransform(svg.getScreenCTM()); return { x: p.x, y: p.y };
      });
      const rect = await target.evaluate(el => { const r = el.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top }; });
      expect(tip.x).toBeGreaterThanOrEqual(rect.left);
      expect(tip.x).toBeLessThanOrEqual(rect.right);
      expect(rect.top - tip.y).toBeGreaterThanOrEqual(3);
      expect(rect.top - tip.y).toBeLessThanOrEqual(9);
    }
    async function touchTarget(control) {
      if (width > 390) return;
      const box = await control.boundingBox();
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
    }
    await expect(demo.getByText(/simulation only/i)).toBeVisible();
    await checkHint(capture);
    await touchTarget(capture);
    await capture.click();
    const style = demo.getByLabel('Citation style');
    await touchTarget(style);
    await expect(demo.locator('.cw-reference')).toContainText('Bennett, M.');
    await style.selectOption({ label: 'MLA 9' });
    await expect(demo.locator('.cw-reference')).toContainText('Bennett, Maya');
    await checkHint(save);
    const authors = demo.locator('.cw-field').last();
    const authorBox = await authors.boundingBox();
    const hintBox = await hint.boundingBox();
    expect(hintBox.y).toBeGreaterThanOrEqual(authorBox.y + authorBox.height);
    await touchTarget(save);
    await save.click();
    await expect(demo.getByRole('status')).toContainText(/saved in this demo/i);
    const install = demo.getByRole('link', { name: 'Get the Chrome extension' });
    await expect(install).toHaveAttribute('href', /chromewebstore\.google\.com/);
    await touchTarget(install);
    const restart = demo.getByRole('button', { name: /Try again/ });
    await touchTarget(restart);
    await restart.click();
    await expect(capture).toBeVisible();
    await checkHint(capture);
  });
}
