import { expect, test } from '@playwright/test';

test('the card box loads on its own and filters down to one card', async ({ page }) => {
  await page.goto('/dev/search');

  // Results appear without anything being focused first.
  await expect(page.getByRole('button', { name: /, base1 / }).first()).toBeVisible({
    timeout: 25_000,
  });

  await page.getByPlaceholder('Pikachu, Ken Sugimori…').fill('Pikachu');
  await page.getByRole('button', { name: /More filters/ }).click();
  await page.getByLabel('Set').selectOption('base1');

  await expect(page.getByRole('button', { name: /^Pikachu, base1 58/ })).toBeVisible({
    timeout: 15_000,
  });
  // The filter count is reported, so an empty result is never a mystery.
  await expect(page.getByRole('button', { name: /More filters/ })).toContainText('1');
});

test('an impossible search explains itself and offers a way out', async ({ page }) => {
  await page.goto('/dev/search');
  await expect(page.getByRole('button', { name: /, base1 / }).first()).toBeVisible({
    timeout: 25_000,
  });
  await page.getByPlaceholder('Pikachu, Ken Sugimori…').fill('zzzzzznotacard');
  await expect(page.getByText(/Nothing matches that yet/)).toBeVisible({ timeout: 10_000 });
  await page.getByRole('button', { name: 'Clear search and filters' }).click();
  await expect(page.getByRole('button', { name: /, base1 / }).first()).toBeVisible();
});
