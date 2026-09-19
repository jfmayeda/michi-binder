import { expect, test, type Page } from '@playwright/test';

/**
 * The P0 journey, end to end: land, take a copy, search, place, replace,
 * select a block, merge, undo, reach print, and survive a reload.
 */

async function openCopy(page: Page) {
  await page.goto('/?mode=2d');
  await page.getByRole('button', { name: 'Edit a copy of this page' }).click();
  await expect(page).toHaveURL(/\/studio\//, { timeout: 15_000 });
  await expect(page.getByRole('button', { name: 'Print & export' })).toBeVisible();
}

/** Shift opts out of card dragging, so a block can be selected from any pocket. */
async function shiftSelect(page: Page, fromLabel: RegExp, toLabel: RegExp) {
  const from = await page.getByRole('button', { name: fromLabel }).boundingBox();
  const to = await page.getByRole('button', { name: toLabel }).boundingBox();
  if (!from || !to) throw new Error('pockets not found');
  await page.keyboard.down('Shift');
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 8 });
  await page.mouse.up();
  await page.keyboard.up('Shift');
}

test('place a card, merge a block, and undo both', async ({ page }) => {
  await openCopy(page);

  // Search, then place by clicking. Click-to-place is the reliable path.
  await page.getByPlaceholder('Pikachu, Ken Sugimori…').fill('Blastoise');
  const hit = page.getByRole('button', { name: /^Blastoise, base1 2/ }).first();
  await expect(hit).toBeVisible({ timeout: 25_000 });
  await hit.click();

  // The prompt says what the app is waiting for.
  await expect(page.getByText(/Click a pocket to put/)).toBeVisible();

  const target = page.getByRole('button', { name: /^Pocket row 3, column 3 — empty/ });
  await target.click();
  await expect(
    page.getByRole('button', { name: /^Pocket row 3, column 3 — Blastoise/ }),
  ).toBeVisible({ timeout: 10_000 });

  // Merging: the inspector offers it only once the selection is valid.
  await shiftSelect(page, /^Pocket row 3, column 1/, /^Pocket row 3, column 2/);
  const merge = page.getByRole('button', { name: 'Merge into one pocket' });
  await expect(merge).toBeEnabled({ timeout: 10_000 });
  await merge.click();

  const merged = page.getByRole('button', { name: /^Merged pocket, 2 by 1/ });
  await expect(merged).toBeVisible({ timeout: 10_000 });
  // The assembly note comes from the split algorithm, not from the UI.
  await expect(page.getByText(/split into|slide-through|single insert/i).first()).toBeVisible();

  // Undo takes the merge back.
  await page.getByRole('button', { name: /^Undo/ }).click();
  await expect(merged).toHaveCount(0, { timeout: 10_000 });

  // Undo again takes the placement back.
  await page.getByRole('button', { name: /^Undo/ }).click();
  await expect(
    page.getByRole('button', { name: /^Pocket row 3, column 3 — empty/ }),
  ).toBeVisible({ timeout: 10_000 });
});

test('replacing an occupied pocket is undoable', async ({ page }) => {
  await openCopy(page);

  await page.getByPlaceholder('Pikachu, Ken Sugimori…').fill('Blastoise');
  const hit = page.getByRole('button', { name: /^Blastoise, base1 2/ }).first();
  await expect(hit).toBeVisible({ timeout: 25_000 });
  await hit.click();

  // Row 1 column 3 already holds Pikachu in the starter copy.
  const occupied = page.getByRole('button', { name: /^Pocket row 1, column 3 — Pikachu/ });
  await expect(occupied).toBeVisible({ timeout: 10_000 });
  await occupied.click();

  await expect(
    page.getByRole('button', { name: /^Pocket row 1, column 3 — Blastoise/ }),
  ).toBeVisible({ timeout: 10_000 });

  await page.getByRole('button', { name: /^Undo/ }).click();
  await expect(
    page.getByRole('button', { name: /^Pocket row 1, column 3 — Pikachu/ }),
  ).toBeVisible({ timeout: 10_000 });
});

test('an invalid selection is explained in plain words', async ({ page }) => {
  await openCopy(page);
  // A single pocket cannot merge, and the inspector says so rather than
  // offering a button that would fail.
  await page.getByRole('button', { name: /^Pocket row 3, column 1/ }).click();
  await expect(page.getByRole('button', { name: 'Merge into one pocket' })).toHaveCount(0);
  await expect(page.getByText('One pocket picked. Its options are on the right.')).toBeVisible();
});

test('print and export is reachable and closes on Escape', async ({ page }) => {
  await openCopy(page);
  await page.getByRole('button', { name: 'Print & export' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText('Check your printer first')).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Download calibration sheet' })).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Download pull list' })).toBeVisible();
  // Print accuracy is labelled honestly: no printer has been measured.
  await expect(dialog.getByText(/no printer has been ruler-checked/i)).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
});

test('the pull list downloads for the page on screen', async ({ page }) => {
  await openCopy(page);
  await page.getByRole('button', { name: 'Print & export' }).click();
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 25_000 }),
    page.getByRole('button', { name: 'Download pull list' }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/michi-pull-list\.pdf/);
});

test('work survives a reload', async ({ page }) => {
  await openCopy(page);
  await shiftSelect(page, /^Pocket row 3, column 2/, /^Pocket row 3, column 3/);
  await page.getByRole('button', { name: 'Merge into one pocket' }).click();
  await expect(page.getByRole('button', { name: /^Merged pocket, 2 by 1/ })).toBeVisible({
    timeout: 10_000,
  });
  await expect(page.getByText('Saved on this device')).toBeVisible({ timeout: 10_000 });

  await page.reload();
  await expect(page.getByRole('button', { name: /^Merged pocket, 2 by 1/ })).toBeVisible({
    timeout: 15_000,
  });
});

test('2D is a first-class mode, not a hidden fallback', async ({ page }) => {
  await page.goto('/dev/flip?lowperf=1');
  await expect(page.getByRole('button', { name: '2D mode' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.getByText(/2D mode — the same spread/)).toBeVisible();
  await page.getByRole('button', { name: 'Next spread' }).click();
  await expect(page.getByText(/Spread 2 of/)).toBeVisible({ timeout: 8_000 });
});
