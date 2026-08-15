import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { LAYOUTS, type LayoutId } from './layouts';
import { deserializeBinder, serializeBinder } from './serialize';
import {
  addMerge,
  createBinder,
  placeOnMerge,
  switchPageMode,
  unmerge,
  validateMerge,
} from './slots';
import type { Placement, Transform } from './types';

const LAYOUT_IDS = Object.keys(LAYOUTS) as LayoutId[];

function everyInPageRect(layoutId: LayoutId) {
  const { rows, cols } = LAYOUTS[layoutId];
  const cases: { row: number; col: number; rowSpan: number; colSpan: number; area: number }[] = [];
  for (let rowSpan = 1; rowSpan <= rows; rowSpan += 1) {
    for (let colSpan = 1; colSpan <= cols; colSpan += 1) {
      for (let row = 0; row <= rows - rowSpan; row += 1) {
        for (let col = 0; col <= cols - colSpan; col += 1) {
          cases.push({ row, col, rowSpan, colSpan, area: rowSpan * colSpan });
        }
      }
    }
  }
  return cases;
}

function distinctShapes(layoutId: LayoutId) {
  const { rows, cols } = LAYOUTS[layoutId];
  const shapes: { rowSpan: number; colSpan: number }[] = [];
  for (let rowSpan = 1; rowSpan <= rows; rowSpan += 1) {
    for (let colSpan = 1; colSpan <= cols; colSpan += 1) {
      if (rowSpan * colSpan >= 2) shapes.push({ rowSpan, colSpan });
    }
  }
  return shapes;
}

const artTransform: Transform = {
  version: 1,
  crop: { x: 0.1, y: 0.1, w: 0.8, h: 0.8 },
  rotation: 90,
};

describe('AT-1 merge validation (exhaustive)', () => {
  let accepted = 0;
  let rejected1x1 = 0;
  let rejectedOverlap = 0;

  for (const layoutId of LAYOUT_IDS) {
    it(`enumerates every rectangle on ${layoutId}`, () => {
      const binder = createBinder({ id: layoutId, layoutId, pageMode: 'single', pageCount: 2 });
      const pageId = binder.pages[0].id;
      for (const c of everyInPageRect(layoutId)) {
        const result = validateMerge(binder, { pageId, ...c });
        if (c.area < 2) {
          expect(result.ok).toBe(false);
          rejected1x1 += 1;
        } else {
          expect(result.ok).toBe(true);
          accepted += 1;
        }
      }
      const withMerge = addMerge(
        binder,
        { pageId, row: 0, col: 0, rowSpan: 1, colSpan: 2 },
        'm1',
      );
      const overlap = validateMerge(withMerge, { pageId, row: 0, col: 0, rowSpan: 2, colSpan: 1 });
      expect(overlap.ok).toBe(false);
      rejectedOverlap += 1;
      const oob = validateMerge(binder, {
        pageId,
        row: 0,
        col: LAYOUTS[layoutId].cols,
        rowSpan: 1,
        colSpan: 2,
      });
      expect(oob.ok).toBe(false);
    });
  }

  it('reports exhaustive case volume', () => {
    const totalRects = LAYOUT_IDS.reduce((n, id) => n + everyInPageRect(id).length, 0);
    expect(totalRects).toBeGreaterThan(200);
    expect(accepted).toBeGreaterThan(100);
    expect(rejected1x1).toBeGreaterThan(10);
    expect(rejectedOverlap).toBe(LAYOUT_IDS.length);
  });
});

