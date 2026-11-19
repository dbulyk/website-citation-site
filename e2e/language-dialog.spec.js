import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { createServer } from 'vite';

test('a welcome locale with missing dialog metadata leaves language selection usable', async ({ page }) => {
  const server = await createServer({
    server: { host: '127.0.0.1', port: 0, hmr: false, watch: null },
    plugins: [{
      name: 'missing-german-dialog-metadata',
      enforce: 'pre',
      transform(source, id) {
        if (id.endsWith('/src/languages.json') || id.endsWith('/src/language-dialog-copy.json')) {
          const entries = JSON.parse(source);
          delete entries.de;
          return JSON.stringify(entries);
        }
        if (id.endsWith('/welcome/locales/de.json')) {
          const copy = JSON.parse(source);
          delete copy.language_label;
          return JSON.stringify(copy);
        }
      },
    }],
  });
  try {
    await server.listen();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(new URL('/welcome/', server.resolvedUrls.local[0]).href);
    expect(errors).toEqual([]);
    await page.getByRole('button', { name: 'Language: English', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: /^de\b/ }).click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'de');
    await page.getByRole('button', { name: 'de', exact: true }).click();
    const search = dialog.getByRole('searchbox', { name: 'Search languages' });
    await search.fill('no-language-matches-this');
    await expect(dialog.getByText('No languages found', { exact: true })).toBeVisible();
    await search.fill('English');
    await dialog.getByRole('button', { name: /English/ }).click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    expect(errors).toEqual([]);
  } finally {
    await server.close();
  }
});

test('search filters by autonym, English name and code, with an empty state', async ({ page }) => {
  await page.goto('/welcome/');
  await page.getByRole('button', { name: 'Language: English', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Choose language' });
  const search = dialog.getByRole('searchbox', { name: 'Search languages' });
  await expect(search).toBeFocused();
  const accessibility = await new AxeBuilder({ page }).include('dialog[open]').analyze();
  expect(accessibility.violations.filter(({ impact }) => ['serious', 'critical'].includes(impact))).toEqual([]);
  for (const query of ['Русский', 'Russian', 'ru']) {
    await search.fill(query);
    await expect(dialog.getByRole('button', { name: /Русский/ })).toBeVisible();
    await expect(dialog.getByRole('button', { name: /日本語/ })).toBeHidden();
  }
  await search.fill('no-language-matches-this');
  await expect(dialog.getByText('No languages found', { exact: true })).toBeVisible();
  await expect(dialog.locator('button[aria-pressed]:visible')).toHaveCount(0);
  await search.fill('');
  await expect(dialog.locator('button[aria-pressed]:visible')).toHaveCount(28);
});

test('Escape closes the modal and returns focus to the trigger', async ({ page }) => {
  await page.goto('/welcome/');
  const trigger = page.getByRole('button', { name: 'Language: English', exact: true });
  await trigger.click();
  const dialog = page.getByRole('dialog', { name: 'Choose language' });
  await expect(dialog.getByRole('searchbox', { name: 'Search languages' })).toBeFocused();
  for (let i = 0; i < 4; i++) {
    await page.keyboard.press('Tab');
    await expect.poll(() => page.evaluate(() => Boolean(document.activeElement?.closest('dialog')))).toBe(true);
  }
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
  await trigger.click();
  await dialog.getByRole('searchbox', { name: 'Search languages' }).fill('Russian');
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(trigger).toBeFocused();
});

test('mouse selection updates the language and selected state on reopening', async ({ page }) => {
  await page.goto('/welcome/');
  await page.getByRole('button', { name: 'Language: English', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: /Русский/ }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'ru');
  await page.getByRole('button', { name: 'Язык: Русский', exact: true }).click();
  const russianDialog = page.getByRole('dialog', { name: 'Выберите язык' });
  await expect(russianDialog.getByRole('button', { name: /Русский/ })).toHaveAttribute('aria-pressed', 'true');
  await expect(russianDialog.getByRole('button', { pressed: true })).toHaveCount(1);
});
