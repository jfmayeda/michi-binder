// Drives the P0 journey end to end and captures each step. Not part of the app.
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const OUT = 'docs/screenshots';
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 950 },
  deviceScaleFactor: 2,
});
const page = await ctx.newPage();
const problems = [];
page.on('console', (m) => {
  const t = m.text();
  if (m.type() === 'error' && !t.includes('ERR_TUNNEL_CONNECTION_FAILED')) problems.push(t);
});
page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));

const shot = (name) => page.screenshot({ path: `${OUT}/${name}.png` });
const step = async (label, fn) => {
  try {
    await fn();
    console.log(`  ok  ${label}`);
  } catch (err) {
    console.log(`FAIL  ${label}: ${String(err).split('\n')[0]}`);
  }
};

await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
await step('landing shows the starter spread', async () => {
  await page.getByRole('button', { name: 'Edit a copy of this page' }).waitFor();
});

await step('clone opens the editor', async () => {
  await page.getByRole('button', { name: 'Edit a copy of this page' }).click();
  await page.waitForURL(/\/studio\//, { timeout: 15000 });
  await page.waitForTimeout(1800);
});

await step('search finds a card', async () => {
  await page.getByPlaceholder('Pikachu, Ken Sugimori…').fill('Blastoise');
  await page.getByRole('button', { name: /^Blastoise, base1/ }).first().waitFor({ timeout: 20000 });
});
await shot('03-search-selected-pre');

await step('selecting a card arms placement', async () => {
  await page.getByRole('button', { name: /^Blastoise, base1/ }).first().click();
  await page.getByText(/Click a pocket to put/).waitFor({ timeout: 5000 });
});
await shot('04-valid-target');

await step('clicking an empty pocket places it', async () => {
  await page.getByRole('button', { name: /^Pocket row 3, column 3 — empty/ }).click();
  await page.waitForTimeout(600);
  await page.getByRole('button', { name: /^Pocket row 3, column 3 — (?!empty)/ }).waitFor({ timeout: 5000 });
});
await shot('03-search-and-placement');

await step('drag-select two pockets and merge', async () => {
  const a = page.getByRole('button', { name: /^Pocket row 3, column 1/ });
  const b = page.getByRole('button', { name: /^Pocket row 3, column 2/ });
  const boxA = await a.boundingBox();
  const boxB = await b.boundingBox();
  await page.keyboard.down('Shift');
  await page.mouse.move(boxA.x + boxA.width / 2, boxA.y + boxA.height / 2);
  await page.mouse.down();
  await page.mouse.move(boxB.x + boxB.width / 2, boxB.y + boxB.height / 2, { steps: 8 });
  await page.mouse.up();
  await page.keyboard.up('Shift');
  await page.getByRole('button', { name: 'Merge into one pocket' }).waitFor({ timeout: 5000 });
  await page.getByRole('button', { name: 'Merge into one pocket' }).click();
  await page.waitForTimeout(600);
  await page.getByRole('button', { name: /^Merged pocket, 2 by 1/ }).waitFor({ timeout: 5000 });
});
await shot('05-merged-slot');

await step('undo reverses the merge', async () => {
  await page.getByRole('button', { name: /^Undo/ }).click();
  await page.waitForTimeout(700);
  // The starter page already has one 2x2 art pocket, so undo should leave
  // exactly that one and remove the 2x1 just made.
  const merged = await page.getByRole('button', { name: /^Merged pocket, 2 by 1/ }).count();
  if (merged !== 0) throw new Error(`the new merge is still there (${merged})`);
});

await step('redo the merge for the rest of the walk', async () => {
  const a = page.getByRole('button', { name: /^Pocket row 3, column 1/ });
  const b = page.getByRole('button', { name: /^Pocket row 3, column 2/ });
  const boxA = await a.boundingBox();
  const boxB = await b.boundingBox();
  await page.keyboard.down('Shift');
  await page.mouse.move(boxA.x + boxA.width / 2, boxA.y + boxA.height / 2);
  await page.mouse.down();
  await page.mouse.move(boxB.x + boxB.width / 2, boxB.y + boxB.height / 2, { steps: 8 });
  await page.mouse.up();
  await page.keyboard.up('Shift');
  await page.getByRole('button', { name: 'Merge into one pocket' }).click();
  await page.waitForTimeout(500);
});

await step('art tab is reachable', async () => {
  await page.getByRole('tab', { name: 'My art' }).click();
  await page.getByText('Add a picture').first().waitFor({ timeout: 5000 });
});
await shot('06-art-box');

await step('print and export opens', async () => {
  await page.getByRole('button', { name: 'Print & export' }).click();
  await page.getByRole('dialog').waitFor({ timeout: 5000 });
  await page.waitForTimeout(400);
});
await shot('07-print-export');

await step('escape closes the dialog', async () => {
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  if (await page.getByRole('dialog').count()) throw new Error('dialog still open');
});

await step('work survives a reload', async () => {
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await page.getByRole('button', { name: /^Merged pocket, 2 by 1/ }).waitFor({ timeout: 8000 });
  await page.getByRole('button', { name: /^Pocket row 3, column 3 — (?!empty)/ }).waitFor({ timeout: 8000 });
});

console.log(problems.length ? `console problems: ${[...new Set(problems)].join(' ;; ')}` : 'no console problems');
await browser.close();
