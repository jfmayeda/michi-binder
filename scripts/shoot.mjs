// Screenshot helper for the handoff docs. Not part of the app.
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const OUT = 'docs/screenshots';
mkdirSync(OUT, { recursive: true });
const exec = process.env.PLAYWRIGHT_CHROMIUM_PATH;
const browser = await chromium.launch(exec ? { executablePath: exec } : {});

const shots = JSON.parse(process.argv[2]);
for (const shot of shots) {
  const ctx = await browser.newContext({
    viewport: shot.viewport ?? { width: 1440, height: 980 },
    deviceScaleFactor: 2,
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  await page.goto(`http://localhost:3000${shot.path}`, { waitUntil: 'networkidle' });
  if (shot.script) await page.evaluate(shot.script);
  if (shot.wait) await page.waitForTimeout(shot.wait);
  await page.screenshot({ path: `${OUT}/${shot.name}.png`, fullPage: shot.full ?? false });
  console.log(`${shot.name}: ok${errors.length ? ` | console: ${errors.join(' ;; ')}` : ''}`);
  await ctx.close();
}
await browser.close();
