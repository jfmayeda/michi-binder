// Proves the art PDF carries real artwork at the right trim size. Not part of the app.
import { chromium } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { PDFDocument } from 'pdf-lib';

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 }, acceptDownloads: true });
const page = await ctx.newPage();

await page.goto('http://localhost:3000/?mode=2d', { waitUntil: 'networkidle' });
await page.getByRole('button', { name: 'Edit a copy of this page' }).click();
await page.waitForURL(/\/studio\//);
await page.waitForTimeout(2000);
await page.getByRole('tab', { name: 'My art' }).click();
await page.waitForTimeout(600);
await page.getByRole('button', { name: /^Use Fern/ }).click();
await page.getByRole('button', { name: /^Merged pocket, 2 by 2/ }).click();
await page.waitForTimeout(800);
await page.getByRole('button', { name: 'Place it' }).click();
await page.waitForTimeout(700);
await page.getByRole('button', { name: 'Print & export' }).click();
const [dl] = await Promise.all([
  page.waitForEvent('download', { timeout: 40000 }),
  page.getByRole('button', { name: 'Download art PDF' }).click(),
]);
const path = await dl.path();
const bytes = readFileSync(path);
const pdf = await PDFDocument.load(bytes);
const CM_PER_PT = 2.54 / 72;
console.log(`file: ${dl.suggestedFilename()}  ${(bytes.length / 1024).toFixed(0)} KB`);
console.log(`pages: ${pdf.getPageCount()}`);
for (let i = 0; i < pdf.getPageCount(); i += 1) {
  const p = pdf.getPage(i);
  const t = p.getTrimBox();
  const b = p.getBleedBox();
  console.log(
    `  page ${i}: trim ${(t.width * CM_PER_PT).toFixed(2)} x ${(t.height * CM_PER_PT).toFixed(2)} cm` +
      `  bleed ${(b.width * CM_PER_PT).toFixed(2)} x ${(b.height * CM_PER_PT).toFixed(2)} cm`,
  );
}
const raw = bytes.toString('latin1');
console.log(`embedded images (XObject /Image): ${(raw.match(/\/Subtype\s*\/Image/g) || []).length}`);
await browser.close();
