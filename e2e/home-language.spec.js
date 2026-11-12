import { test, expect } from '@playwright/test';

const language = (page) => page.locator('header').getByRole('combobox');

async function expectLocale(page, lang) {
  await expect(page.locator('html')).toHaveAttribute('lang', lang);
  await expect.poll(() => new URL(page.url()).searchParams.get('lang')).toBe(lang);
}

test('homepage language control offers only English and Russian and preserves citation state', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const control = page.getByRole('combobox', { name: 'Language', exact: true });
  await expect(control).toBeVisible();
  await expect(control).toHaveJSProperty('tagName', 'SELECT');
  await expect(control.locator('option')).toHaveText(['English', 'Русский']);
  expect((await control.locator('option').evaluateAll(options => options.map(option => option.value))).sort()).toEqual(['en', 'ru']);
  await page.locator('#title').fill('My edited source title');
  await page.locator('#url').fill('https://example.org/custom-source');
  await page.getByRole('radio', { name: 'MLA 9', exact: true }).check();
  await page.getByRole('radio', { name: 'In-text', exact: true }).check();
  await page.getByRole('radio', { name: 'Narrative', exact: true }).check();
  const citation = await page.locator('#citation').innerHTML();
  await control.selectOption('ru');
  await expectLocale(page, 'ru');
  await expect(page.getByRole('combobox', { name: 'Язык', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Цитирование сайта', exact: true })).toBeVisible();
  await expect(page.locator('#title')).toHaveValue('My edited source title');
  await expect(page.locator('#url')).toHaveValue('https://example.org/custom-source');
  await expect(page.locator('input[name="style"][value="mla"]')).toBeChecked();
  await expect(page.getByRole('radio', { name: 'В тексте', exact: true })).toBeChecked();
  await expect(page.getByRole('radio', { name: 'В тексте предложения', exact: true })).toBeChecked();
  expect(await page.locator('#citation').innerHTML()).toBe(citation);
  await language(page).selectOption('en');
  await expectLocale(page, 'en');
  await expect(page.getByRole('heading', { name: 'Cite a website', exact: true })).toBeVisible();
  await expect(page.locator('#title')).toHaveValue('My edited source title');
  expect(await page.locator('#citation').innerHTML()).toBe(citation);
});

test('Russian translates validation, clipboard feedback and the extension dialog', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: {
      write: async () => {}, writeText: async () => {},
    } });
  });
  await page.goto('/?lang=ru', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('combobox', { name: 'Язык', exact: true })).toBeVisible();
  await expectLocale(page, 'ru');
  await page.locator('#url').fill('not-a-url');
  await expect(page.locator('#url-error')).toHaveText('Введите корректный URL страницы, включая https:// или http://.');
  await page.locator('#url').fill('https://example.org/valid');
  await page.getByRole('button', { name: 'Скопировать ссылку', exact: true }).click();
  await expect(page.locator('#copy-status')).toHaveText('Ссылка скопирована.');
  await page.getByRole('button', { name: 'Получить сведения с помощью расширения', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('heading', { name: 'Получить сведения со страницы' })).toBeVisible();
  await expect(dialog).toContainText('Откройте страницу источника в Chrome на компьютере');
});

test('embedded demo follows homepage language without translating fictional source metadata', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  const control = page.getByRole('combobox', { name: 'Language', exact: true });
  await expect(control).toBeVisible();
  const demo = page.frameLocator('iframe.walkthrough-frame');
  await expect(demo.getByText('Interactive demo', { exact: true })).toBeVisible();
  const articleText = await demo.locator('.cw-article-body').innerText();
  await control.selectOption('ru');
  await expect(demo.getByText('Интерактивная демонстрация', { exact: true })).toBeVisible();
  await expect(demo.getByRole('button', { name: 'Цитировать эту страницу', exact: true })).toBeVisible();
  await expect(demo.locator('.cw-article-body')).toContainText('Maya Bennett');
  expect(await demo.locator('.cw-article-body').innerText()).toContain(articleText.replace('By Maya Bennett', '').trim());
  await language(page).selectOption('en');
  await expect(demo.getByText('Interactive demo', { exact: true })).toBeVisible();
  await expect(demo.locator('.cw-article-body')).toHaveText(articleText);
});
