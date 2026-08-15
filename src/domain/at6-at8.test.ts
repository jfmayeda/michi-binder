import { describe, expect, it } from 'vitest';
import { addMerge, createBinder } from './slots';
import {
  annotationFor,
  cmToPt,
  cmToPx,
  extractPieceRaster,
  makeTestComposition,
  printPlan,
} from './print';
import type { Binder, Merge } from './types';

function withMerge(
  layoutId: Binder['layoutId'],
  pageMode: Binder['pageMode'],
  pageCount: number,
  spec: { position: number; row: number; col: number; rowSpan: number; colSpan: number; spansGutter?: boolean },
): { binder: Binder; merge: Merge } {
  let binder = createBinder({ id: layoutId, layoutId, pageMode, pageCount });
  const page = binder.pages.find((p) => p.position === spec.position)!;
  binder = addMerge(
    binder,
    {
      pageId: page.id,
      row: spec.row,
      col: spec.col,
      rowSpan: spec.rowSpan,
      colSpan: spec.colSpan,
      spansGutter: spec.spansGutter,
    },
    'm',
  );
  return { binder, merge: binder.merges[0] };
}

describe('AT-6 piece computation (full table)', () => {
  const rows: {
    name: string;
    layoutId: Binder['layoutId'];
    pageMode: Binder['pageMode'];
    pageCount: number;
    spec: { position: number; row: number; col: number; rowSpan: number; colSpan: number; spansGutter?: boolean };
    mandatory: number;
    variants: number;
    annotation: string | RegExp;
  }[] = [
    {
      name: '3x3 1 row cols 0–1',
      layoutId: '3x3',
      pageMode: 'single',
      pageCount: 1,
      spec: { position: 1, row: 0, col: 0, rowSpan: 1, colSpan: 2 },
      mandatory: 1,
      variants: 0,
      annotation: 'slide-through',
    },
    {
      name: '3x3 1 row cols 1–2',
      layoutId: '3x3',
      pageMode: 'single',
      pageCount: 1,
      spec: { position: 1, row: 0, col: 1, rowSpan: 1, colSpan: 2 },
      mandatory: 2,
      variants: 1,
      annotation: /^split into 2 pieces/,
    },
    {
      name: '3x3 1 row cols 0–2',
      layoutId: '3x3',
      pageMode: 'single',
      pageCount: 1,
      spec: { position: 1, row: 0, col: 0, rowSpan: 1, colSpan: 3 },
      mandatory: 2,
      variants: 1,
      annotation: /^split into 2 pieces/,
    },
    {
      name: '3x3 2×2 at (0,0)',
      layoutId: '3x3',
      pageMode: 'single',
      pageCount: 1,
      spec: { position: 1, row: 0, col: 0, rowSpan: 2, colSpan: 2 },
      mandatory: 2,
      variants: 0,
      annotation: 'split into 2 pieces',
    },
    {
      name: '3x3 full page 3×3',
      layoutId: '3x3',
      pageMode: 'single',
      pageCount: 1,
      spec: { position: 1, row: 0, col: 0, rowSpan: 3, colSpan: 3 },
      mandatory: 6,
      variants: 3,
      annotation: /^split into 6 pieces/,
    },
    {
      name: '2x2 1 row cols 0–1',
      layoutId: '2x2',
      pageMode: 'single',
      pageCount: 1,
      spec: { position: 1, row: 0, col: 0, rowSpan: 1, colSpan: 2 },
      mandatory: 2,
      variants: 1,
      annotation: /^split into 2 pieces/,
    },
    {
      name: '2x2 2×2 full page',
      layoutId: '2x2',
      pageMode: 'single',
      pageCount: 1,
      spec: { position: 1, row: 0, col: 0, rowSpan: 2, colSpan: 2 },
      mandatory: 4,
      variants: 2,
      annotation: /^split into 4 pieces/,
    },
    {
      name: '4x4 1 row cols 0–3',
      layoutId: '4x4',
      pageMode: 'single',
      pageCount: 1,
      spec: { position: 1, row: 0, col: 0, rowSpan: 1, colSpan: 4 },
      mandatory: 2,
      variants: 1,
      annotation: /^split into 2 pieces/,
    },
    {
      name: '4x4 1 row cols 1–2',
      layoutId: '4x4',
      pageMode: 'single',
      pageCount: 1,
      spec: { position: 1, row: 0, col: 1, rowSpan: 1, colSpan: 2 },
      mandatory: 2,
      variants: 1,
      annotation: /^split into 2 pieces/,
    },
    {
      name: '4x4 1 row cols 2–3',
      layoutId: '4x4',
      pageMode: 'single',
      pageCount: 1,
      spec: { position: 1, row: 0, col: 2, rowSpan: 1, colSpan: 2 },
      mandatory: 1,
      variants: 0,
      annotation: 'slide-through',
    },
    {
      name: '4x3 null map 1 row cols 0–2',
      layoutId: '4x3',
      pageMode: 'single',
      pageCount: 1,
      spec: { position: 1, row: 0, col: 0, rowSpan: 1, colSpan: 3 },
      mandatory: 3,
      variants: 0,
      annotation: 'split into 3 pieces',
    },
    {
      name: '3x3 x-page left col 2 + right col 0',
      layoutId: '3x3',
      pageMode: 'double',
      pageCount: 3,
      spec: { position: 2, row: 0, col: 2, rowSpan: 1, colSpan: 2, spansGutter: true },
      mandatory: 2,
      variants: 0,
      annotation: 'split into 2 pieces',
    },
    {
      name: '3x3 x-page left cols 1–2 + right cols 0–1',
      layoutId: '3x3',
      pageMode: 'double',
      pageCount: 3,
      spec: { position: 2, row: 0, col: 1, rowSpan: 1, colSpan: 4, spansGutter: true },
      mandatory: 3,
      variants: 1,
      annotation: /^split into 3 pieces/,
    },
  ];

  for (const row of rows) {
    it(row.name, () => {
      const { binder, merge } = withMerge(row.layoutId, row.pageMode, row.pageCount, row.spec);
      const plan = printPlan(binder, merge);
      expect(plan.mandatory).toHaveLength(row.mandatory);
      expect(plan.wholeStripVariants).toHaveLength(row.variants);
      expect(annotationFor(binder, merge)).toMatch(row.annotation);
      if (row.layoutId === '4x3') {
        expect(plan.safeSplitNote).toMatch(/split per pocket/);
      }
    });
  }

  it('2x2 vs 3x3 cols 0–1 diverge via the same map rule', () => {
    const a = withMerge('2x2', 'single', 1, { position: 1, row: 0, col: 0, rowSpan: 1, colSpan: 2 });
    const b = withMerge('3x3', 'single', 1, { position: 1, row: 0, col: 0, rowSpan: 1, colSpan: 2 });
    expect(printPlan(a.binder, a.merge).mandatory).toHaveLength(2);
    expect(printPlan(b.binder, b.merge).mandatory).toHaveLength(1);
  });
});

