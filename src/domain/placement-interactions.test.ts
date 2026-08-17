import { describe, expect, it } from 'vitest';
import { deserializeBinder, serializeBinder } from './serialize';
import {
  createBinder,
  placeIntoCell,
  placementAt,
  placementFromCard,
  removePlacement,
} from './slots';
import type { Binder, Placement } from './types';

function placeCard(binder: Binder, pageId: string, row: number, col: number, id: string, cardId: string) {
  return placeIntoCell(binder, pageId, row, col, placementFromCard(id, cardId));
}

function idsAt(binder: Binder, pageId: string) {
  return binder.placements
    .filter((p) => p.pageId === pageId)
    .sort((a, b) => `${a.row}:${a.col}`.localeCompare(`${b.row}:${b.col}`))
    .map((p) => ({ id: p.id, cardId: p.cardId, row: p.row, col: p.col }));
}

function scriptedOps(pageMode: Binder['pageMode']): Binder {
  const binder0 = createBinder({ id: `ops-${pageMode}`, layoutId: '3x3', pageMode, pageCount: 3 });
  const page = binder0.pages.find((p) => p.position === 1)!;
  const other = binder0.pages.find((p) => p.position === 2)!;

  let binder = placeCard(binder0, page.id, 0, 0, 'a', 'base1-25');
  binder = placeCard(binder, page.id, 0, 1, 'b', 'base1-4');
  binder = placeCard(binder, page.id, 1, 0, 'c', 'base1-58');

  const a = binder.placements.find((p) => p.id === 'a')!;
  binder = placeIntoCell(binder, page.id, 0, 1, a);

  const movedA = placementAt(binder, page.id, 0, 1);
  const swappedB = placementAt(binder, page.id, 0, 0);
  expect(movedA?.id).toBe('a');
  expect(movedA?.cardId).toBe('base1-25');
  expect(swappedB?.id).toBe('b');
  expect(swappedB?.cardId).toBe('base1-4');
  expect(placementAt(binder, page.id, 1, 0)?.id).toBe('c');

  binder = placeIntoCell(binder, other.id, 2, 2, binder.placements.find((p) => p.id === 'c')!);
  expect(placementAt(binder, page.id, 1, 0)).toBeUndefined();
  expect(placementAt(binder, other.id, 2, 2)?.id).toBe('c');

  binder = removePlacement(binder, 'b');
  expect(placementAt(binder, page.id, 0, 0)).toBeUndefined();
  expect(placementAt(binder, page.id, 0, 1)?.id).toBe('a');

  binder = placeCard(binder, page.id, 0, 1, 'd', 'base1-2');
  expect(placementAt(binder, page.id, 0, 1)?.id).toBe('d');
  expect(binder.placements.some((p) => p.id === 'a')).toBe(false);

  return binder;
}

describe('T3.5 placement interactions', () => {
  for (const pageMode of ['single', 'double'] as const) {
    it(`place, move, swap, remove, then AT-3 round-trip (${pageMode})`, () => {
      const binder = scriptedOps(pageMode);
      const round = deserializeBinder(serializeBinder(binder));
      expect(round).toEqual(binder);
      expect(idsAt(round, round.pages[0].id)).toEqual([
        { id: 'd', cardId: 'base1-2', row: 0, col: 1 },
      ]);
      expect(idsAt(round, round.pages[1].id)).toEqual([
        { id: 'c', cardId: 'base1-58', row: 2, col: 2 },
      ]);
    });
  }

  it('swaps two occupied cells without dropping either card', () => {
    let binder = createBinder({ id: 'swap', layoutId: '2x2', pageMode: 'single', pageCount: 1 });
    const pageId = binder.pages[0].id;
    binder = placeCard(binder, pageId, 0, 0, 'x', 'base1-1');
    binder = placeCard(binder, pageId, 1, 1, 'y', 'base1-2');
    const x = binder.placements.find((p) => p.id === 'x') as Placement;
    binder = placeIntoCell(binder, pageId, 1, 1, x);
    expect(placementAt(binder, pageId, 1, 1)?.id).toBe('x');
    expect(placementAt(binder, pageId, 0, 0)?.id).toBe('y');
    expect(binder.placements).toHaveLength(2);
  });
});
