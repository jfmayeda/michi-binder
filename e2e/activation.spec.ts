import { expect, test } from '@playwright/test';

test('activation: landing flip, clone, playground', async ({ page }) => {
  const indexRequests: string[] = [];
  page.on('request', (req) => {
    if (req.url().includes('/data/cards-index.json')) indexRequests.push(req.url());
  });

  await page.goto('/?mode=2d');
  await expect(page.getByRole('heading', { name: 'Michi Binder Studio' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Next', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page.getByText(/Spread 2 of/)).toBeVisible({ timeout: 10_000 });
  expect(indexRequests).toEqual([]);

  await page.getByRole('button', { name: 'Clone this page' }).click();
  await expect(page).toHaveURL(/\/studio\/michi-playground/, { timeout: 15_000 });
  await expect(page.getByRole('heading').first()).toBeVisible();
});

test('anonymous shelf visits redirect to landing', async ({ page }) => {
  await page.goto('/shelf');
  await expect(page).toHaveURL('/', { timeout: 10_000 });
  await expect(page.getByRole('heading', { name: 'Michi Binder Studio' })).toBeVisible();
});
