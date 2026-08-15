import MiniSearch from 'minisearch';
import { cardImageUrl } from './images';
import type { CardHit, CardIndex, ImageExceptions, SearchQuery, SetInfo } from './types';

export type LoadedCatalog = {
  index: CardIndex;
  sets: SetInfo[];
  dexSpecies: Record<string, string>;
  exceptions: ImageExceptions;
  mini: MiniSearch;
};

export function buildMiniSearch(index: CardIndex): MiniSearch {
  const mini = new MiniSearch({
    fields: ['name', 'artist'],
    storeFields: ['id'],
    idField: 'id',
    searchOptions: { prefix: true, fuzzy: 0.2 },
  });
  const docs = index.id.map((id, i) => ({
    id,
    name: index.name[i],
    artist: index.artist[i] ?? '',
  }));
  mini.addAll(docs);
  return mini;
}

function hitAt(catalog: LoadedCatalog, i: number): CardHit {
  const { index, exceptions } = catalog;
  return {
    id: index.id[i],
    name: index.name[i],
    setId: index.setId[i],
    number: index.number[i],
    rarity: index.rarity[i],
    artist: index.artist[i],
    types: index.types[i],
    dex: index.dex[i],
    era: index.era[i],
    imageSmall: cardImageUrl(index.id[i], index.setId[i], index.number[i], exceptions),
  };
}

export function searchCatalog(
  catalog: LoadedCatalog,
  query: SearchQuery,
  limit = 80,
): CardHit[] {
  const { index, mini } = catalog;
  const text = query.text?.trim() ?? '';
  let candidates: number[];

  if (text) {
    const ids = new Set(mini.search(text).map((r) => r.id as string));
    candidates = [];
    for (let i = 0; i < index.id.length; i += 1) {
      if (ids.has(index.id[i])) candidates.push(i);
    }
  } else {
    candidates = index.id.map((_, i) => i);
  }

  const hits: CardHit[] = [];
  for (const i of candidates) {
    if (query.setId && index.setId[i] !== query.setId) continue;
    if (query.speciesDex != null && index.dex[i] !== query.speciesDex) continue;
    if (query.type && !index.types[i].includes(query.type)) continue;
    if (query.artist && index.artist[i] !== query.artist) continue;
    if (query.rarity && index.rarity[i] !== query.rarity) continue;
    if (query.era && index.era[i] !== query.era) continue;
    hits.push(hitAt(catalog, i));
    if (hits.length >= limit) break;
  }
  return hits;
}

export function uniqueFacets(index: CardIndex, dexSpecies: Record<string, string>) {
  const uniq = (values: (string | null)[]) =>
    [...new Set(values.filter((v): v is string => Boolean(v)))].sort((a, b) => a.localeCompare(b));
  return {
    setId: uniq(index.setId),
    era: uniq(index.era),
    rarity: uniq(index.rarity),
    artist: uniq(index.artist),
    type: uniq(index.types.flat()),
    species: [...new Set(index.dex.filter((d): d is number => d != null))]
      .sort((a, b) => a - b)
      .map((d) => ({ dex: d, name: dexSpecies[String(d)] ?? `#${d}` })),
  };
}
