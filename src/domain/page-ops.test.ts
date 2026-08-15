import { describe, expect, it } from 'vitest';
import {
  addMerge,
  clearPage,
  createBinder,
  deletePage,
  placeIntoCell,
  placementFromCard,
  placeOnMerge,
} from './slots';

describe('clearPage / deletePage', () => {
  it('clearPage restores empty cells including merges and placements', () => {
    let binder = createBinder({ id: 'c', layoutId: '3x3', pageMode: 'double', pageCount: 3 });
    const p1 = binder.pages.find((p) => p.position === 1)!;
    const p2 = binder.pages.find((p) => p.position === 2)!;
    binder = addMerge(binder, { pageId: p1.id, row: 0, col: 0, rowSpan: 2, colSpan: 2 }, 'm1');
    binder = placeOnMerge(binder, {
      ...placementFromCard('pl', 'base1-25'),
      pageId: p1.id,
      mergeId: 'm1',
    });
    binder = placeIntoCell(binder, p2.id, 0, 0, placementFromCard('other', 'base1-4'));
    binder = clearPage(binder, p1.id);
    expect(binder.merges).toHaveLength(0);
    expect(binder.placements.map((p) => p.id)).toEqual(['other']);
    expect(binder.pages).toHaveLength(3);
  });

  it('deletePage resequences and drops that page’s slots', () => {
    let binder = createBinder({ id: 'd', layoutId: '2x2', pageMode: 'single', pageCount: 3 });
    const p2 = binder.pages.find((p) => p.position === 2)!;
    binder = addMerge(binder, { pageId: p2.id, row: 0, col: 0, rowSpan: 1, colSpan: 2 }, 'm');
    binder = deletePage(binder, p2.id);
    expect(binder.pages.map((p) => p.position)).toEqual([1, 2]);
    expect(binder.merges).toHaveLength(0);
  });
});
