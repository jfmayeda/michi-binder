import { expect, test } from '@playwright/test';

test('activation: read the starter spread, then edit a copy of it', async ({ page }) => {
  const indexRequests: string[] = [];
  page.on('request', (req) => {
    if (req.url().includes('/data/cards-index.json')) indexRequests.push(req.url());
  });

  await page.goto('/?mode=2d');
  await expect(
    page.getByRole('heading', { name: 'Design the spread before you sleeve it' }),
  ).toBeVisible();

  // The starter spread is real content, not a picture of one.
  await expect(page.getByRole('img', { name: /Bulbasaur, base1/ })).toBeVisible();
  await expect(page.getByText('Art pocket')).toBeVisible();
  await expect(page.getByText('14 × 19 cm').first()).toBeVisible();

  await page.getByRole('button', { name: 'Next spread' }).click();
  await expect(page.getByText(/Spread 3 of/)).toBeVisible({ timeout: 10_000 });

  // AT-9: nothing on the landing page may pull the card catalog.
  expect(indexRequests, 'landing must not fetch the card index').toEqual([]);

  await page.getByRole('button', { name: 'Edit a copy of this page' }).click();
  await expect(page).toHaveURL(/\/studio\/michi-playground/, { timeout: 15_000 });
  await expect(page.getByRole('button', { name: 'Print & export' })).toBeVisible();
});

test('the empty-page route is a separate destination from the copy', async ({ page }) => {
  await page.goto('/?mode=2d');
  await page.getByRole('button', { name: 'or start with an empty page' }).click();
  await expect(page).toHaveURL(/\/studio\/michi-playground/, { timeout: 15_000 });
  // An untouched playground has no cards in it.
  await expect(page.getByRole('button', { name: /— empty$/ })).toHaveCount(9, {
    timeout: 10_000,
  });
});

test('anonymous shelf visits redirect to the landing page', async ({ page }) => {
  await page.goto('/shelf');
  await expect(page).toHaveURL('/', { timeout: 10_000 });
  await expect(
    page.getByRole('heading', { name: 'Design the spread before you sleeve it' }),
  ).toBeVisible();
});