describe('AT-2 cross-page validation', () => {
  it('accepts a gutter span only on a left-facing page in double mode', () => {
    const binder = createBinder({ id: 'x', layoutId: '3x3', pageMode: 'double', pageCount: 3 });
    const left = binder.pages.find((p) => p.position === 2)!;
    const ok = validateMerge(binder, {
      pageId: left.id,
      row: 0,
      col: 2,
      rowSpan: 1,
      colSpan: 2,
      spansGutter: true,
    });
    expect(ok).toEqual({ ok: true });
  });

  it('rejects in single mode', () => {
    const binder = createBinder({ id: 'x', layoutId: '3x3', pageMode: 'single', pageCount: 3 });
    const left = binder.pages.find((p) => p.position === 2)!;
    expect(
      validateMerge(binder, {
        pageId: left.id,
        row: 0,
        col: 2,
        rowSpan: 1,
        colSpan: 2,
        spansGutter: true,
      }).ok,
    ).toBe(false);
  });

  it('rejects page 1 and right pages as anchors', () => {
    const binder = createBinder({ id: 'x', layoutId: '3x3', pageMode: 'double', pageCount: 3 });
    const p1 = binder.pages.find((p) => p.position === 1)!;
    const p3 = binder.pages.find((p) => p.position === 3)!;
    expect(
      validateMerge(binder, {
        pageId: p1.id,
        row: 0,
        col: 2,
        rowSpan: 1,
        colSpan: 2,
        spansGutter: true,
      }).ok,
    ).toBe(false);
    expect(
      validateMerge(binder, {
        pageId: p3.id,
        row: 0,
        col: 2,
        rowSpan: 1,
        colSpan: 2,
        spansGutter: true,
      }).ok,
    ).toBe(false);
  });
});

describe('AT-3 round-trip (exhaustive shapes)', () => {
  let shapes = 0;
  for (const layoutId of LAYOUT_IDS) {
    it(`round-trips every merge shape on ${layoutId}`, () => {
      for (const shape of distinctShapes(layoutId)) {
        let binder = createBinder({
          id: `${layoutId}-${shape.rowSpan}x${shape.colSpan}`,
          layoutId,
          pageMode: 'double',
          pageCount: 3,
        });
        const pageId = binder.pages[0].id;
        binder = addMerge(binder, { pageId, ...shape, row: 0, col: 0 }, 'merge-1');
        const card: Placement = {
          id: 'pl-card',
          pageId,
          mergeId: 'merge-1',
          row: null,
          col: null,
          kind: 'card',
          cardId: 'base1-25',
          assetKind: null,
          uploadAssetId: null,
          packItemId: null,
          transform: {},
          ownership: 'owned',
        };
        binder = placeOnMerge(binder, card);
        const artPage = binder.pages[1].id;
        if (shape.colSpan <= LAYOUTS[layoutId].cols) {
          const artMergeOk = validateMerge(binder, {
            pageId: artPage,
            row: 0,
            col: 0,
            rowSpan: 1,
            colSpan: Math.min(2, LAYOUTS[layoutId].cols),
          });
          if (artMergeOk.ok) {
            binder = addMerge(
              binder,
              {
                pageId: artPage,
                row: 0,
                col: 0,
                rowSpan: 1,
                colSpan: Math.min(2, LAYOUTS[layoutId].cols),
              },
              'merge-art',
            );
            const art: Placement = {
              id: 'pl-art',
              pageId: artPage,
              mergeId: 'merge-art',
              row: null,
              col: null,
              kind: 'art',
              cardId: null,
              assetKind: 'pack',
              uploadAssetId: null,
              packItemId: 'pack-linen-1',
              transform: artTransform,
              ownership: null,
            };
            binder = placeOnMerge(binder, art);
          }
        }
        const round = deserializeBinder(serializeBinder(binder));
        expect(round).toEqual(binder);
        shapes += 1;
      }
    });

    it(`round-trips a representative cross-page merge on ${layoutId}`, () => {
      let binder = createBinder({
        id: `${layoutId}-xp`,
        layoutId,
        pageMode: 'double',
        pageCount: 3,
      });
      const left = binder.pages.find((p) => p.position === 2)!;
      binder = addMerge(
        binder,
        {
          pageId: left.id,
          row: 0,
          col: LAYOUTS[layoutId].cols - 1,
          rowSpan: 1,
          colSpan: 2,
          spansGutter: true,
        },
        'xp',
      );
      expect(deserializeBinder(serializeBinder(binder))).toEqual(binder);
    });
  }

  it('enumerated many shapes', () => {
    expect(shapes).toBeGreaterThan(20);
  });
});

