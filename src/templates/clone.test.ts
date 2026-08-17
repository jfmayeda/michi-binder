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

  it('clones a starter page including merges and transforms', () => {
    const cloned = cloneTemplatePage(starterBinder, 3);
    expect(cloned.pages).toHaveLength(1);
    expect(cloned.merges).toHaveLength(1);
    expect(cloned.merges[0].rowSpan).toBe(2);
    expect(cloned.placements.some((p) => p.mergeId === cloned.merges[0].id)).toBe(true);
    expect(cloned.placements.find((p) => p.mergeId)?.cardId).toBe('base1-4');
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
