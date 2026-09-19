// Captures the remaining handoff screenshots. Not part of the app.
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
const OUT = 'docs/screenshots';
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });

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
  console.log(`${name}: ${errs.length ? `CONSOLE ${[...new Set(errs)].join(' ;; ')}` : 'clean'}`);
  await ctx.close();
}

const seed = async (page) => {
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Edit a copy of this page' }).click();
  await page.waitForURL(/\/studio\//, { timeout: 15000 });
  await page.waitForTimeout(2000);
};

await run('08-2d-fallback', 1440, 950, async (page) => {
  await page.goto('http://localhost:3000/dev/flip?lowperf=1', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
});

await run('09-tablet-editor', 1024, 1300, async (page) => {
  await seed(page);
  await page.getByRole('button', { name: /^Pocket row 3, column 3/ }).click();
  await page.waitForTimeout(500);
});

await run('02-editor', 1440, 950, async (page) => {
  await seed(page);
  await page.getByRole('button', { name: /^Merged pocket, 2 by 2/ }).click();
  await page.waitForTimeout(500);
});

await run('11-mobile-view', 390, 900, async (page) => {
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
});

await run('10-styleguide', 1440, 1200, async (page) => {
  await page.goto('http://localhost:3000/dev/styleguide', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);
}, true);

await browser.close();
