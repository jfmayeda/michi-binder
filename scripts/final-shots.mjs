// Captures the handoff screenshot set. Not part of the app.
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
const OUT = 'docs/screenshots';
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const problems = [];

async function run(name, width, height, fn, full = false) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('console', (m) => {
    const t = m.text();
    if (m.type() === 'error' && !t.includes('ERR_TUNNEL_CONNECTION_FAILED')) errs.push(t);
  });
  page.on('pageerror', (e) => errs.push(`pageerror: ${e.message}`));
  await fn(page);
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: full });
  if (errs.length) problems.push(`${name}: ${[...new Set(errs)].join(' ;; ')}`);
  console.log(`${name}: ${errs.length ? 'CONSOLE ERRORS' : 'clean'}`);
  await ctx.close();
}

const openCopy = async (page) => {
  await page.goto('http://localhost:3000/?mode=2d', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Edit a copy of this page' }).click();
  await page.waitForURL(/\/studio\//, { timeout: 15000 });
  await page.waitForTimeout(2200);
};
const shiftSelect = async (page, a, b) => {
  const from = await page.getByRole('button', { name: a }).boundingBox();
  const to = await page.getByRole('button', { name: b }).boundingBox();
  await page.keyboard.down('Shift');
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 8 });
  await page.mouse.up();
  await page.keyboard.up('Shift');
};

await run('01-landing', 1440, 1000, async (page) => {
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);
});

await run('02-editor-default', 1440, 950, openCopy);

await run('03-search-and-selected-card', 1440, 950, async (page) => {
  await openCopy(page);
  await page.getByPlaceholder('Pikachu, Ken Sugimori…').fill('Blastoise');
  await page.getByRole('button', { name: /^Blastoise, base1 2/ }).first().click();
  await page.waitForTimeout(600);
});

await run('04-valid-placement-target', 1440, 950, async (page) => {
  await openCopy(page);
  await page.getByPlaceholder('Pikachu, Ken Sugimori…').fill('Blastoise');
  await page.getByRole('button', { name: /^Blastoise, base1 2/ }).first().click();
  await page.waitForTimeout(400);
  await page.getByRole('button', { name: /^Pocket row 3, column 3 — empty/ }).hover();
  await page.waitForTimeout(400);
});

await run('05-merged-slot', 1440, 950, async (page) => {
  await openCopy(page);
  await shiftSelect(page, /^Pocket row 3, column 1/, /^Pocket row 3, column 2/);
  await page.getByRole('button', { name: 'Merge into one pocket' }).click();
  await page.waitForTimeout(600);
  await page.getByRole('button', { name: /^Merged pocket, 2 by 1/ }).click();
  await page.waitForTimeout(400);
});

await run('06-art-and-crop', 1440, 950, async (page) => {
  await openCopy(page);
  await page.getByRole('tab', { name: 'My art' }).click();
  await page.waitForTimeout(700);
  await page.getByRole('button', { name: /^Use Fern/ }).click();
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: /^Merged pocket, 2 by 2/ }).click();
  await page.waitForTimeout(900);
});

await run('07-print-and-export', 1440, 950, async (page) => {
  await openCopy(page);
  await page.getByRole('tab', { name: 'My art' }).click();
  await page.waitForTimeout(600);
  await page.getByRole('button', { name: /^Use Fern/ }).click();
  await page.getByRole('button', { name: /^Merged pocket, 2 by 2/ }).click();
  await page.waitForTimeout(800);
  await page.getByRole('button', { name: 'Place it' }).click();
  await page.waitForTimeout(700);
  await page.getByRole('button', { name: 'Print & export' }).click();
  await page.waitForTimeout(700);
});

await run('08-2d-fallback', 1440, 950, async (page) => {
  await page.goto('http://localhost:3000/dev/flip?lowperf=1', { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);
});

await run('09-tablet-editor', 1024, 768, openCopy);

await run('10-styleguide', 1440, 1200, async (page) => {
  await page.goto('http://localhost:3000/dev/styleguide', { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
}, true);

await run('11-mobile-landing', 390, 844, async (page) => {
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);
});

console.log(problems.length ? `\nPROBLEMS:\n${problems.join('\n')}` : '\nno console errors in any capture');
await browser.close();
