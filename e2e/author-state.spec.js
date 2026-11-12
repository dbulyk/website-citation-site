import { test, expect } from '@playwright/test';

test('switching to no author clears validation from hidden author rows', async ({ page }) => {
  await page.goto('/');
  await page.getByText('Additional source details (optional)', { exact: true }).click();
  await page.getByRole('button', { name: 'Add author', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Copy citation' })).toBeDisabled();
  await page.getByRole('radio', { name: 'No author', exact: true }).check();
  await expect(page.getByRole('button', { name: 'Copy citation' })).toBeEnabled();
  await expect(page.locator('#citation')).toHaveText(/^Growing herbs on a windowsill\. \(2024, April 18\)\./);
});
