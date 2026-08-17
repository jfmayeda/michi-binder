import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildMiniSearch, searchCatalog, uniqueFacets } from './query';
import { hexToHue, hueDistance } from './vibe';
import type { CardIndex, ImageExceptions, SetInfo } from './types';

const dataDir = join(process.cwd(), 'public', 'data');

function loadCatalog() {
  const index = JSON.parse(readFileSync(join(dataDir, 'cards-index.json'), 'utf8')) as CardIndex;
  const sets = JSON.parse(readFileSync(join(dataDir, 'sets.json'), 'utf8')) as SetInfo[];
  const dexSpecies = JSON.parse(
    readFileSync(join(dataDir, 'dex-species.json'), 'utf8'),
  ) as Record<string, string>;
  const exceptions = JSON.parse(
    readFileSync(join(dataDir, 'image-exceptions.json'), 'utf8'),
  ) as ImageExceptions;
  const colorsFile = JSON.parse(
    readFileSync(join(dataDir, 'colors.json'), 'utf8'),
  ) as { cards?: Record<string, { hex: string; weight: number }[]> };
  return {
    index,
    sets,
    dexSpecies,
    exceptions,
    colors: colorsFile.cards ?? {},
    mini: buildMiniSearch(index),
  };
}

describe('search catalog', () => {
  const catalog = loadCatalog();

  it('finds Pikachu by text', () => {
    const hits = searchCatalog(catalog, { text: 'Pikachu' }, 200);
    expect(hits.length).toBeGreaterThan(0);
    expect(
      hits.every(
        (h) => /pikachu/i.test(h.name) || /pikachu/i.test(h.artist ?? ''),
      ),
    ).toBe(true);
    expect(hits.some((h) => h.name === 'Pikachu')).toBe(true);
  });

  it('filters by set', () => {
    const hits = searchCatalog(catalog, { setId: 'base1' }, 500);
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.every((h) => h.setId === 'base1')).toBe(true);
  });

  it('filters by species (Pikachu = 25)', () => {
    const hits = searchCatalog(catalog, { speciesDex: 25 }, 500);
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.every((h) => h.dex === 25)).toBe(true);
  });

  it('filters by type', () => {
    const hits = searchCatalog(catalog, { type: 'Water' }, 200);
    expect(hits.every((h) => h.types.includes('Water'))).toBe(true);
  });

  it('filters by artist', () => {
    const hits = searchCatalog(catalog, { artist: 'Ken Sugimori' }, 200);
    expect(hits.every((h) => h.artist === 'Ken Sugimori')).toBe(true);
  });

  it('filters by rarity', () => {
    const hits = searchCatalog(catalog, { rarity: 'Rare Holo' }, 200);
    expect(hits.every((h) => h.rarity === 'Rare Holo')).toBe(true);
  });

  it('filters by era', () => {
    const hits = searchCatalog(catalog, { era: 'Base' }, 200);
    expect(hits.every((h) => h.era === 'Base')).toBe(true);
  });

  it('combines text and set facet', () => {
    const hits = searchCatalog(catalog, { text: 'Pikachu', setId: 'base1' }, 50);
    expect(hits.some((h) => h.id === 'base1-58')).toBe(true);
    expect(hits.every((h) => h.setId === 'base1')).toBe(true);
  });

  it('runs a representative query in under 50ms after load', () => {
    searchCatalog(catalog, { text: 'Charizard' }, 40);
    const start = performance.now();
    searchCatalog(catalog, { text: 'Pikachu', type: 'Lightning' }, 80);
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(50);
  });

  it('a pink swatch ranks predominantly pink cards across sets', () => {
    const hits = searchCatalog(catalog, { hueDeg: 330 }, 20);
    expect(hits.length).toBe(20);
    const pinkish = hits.filter((h) => {
      const top = catalog.colors[h.id]?.[0];
      if (!top) return false;
      return hueDistance(hexToHue(top.hex), 330) <= 55;
    });
    expect(pinkish.length).toBeGreaterThan(hits.length / 2);
    const sets = new Set(hits.map((h) => h.setId));
    expect(sets.size).toBeGreaterThan(1);
  });

  it('exposes facet lists', () => {
    const facets = uniqueFacets(catalog.index, catalog.dexSpecies);
    expect(facets.era).toContain('Base');
    expect(facets.type).toContain('Fire');
    expect(facets.species.some((s) => s.dex === 25 && s.name === 'Pikachu')).toBe(true);
  });
});
