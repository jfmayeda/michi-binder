import { expect, test } from '@playwright/test';

test('search panel finds Pikachu in Base Set', async ({ page }) => {
  await page.goto('/dev/search');
  const box = page.getByPlaceholder('Pikachu, Ken Sugimori…');
  await box.focus();
  await expect(page.locator('select').first().locator('option[value="base1"]')).toBeAttached({
    timeout: 20_000,
  });
  await box.fill('Pikachu');
  await page.getByLabel('Set').selectOption('base1');
  await expect(page.getByRole('button', { name: /Pikachu/i }).first()).toBeVisible({
    timeout: 15_000,
  });
  await expect(page.getByText('base1 · 58').first()).toBeVisible();
});