describe('AT-4 unmerge', () => {
  it('empty merge restores cells immediately', () => {
    let binder = createBinder({ id: 'u', layoutId: '3x3', pageMode: 'single', pageCount: 1 });
    const pageId = binder.pages[0].id;
    binder = addMerge(binder, { pageId, row: 0, col: 0, rowSpan: 2, colSpan: 2 }, 'm');
    const result = unmerge(binder, 'm');
    expect(result.needsConfirm).toBe(false);
    expect(result.binder.merges).toHaveLength(0);
  });

  it('filled merge requires confirm; undo snapshot restores both', () => {
    let binder = createBinder({ id: 'u', layoutId: '3x3', pageMode: 'single', pageCount: 1 });
    const pageId = binder.pages[0].id;
    binder = addMerge(binder, { pageId, row: 0, col: 0, rowSpan: 2, colSpan: 2 }, 'm');
    binder = placeOnMerge(binder, {
      id: 'pl',
      pageId,
      mergeId: 'm',
      row: null,
      col: null,
      kind: 'card',
      cardId: 'base1-4',
      assetKind: null,
      uploadAssetId: null,
      packItemId: null,
      transform: {},
      ownership: 'wanted',
    });
    const blocked = unmerge(binder, 'm');
    expect(blocked.needsConfirm).toBe(true);
    expect(blocked.binder.merges).toHaveLength(1);
    const snapshot = serializeBinder(binder);
    const gone = unmerge(binder, 'm', { confirmed: true });
    expect(gone.binder.merges).toHaveLength(0);
    expect(gone.binder.placements).toHaveLength(0);
    expect(deserializeBinder(snapshot)).toEqual(binder);
  });
});

describe('AT-5 mode switch', () => {
  it('double→single with K cross-page merges prompts and removes only those', () => {
    let binder = createBinder({ id: 'm', layoutId: '3x3', pageMode: 'double', pageCount: 5 });
    const p2 = binder.pages.find((p) => p.position === 2)!;
    const p4 = binder.pages.find((p) => p.position === 4)!;
    const p1 = binder.pages.find((p) => p.position === 1)!;
    binder = addMerge(
      binder,
      { pageId: p2.id, row: 0, col: 2, rowSpan: 1, colSpan: 2, spansGutter: true },
      'x1',
    );
    binder = addMerge(
      binder,
      { pageId: p4.id, row: 1, col: 2, rowSpan: 1, colSpan: 2, spansGutter: true },
      'x2',
    );
    binder = addMerge(binder, { pageId: p1.id, row: 0, col: 0, rowSpan: 2, colSpan: 2 }, 'inpage');
    const prompt = switchPageMode(binder, 'single');
    expect(prompt.needsConfirm).toBe(true);
    expect(prompt.crossPageCount).toBe(2);
    const done = switchPageMode(binder, 'single', { confirmed: true });
    expect(done.binder.pageMode).toBe('single');
    expect(done.binder.merges.map((m) => m.id)).toEqual(['inpage']);
    const back = switchPageMode(binder, 'double');
    expect(back.needsConfirm).toBe(false);
    expect(back.binder.pageMode).toBe('double');
    expect(back.binder.merges).toHaveLength(3);
  });
});

describe('domain purity', () => {
  it('src/domain has no React/DOM/Supabase imports', () => {
    const dir = join(process.cwd(), 'src/domain');
    for (const file of readdirSync(dir)) {
      if (!file.endsWith('.ts') || file.endsWith('.test.ts')) continue;
      const src = readFileSync(join(dir, file), 'utf8');
      expect(src).not.toMatch(/from ['"]react['"]/);
      expect(src).not.toMatch(/from ['"]react-dom['"]/);
      expect(src).not.toMatch(/from ['"]@supabase/);
      expect(src).not.toMatch(/document\./);
      expect(src).not.toMatch(/window\./);
    }
  });
});
