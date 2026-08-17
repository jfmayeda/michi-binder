import { describe, expect, it } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { PDFDocument } from 'pdf-lib';
import { addMerge, createBinder, placeOnMerge, placementFromUpload } from '@/domain/slots';
import { cmToPt } from '@/domain/print';
import { assertArtExport, buildArtPdf, dpiWarning } from './artPdf';
import type { Placement } from '@/domain/types';

function artBinder() {
  let binder = createBinder({ id: 'e', layoutId: '2x2', pageMode: 'single', pageCount: 1 });
  const pageId = binder.pages[0].id;
  binder = addMerge(binder, { pageId, row: 0, col: 0, rowSpan: 2, colSpan: 2 }, 'm');
  const placement = {
    ...placementFromUpload('pl', 'asset-1'),
    pageId,
    mergeId: 'm',
  };
  binder = placeOnMerge(binder, placement);
  return { binder, merge: binder.merges[0], placement };
}

describe('T4.4 art export', () => {
  it('refuses to print card images', () => {
    const card: Placement = {
      id: 'c',
      pageId: 'p',
      mergeId: null,
      row: 0,
      col: 0,
      kind: 'card',
      cardId: 'base1-4',
      assetKind: null,
      uploadAssetId: null,
      packItemId: null,
      transform: {},
      ownership: 'owned',
    };
    expect(() => assertArtExport(card)).toThrow('card-images-forbidden');
  });

  it('2×2 merge PDF trim is 14 × 19 cm', async () => {
    const { binder, merge, placement } = artBinder();
    const { bytes } = await buildArtPdf(binder, merge, placement);
    const pdf = await PDFDocument.load(bytes);
    const trim = pdf.getPage(0).getTrimBox();
    expect(Math.abs(trim.width - cmToPt(14))).toBeLessThan(0.01);
    expect(Math.abs(trim.height - cmToPt(19))).toBeLessThan(0.01);
    try {
      mkdirSync('/opt/cursor/artifacts', { recursive: true });
      writeFileSync('/opt/cursor/artifacts/michi_export_2x2.pdf', bytes);
    } catch {
      /* optional */
    }
  });

  it('whole-strip variant changes page count', async () => {
    const { binder, merge, placement } = artBinder();
    const split = await buildArtPdf(binder, merge, placement, { useWholeStrips: false });
    const whole = await buildArtPdf(binder, merge, placement, { useWholeStrips: true });
    expect(whole.pageCount).not.toBe(split.pageCount);
    expect(split.plan.physical).toHaveLength(4);
    expect(whole.plan.wholeStripVariants).toHaveLength(2);
  });

  it('warns when source DPI is below 300', () => {
    expect(dpiWarning(100, 7)).toMatch(/soft/);
    expect(dpiWarning(2000, 7)).toBeNull();
  });
});