describe('AT-7 print dimensions', () => {
  const table = [
    { cm: 7, px: 827, pt: 198.43 },
    { cm: 9.5, px: 1122, pt: 269.29 },
    { cm: 14, px: 1654, pt: 396.85 },
    { cm: 19, px: 2244, pt: 538.58 },
    { cm: 21, px: 2480, pt: 595.28 },
    { cm: 28.5, px: 3366, pt: 807.87 },
  ];

  for (const row of table) {
    it(`${row.cm} cm → ${row.px} px / ${row.pt} pt`, () => {
      expect(cmToPx(row.cm)).toBe(row.px);
      expect(Math.abs(cmToPt(row.cm) - row.pt)).toBeLessThan(0.01);
    });
  }

  it('cross-page piece trim matches cm formula', () => {
    const { binder, merge } = withMerge('3x3', 'double', 3, {
      position: 2,
      row: 0,
      col: 2,
      rowSpan: 1,
      colSpan: 2,
      spansGutter: true,
    });
    const plan = printPlan(binder, merge);
    expect(plan.physical[0].widthPx).toBe(cmToPx(7));
    expect(plan.physical[0].heightPx).toBe(cmToPx(9.5));
    expect(Math.abs(plan.physical[0].widthPt - cmToPt(7))).toBeLessThan(0.01);
  });
});

describe('AT-8 seam continuity', () => {
  it('adjacent piece edges match the uncut composition, including bleed', () => {
    const { binder, merge } = withMerge('2x2', 'single', 1, {
      position: 1,
      row: 0,
      col: 0,
      rowSpan: 1,
      colSpan: 2,
    });
    const plan = printPlan(binder, merge);
    const composition = makeTestComposition(plan.compositionPx.width, plan.compositionPx.height);
    const left = extractPieceRaster(composition, plan.physical[0], { bleed: true });
    const right = extractPieceRaster(composition, plan.physical[1], { bleed: true });
    const bleed = Math.round((0.3 * 300) / 2.54);
    const seamX = plan.physical[0].widthPx;
    for (let y = 0; y < plan.physical[0].heightPx; y += 17) {
      const leftEdge = (y + bleed) * left.width + (bleed + seamX - 1);
      const rightEdge = (y + bleed) * right.width + bleed;
      const li = leftEdge * 4;
      const ri = rightEdge * 4;
      const compY = y;
      const compLeft = (compY * composition.width + (seamX - 1)) * 4;
      const compRight = (compY * composition.width + seamX) * 4;
      expect(left.data.slice(li, li + 3)).toEqual(composition.data.slice(compLeft, compLeft + 3));
      expect(right.data.slice(ri, ri + 3)).toEqual(composition.data.slice(compRight, compRight + 3));
    }
  });
});
