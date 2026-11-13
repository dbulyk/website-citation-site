import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

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
