import { describe, expect, it } from 'vitest';
import { assemblyAnnotation } from './split';
import {
  addMerge,
  adoptPlacementsIntoMerge,
  createBinder,
  placeIntoCell,
  placementFromCard,
  proposalFromSelection,
  unmerge,
} from './slots';

describe('proposalFromSelection', () => {
  it('fills an in-page rectangle from two corners', () => {
    const binder = createBinder({ id: 's', layoutId: '3x3', pageMode: 'single', pageCount: 1 });
    const pageId = binder.pages[0].id;
    const proposal = proposalFromSelection(binder, [
      { pageId, row: 0, col: 0 },
      { pageId, row: 1, col: 1 },
    ]);
    expect(proposal).toEqual({ pageId, row: 0, col: 0, rowSpan: 2, colSpan: 2 });
  });

  it('rejects 1×1', () => {
    const binder = createBinder({ id: 's', layoutId: '3x3', pageMode: 'single', pageCount: 1 });
    const pageId = binder.pages[0].id;
    expect(proposalFromSelection(binder, [{ pageId, row: 0, col: 0 }])).toEqual({ error: '1x1' });
  });

  it('builds a cross-page merge on facing pages (2,3) and rejects single mode', () => {
    const double = createBinder({ id: 'd', layoutId: '3x3', pageMode: 'double', pageCount: 3 });
    const left = double.pages.find((p) => p.position === 2)!;
    const right = double.pages.find((p) => p.position === 3)!;
    expect(
      proposalFromSelection(double, [
        { pageId: left.id, row: 0, col: 2 },
        { pageId: right.id, row: 0, col: 0 },
      ]),
    ).toEqual({
      pageId: left.id,
      row: 0,
      col: 2,
      rowSpan: 1,
      colSpan: 2,
      spansGutter: true,
    });

    const single = createBinder({ id: 's', layoutId: '3x3', pageMode: 'single', pageCount: 3 });
    const sLeft = single.pages.find((p) => p.position === 2)!;
    const sRight = single.pages.find((p) => p.position === 3)!;
    expect(
      proposalFromSelection(single, [
        { pageId: sLeft.id, row: 0, col: 2 },
        { pageId: sRight.id, row: 0, col: 0 },
      ]),
    ).toEqual({ error: 'single-mode' });
  });
});

describe('T3.6 assembly badges (AT-6 walkthrough rows)', () => {
  it('2x2 cols 0–1 is split; 3x3 cols 0–1 is slide-through', () => {
    let two = createBinder({ id: '2', layoutId: '2x2', pageMode: 'single', pageCount: 1 });
    two = addMerge(two, { pageId: two.pages[0].id, row: 0, col: 0, rowSpan: 1, colSpan: 2 }, 'm');
    expect(assemblyAnnotation(two, two.merges[0])).toMatch(/^split into 2 pieces/);

    let three = createBinder({ id: '3', layoutId: '3x3', pageMode: 'single', pageCount: 1 });
    three = addMerge(three, { pageId: three.pages[0].id, row: 0, col: 0, rowSpan: 1, colSpan: 2 }, 'm');
    expect(assemblyAnnotation(three, three.merges[0])).toBe('slide-through');
  });
});

describe('adopt + unmerge filled (AT-4)', () => {
  it('adopts a cell placement onto the new merge', () => {
    let binder = createBinder({ id: 'a', layoutId: '3x3', pageMode: 'single', pageCount: 1 });
    const pageId = binder.pages[0].id;
    binder = placeIntoCell(binder, pageId, 0, 0, placementFromCard('c', 'base1-25'));
    binder = addMerge(binder, { pageId, row: 0, col: 0, rowSpan: 1, colSpan: 2 }, 'm');
    binder = adoptPlacementsIntoMerge(binder, 'm');
    expect(binder.placements).toHaveLength(1);
    expect(binder.placements[0].mergeId).toBe('m');
    expect(binder.placements[0].row).toBeNull();
  });

  it('empty unmerge is instant; filled needs confirm', () => {
    let binder = createBinder({ id: 'u', layoutId: '2x2', pageMode: 'single', pageCount: 1 });
    const pageId = binder.pages[0].id;
    binder = addMerge(binder, { pageId, row: 0, col: 0, rowSpan: 1, colSpan: 2 }, 'm');
    expect(unmerge(binder, 'm').needsConfirm).toBe(false);
    binder = adoptPlacementsIntoMerge(
      placeIntoCell(binder, pageId, 0, 0, placementFromCard('c', 'base1-4')),
      'm',
    );
    // placement is on the merge, so cell place may have been replaced — put it on merge explicitly
    const filled = {
      ...binder,
      placements: [
        {
          ...placementFromCard('c', 'base1-4'),
          pageId,
          mergeId: 'm',
        },
      ],
    };
    expect(unmerge(filled, 'm').needsConfirm).toBe(true);
    expect(unmerge(filled, 'm', { confirmed: true }).binder.merges).toHaveLength(0);
  });
});
