// Checks for unnamed controls, tiny targets and missing alt text. Not part of the app.
import { chromium } from '@playwright/test';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });

const audit = async (url, prep) => {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 } });
  const page = await ctx.newPage();
  await page.goto(`http://localhost:3000${url}`, { waitUntil: 'networkidle' });
  if (prep) await prep(page);
  await page.waitForTimeout(600);
  const report = await page.evaluate(() => {
    const name = (el) =>
      el.getAttribute('aria-label') ||
      el.getAttribute('title') ||
      (el.getAttribute('aria-labelledby')
        ? document.getElementById(el.getAttribute('aria-labelledby'))?.textContent
        : '') ||
      el.textContent?.trim() ||
      '';
    const controls = [...document.querySelectorAll('button,a[href],input,select,[role="button"],[role="tab"],[role="option"]')];
    const unnamed = controls.filter((el) => !name(el) && el.offsetParent !== null).map((el) => el.outerHTML.slice(0, 90));
    const small = controls
      .filter((el) => {
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && (r.height < 24 || r.width < 24);
      })
      .map((el) => `${name(el).slice(0, 30)} ${Math.round(el.getBoundingClientRect().width)}x${Math.round(el.getBoundingClientRect().height)}`);
    const imgsNoAlt = [...document.querySelectorAll('img')].filter((i) => i.getAttribute('alt') === null).length;
    const h1 = document.querySelectorAll('h1').length;
    return { unnamed, small, imgsNoAlt, h1 };
  });
  console.log(`\n${url}`);
  console.log(`  h1 count: ${report.h1} | img without alt attribute: ${report.imgsNoAlt}`);
  console.log(`  unnamed controls: ${report.unnamed.length}${report.unnamed.length ? `\n    ${report.unnamed.join('\n    ')}` : ''}`);
  console.log(`  targets under 24px: ${report.small.length}${report.small.length ? `\n    ${[...new Set(report.small)].join('\n    ')}` : ''}`);
  await ctx.close();
};

await audit('/');
await audit('/dev/styleguide');
await audit('/', async (page) => {
  await page.getByRole('button', { name: 'Edit a copy of this page' }).click();
  await page.waitForURL(/\/studio\//);
  await page.waitForTimeout(2000);
});
await browser.close();
