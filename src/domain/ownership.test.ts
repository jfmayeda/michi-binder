import { describe, expect, it } from 'vitest';
import { createBinder, placeIntoCell, placementFromCard, placementFromUpload, setOwnership } from './slots';

describe('T4.6 ownership', () => {
  it('toggles owned/wanted on cards and ignores art', () => {
    let binder = createBinder({ id: 'o', layoutId: '2x2', pageMode: 'single', pageCount: 1 });
    const pageId = binder.pages[0].id;
    binder = placeIntoCell(binder, pageId, 0, 0, placementFromCard('c', 'base1-25'));
    binder = placeIntoCell(binder, pageId, 0, 1, placementFromUpload('a', 'up-1'));
    binder = setOwnership(binder, 'c', 'wanted');
    expect(binder.placements.find((p) => p.id === 'c')?.ownership).toBe('wanted');
    binder = setOwnership(binder, 'a', 'wanted');
    expect(binder.placements.find((p) => p.id === 'a')?.ownership).toBeNull();
  });
});
