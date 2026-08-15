import { expect, test } from '@playwright/test';

test('design happy path: search, place, merge, share', async ({ page }) => {
  await page.goto('/playground');
  await expect(page).toHaveURL(/\/studio\/michi-playground/, { timeout: 15_000 });

  const mergeBtn = page.getByRole('button', { name: 'Merge pockets' });
  await page.getByText('2×1', { exact: true }).first().click();
  await page.getByText('2×2', { exact: true }).first().click({ modifiers: ['Shift'] });
  await expect(mergeBtn).toBeEnabled({ timeout: 5_000 });
  await mergeBtn.click();
  await expect(page.getByText(/split into|slide-through/i).first()).toBeVisible({ timeout: 5_000 });

  const search = page.getByPlaceholder('Pikachu, Ken Sugimori…');
  await search.focus();
  await search.fill('Pikachu');
  await expect(page.getByRole('button', { name: /Pikachu/i }).first()).toBeVisible({
    timeout: 20_000,
  });
  await page.getByRole('button', { name: /Pikachu/i }).first().click();
  await page.getByText('1×1', { exact: true }).first().click();

  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 20_000 }),
    page.getByRole('button', { name: 'Share image' }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/michi-share/);
});

test('2D fallback is a first-class mode', async ({ page }) => {
  await page.goto('/dev/flip?lowperf=1');
  await expect(page.getByText(/2D mode/i)).toBeVisible();
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page.getByText(/Spread 2 of/)).toBeVisible({ timeout: 8_000 });
});
