import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { allTemplates, starterBinder } from '@/templates/catalog';
import { cloneTemplatePage, everyCardHasDisplay } from '@/templates/clone';
import { refreshTemplateDisplay } from '@/templates/refresh';
import type { CardIndex } from '@/search/types';

describe('templates', () => {
  it('embeds display data for every card so landing never needs the catalog', () => {
    expect(allTemplates.length).toBeGreaterThanOrEqual(6);
    for (const tpl of allTemplates) {
      expect(tpl.draft).toBe(true);
      expect(everyCardHasDisplay(tpl)).toBe(true);
    }
  });

  it('clones a starter page including its merges', () => {
    const cloned = cloneTemplatePage(starterBinder, 3, 'target-binder');
    expect(cloned.pages).toHaveLength(1);
    expect(cloned.merges).toHaveLength(1);
    expect(cloned.merges[0].rowSpan).toBe(2);
    expect(cloned.merges[0].colSpan).toBe(2);
    expect(cloned.merges[0].pageId).toBe(cloned.pages[0].id);
    expect(cloned.id).toBe('target-binder');
    // Every placement is re-pointed at the new page, none left dangling.
    expect(cloned.placements.every((p) => p.pageId === cloned.pages[0].id)).toBe(true);
    expect(cloned.placements.length).toBeGreaterThan(0);
  });

  it('carries whatever sits inside a merge, transform and all', () => {
    // Built here rather than read from the starter file, so showcase content
    // is free to change without weakening what this actually checks.
    const fixture = {
      ...starterBinder,
      pages: [{ id: 'src-page', position: 1 }],
      merges: [
        { id: 'mg', pageId: 'src-page', row: 0, col: 0, rowSpan: 2, colSpan: 2, spansGutter: false },
      ],
      placements: [
        {
          id: 'inside',
          pageId: 'src-page',
          mergeId: 'mg',
          row: null,
          col: null,
          kind: 'art' as const,
          cardId: null,
          assetKind: 'upload' as const,
          uploadAssetId: 'asset-9',
          packItemId: null,
          transform: { version: 1 as const, crop: { x: 0.1, y: 0.2, w: 0.5, h: 0.5 }, rotation: 90 as const },
          ownership: null,
        },
      ],
    };
    const cloned = cloneTemplatePage(fixture, 1, 'copy');
    const carried = cloned.placements.find((p) => p.mergeId === cloned.merges[0].id);
    expect(carried).toBeDefined();
    expect(carried?.uploadAssetId).toBe('asset-9');
    expect(carried?.transform).toEqual({
      version: 1,
      crop: { x: 0.1, y: 0.2, w: 0.5, h: 0.5 },
      rotation: 90,
    });
  });

  it('never silently targets the playground binder', () => {
    const a = cloneTemplatePage(starterBinder, 3, 'binder-a');
    const b = cloneTemplatePage(starterBinder, 3, 'binder-b');
    expect(a.id).not.toBe(b.id);
    expect(a.pages[0].binderId).toBe('binder-a');
    expect(b.pages[0].binderId).toBe('binder-b');
  });

  it('refresh rewrites display fields from the card index', () => {
    const index = JSON.parse(readFileSync('public/data/cards-index.json', 'utf8')) as CardIndex;
    const stale = {
      ...starterBinder,
      placements: starterBinder.placements.map((p) =>
        p.kind === 'card' ? { ...p, card: { card_id: p.cardId!, name: 'stale', set: 'x', number: '0', imageUrl: 'https://example.com/nope.png' } } : p,
      ),
    };
    const fresh = refreshTemplateDisplay(stale, index);
    expect(everyCardHasDisplay(fresh)).toBe(true);
    expect(fresh.placements.find((p) => p.cardId === 'base1-58')?.card?.name).toBe('Pikachu');
  });
});
