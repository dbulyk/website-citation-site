import { test, expect } from '@playwright/test';

const extensionId = 'abcdefghijklmnopabcdefghijklmnop';
const headerLanguage = (page) => page.locator('header').getByRole('combobox');
const guideSelect = (page) => page.locator('footer').getByRole('combobox');

async function expectContext(page, locale) {
  await expect.poll(() => page.evaluate(() => ({ path: location.pathname, id: new URLSearchParams(location.search).get('extensionId'), lang: new URLSearchParams(location.search).get('lang'), hash: location.hash }))).toEqual({ path: '/welcome/', id: extensionId, lang: locale, hash: '#usage' });
}

const locales = ['ar', 'de', 'el', 'en', 'es', 'et', 'fi', 'fil', 'fr', 'hi', 'hr', 'hu', 'id', 'it', 'ja', 'ko', 'nl', 'no', 'pl', 'pt_BR', 'pt_PT', 'ru', 'sv', 'th', 'tr', 'uk', 'vi', 'zh_CN'];

test('language selector offers the supported languages with native names', async ({ page }) => {
  await page.goto('/welcome/', { waitUntil: 'domcontentloaded' });
  const language = page.getByRole('combobox', { name: 'Language', exact: true });
  await expect(language).toBeVisible();
  await expect(language).toHaveJSProperty('tagName', 'SELECT');
  expect((await language.locator('option').evaluateAll(options => options.map(option => option.value))).sort()).toEqual([...locales].sort());
  await expect(language.locator('option[value="en"]')).toHaveText('English');
  await expect(language.locator('option[value="ru"]')).toHaveText('Русский');
  await expect(language.locator('option[value="ar"]')).toHaveText('العربية');
});

test('changing language preserves manual mode, status, focus and extension context', async ({ page }) => {
  await page.goto(`/welcome/?extensionId=${extensionId}#usage`, { waitUntil: 'domcontentloaded' });
  const language = headerLanguage(page);
  await expect(page.getByRole('combobox', { name: 'Language', exact: true })).toBeVisible();
  await language.focus();
  const status = page.locator('footer [aria-live]');
  await expect(status).not.toBeEmpty();
  await language.selectOption('ru');
  await expect(page.locator('html')).toHaveAttribute('lang', 'ru');
  await expect(page.locator('html')).not.toHaveAttribute('dir', 'rtl');
  await expect(page.getByRole('heading', { name: 'Цитирование первой страницы' })).toBeVisible();
  await expect(guideSelect(page)).toHaveValue('usage');
  await expect(language).toBeFocused();
  await expect(status).not.toBeEmpty();
  await expectContext(page, 'ru');
  await language.selectOption('ar');
  await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.getByRole('heading', { name: 'اقتبس صفحتك الأولى' })).toBeVisible();
  await expect(guideSelect(page)).toHaveValue('usage');
  await expect(language).toBeFocused();
  await language.selectOption('en');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('html')).not.toHaveAttribute('dir', 'rtl');
  await expect(page.getByRole('heading', { name: 'Cite your first page' })).toBeVisible();
  await expect(language).toBeFocused();
  await expectContext(page, 'en');
});

test('example and return retain language and extension context; unsupported language falls back', async ({ page }) => {
  await page.goto(`/welcome/?extensionId=${extensionId}&lang=unknown#usage`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByRole('combobox', { name: 'Language', exact: true })).toHaveValue('en');
  await headerLanguage(page).selectOption('ru');
  await page.getByRole('link', { name: 'Попробовать на примере' }).click();
  await expect(page).toHaveURL(/\/welcome\/example\//);
  await expect(page.locator('html')).toHaveAttribute('lang', 'ru');
  const exampleLanguage = headerLanguage(page);
  await expect(exampleLanguage).toBeVisible();
  await expect(exampleLanguage).toHaveValue('ru');
  await exampleLanguage.selectOption('en');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await page.getByRole('link', { name: 'Back to the guide' }).click();
  await expectContext(page, 'en');
  await expect(page.getByRole('heading', { name: 'Cite your first page' })).toBeVisible();
  await expect(headerLanguage(page)).toHaveValue('en');
});
