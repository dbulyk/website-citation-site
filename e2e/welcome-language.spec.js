import { test, expect } from '@playwright/test';

const extensionId = 'abcdefghijklmnopabcdefghijklmnop';
const headerLanguage = (page) => page.locator('header').getByRole('button', { name: /English|Русский|العربية/ });

async function chooseLanguage(page, name) {
  await headerLanguage(page).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name }).click();
  await expect(dialog).not.toBeVisible();
}
const guideSelect = (page) => page.locator('footer').getByRole('combobox');

async function expectContext(page, locale) {
  await expect.poll(() => page.evaluate(() => ({ path: location.pathname, id: new URLSearchParams(location.search).get('extensionId'), lang: new URLSearchParams(location.search).get('lang'), hash: location.hash }))).toEqual({ path: '/welcome/', id: extensionId, lang: locale, hash: '#usage' });
}

test('language dialog offers the supported languages with native names', async ({ page }) => {
  await page.goto('/welcome/', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Language: English', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Choose language' });
  await expect(dialog.locator('button[aria-pressed]')).toHaveCount(28);
  await expect(dialog.getByRole('button', { name: /English/ })).toHaveAttribute('aria-pressed', 'true');
  for (const autonym of ['العربية', 'Deutsch', 'Ελληνικά', 'English', 'Español', 'Eesti', 'Suomi', 'Filipino', 'Français', 'हिन्दी', 'Hrvatski', 'Magyar', 'Bahasa Indonesia', 'Italiano', '日本語', '한국어', 'Nederlands', 'Norsk', 'Polski', 'Português (Brasil)', 'Português (Portugal)', 'Русский', 'Svenska', 'ไทย', 'Türkçe', 'Українська', 'Tiếng Việt', '简体中文']) {
    await expect(dialog.locator('button[aria-pressed]').filter({ hasText: autonym })).toBeVisible();
  }
});

test('changing language preserves manual mode, status, focus and extension context', async ({ page }) => {
  await page.goto(`/welcome/?extensionId=${extensionId}#usage`, { waitUntil: 'domcontentloaded' });
  const language = headerLanguage(page);
  await expect(page.getByRole('button', { name: 'Language: English', exact: true })).toBeVisible();
  await language.focus();
  const status = page.locator('footer [aria-live]');
  await expect(status).not.toBeEmpty();
  await chooseLanguage(page, /Русский/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'ru');
  await expect(page.locator('html')).not.toHaveAttribute('dir', 'rtl');
  await expect(page.getByRole('heading', { name: 'Цитирование первой страницы' })).toBeVisible();
  await expect(guideSelect(page)).toHaveValue('usage');
  await expect(language).toBeFocused();
  await expect(status).not.toBeEmpty();
  await expectContext(page, 'ru');
  await chooseLanguage(page, /العربية/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.getByRole('heading', { name: 'اقتبس صفحتك الأولى' })).toBeVisible();
  await expect(guideSelect(page)).toHaveValue('usage');
  await expect(language).toBeFocused();
  await chooseLanguage(page, /English/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('html')).not.toHaveAttribute('dir', 'rtl');
  await expect(page.getByRole('heading', { name: 'Cite your first page' })).toBeVisible();
  await expect(language).toBeFocused();
  await expectContext(page, 'en');
});

test('example and return retain language and extension context; unsupported language falls back', async ({ page }) => {
  await page.goto(`/welcome/?extensionId=${extensionId}&lang=unknown#usage`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByRole('button', { name: 'Language: English', exact: true })).toBeVisible();
  await chooseLanguage(page, /Русский/);
  await page.getByRole('link', { name: 'Попробовать на примере' }).click();
  await expect(page).toHaveURL(/\/welcome\/example\//);
  await expect(page.locator('html')).toHaveAttribute('lang', 'ru');
  const exampleLanguage = headerLanguage(page);
  await expect(exampleLanguage).toBeVisible();
  await expect(exampleLanguage).toContainText('Русский');
  await chooseLanguage(page, /English/);
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await page.getByRole('link', { name: 'Back to the guide' }).click();
  await expectContext(page, 'en');
  await expect(page.getByRole('heading', { name: 'Cite your first page' })).toBeVisible();
  await expect(headerLanguage(page)).toContainText('English');
});
