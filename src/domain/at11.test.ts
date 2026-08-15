import { describe, expect, it } from 'vitest';
import { pullList } from './pullList';
import {
  addMerge,
  createBinder,
  placeIntoCell,
  placeOnMerge,
  placementFromCard,
  placementFromUpload,
  setOwnership,
} from './slots';

describe('AT-11 pull list', () => {
  it('lists owned, wanted, and a split art merge with AT-6 annotation', () => {
    let binder = createBinder({ id: 'p', layoutId: '3x3', pageMode: 'single', pageCount: 1 });
    const pageId = binder.pages[0].id;
    binder = placeIntoCell(binder, pageId, 2, 2, placementFromCard('owned', 'base1-25'));
    binder = setOwnership(binder, 'owned', 'owned');
    binder = placeIntoCell(binder, pageId, 2, 1, placementFromCard('want', 'base1-4'));
    binder = setOwnership(binder, 'want', 'wanted');
    binder = addMerge(binder, { pageId, row: 0, col: 0, rowSpan: 3, colSpan: 3 }, 'art');
    binder = placeOnMerge(binder, {
      ...placementFromUpload('artpl', 'up-1'),
      pageId,
      mergeId: 'art',
    });
    const rows = pullList(binder, new Set([pageId]));
    const owned = rows.find((r) => r.cardId === 'base1-25');
    const wanted = rows.find((r) => r.cardId === 'base1-4');
    const art = rows.find((r) => r.kind === 'art');
    expect(owned?.ownership).toBe('owned');
    expect(wanted?.ownership).toBe('wanted');
    expect(art?.annotation).toBe('split into 6 pieces (rows can be threaded whole)');
    expect(art?.pieceCount).toBe(6);
    expect(art?.exportKey).toBe('export:art');
  });
});
