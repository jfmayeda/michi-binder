import { expect, test } from '@playwright/test';

test('AT-9: landing does not request cards-index.json', async ({ page }) => {
  const indexRequests: string[] = [];
  page.on('request', (req) => {
    if (req.url().includes('/data/cards-index.json')) indexRequests.push(req.url());
  });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Michi Binder Studio' })).toBeVisible();
  await page.waitForTimeout(500);
  expect(indexRequests, 'landing must not fetch the card index').toEqual([]);
});
