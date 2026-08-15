/**
 * Download pokemon-tcg-data and write the static catalog files in public/data/.
 * Deterministic: stable sort, no timestamps. See docs/data-sync.md.
 *
 *   node --experimental-strip-types scripts/sync-card-data.ts
 */

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const TARBALL_URL =
  'https://github.com/PokemonTCG/pokemon-tcg-data/archive/refs/heads/master.tar.gz';

const ROOT = join(import.meta.dirname, '..');
const OUT_DIR = join(ROOT, 'public', 'data');

type RawCard = {
  id: string;
  name: string;
  number: string;
  rarity?: string;
  artist?: string;
  types?: string[];
  nationalPokedexNumbers?: number[];
  images?: { small?: string; large?: string };
};

type RawSet = {
  id: string;
  name: string;
  series: string;
  releaseDate: string;
  images?: { symbol?: string; logo?: string };
};

function derivedImageUrls(setId: string, number: string) {
  const encoded = number.replaceAll(' ', '');
  return {
    small: `https://images.pokemontcg.io/${setId}/${encoded}.png`,
    large: `https://images.pokemontcg.io/${setId}/${encoded}_hires.png`,
  };
}

function shortestName(names: string[]): string {
  return [...names].sort((a, b) => a.length - b.length || a.localeCompare(b))[0];
}

function writeJson(path: string, value: unknown) {
  const text = `${JSON.stringify(value)}\n`;
  writeFileSync(path, text);
}

function downloadAndExtract(): string {
  const dir = mkdtempSync(join(tmpdir(), 'michi-tcg-'));
  const tarball = join(dir, 'master.tar.gz');
  execFileSync('curl', ['-fsSL', TARBALL_URL, '-o', tarball], { stdio: 'inherit' });
  execFileSync('tar', ['-xzf', tarball, '-C', dir], { stdio: 'inherit' });
  const extracted = readdirSync(dir).find((name) => name.startsWith('pokemon-tcg-data-'));
  if (!extracted) throw new Error('tarball did not contain pokemon-tcg-data-*');
  return join(dir, extracted);
}

function main() {
  console.log('Downloading pokemon-tcg-data…');
  const sourceRoot = downloadAndExtract();
  const cardsDir = join(sourceRoot, 'cards', 'en');
  const setsPath = join(sourceRoot, 'sets', 'en.json');

  const sets = (JSON.parse(readFileSync(setsPath, 'utf8')) as RawSet[]).slice().sort((a, b) =>
    a.id.localeCompare(b.id),
  );

  const setById = new Map(sets.map((s) => [s.id, s]));

  const cards: { card: RawCard; setId: string }[] = [];
  for (const file of readdirSync(cardsDir).sort()) {
    if (!file.endsWith('.json')) continue;
    const fileSetId = file.replace(/\.json$/, '');
    const batch = JSON.parse(readFileSync(join(cardsDir, file), 'utf8')) as RawCard[];
    for (const card of batch) {
      cards.push({ card, setId: fileSetId });
    }
  }
  cards.sort((a, b) => a.card.id.localeCompare(b.card.id));

  const id: string[] = [];
  const name: string[] = [];
  const setId: string[] = [];
  const number: string[] = [];
  const rarity: (string | null)[] = [];
  const artist: (string | null)[] = [];
  const types: string[][] = [];
  const dex: (number | null)[] = [];
  const era: string[] = [];
  const exceptions: Record<string, { small: string; large: string }> = {};
  const speciesNames = new Map<number, string[]>();

  for (const { card, setId: cardSetId } of cards) {
    const set = setById.get(cardSetId);
    if (!set) throw new Error(`card ${card.id} references unknown set ${cardSetId}`);
    id.push(card.id);
    name.push(card.name);
    setId.push(cardSetId);
    number.push(card.number);
    rarity.push(card.rarity ?? null);
    artist.push(card.artist ?? null);
    types.push(card.types ?? []);
    const primaryDex = card.nationalPokedexNumbers?.[0] ?? null;
    dex.push(primaryDex);
    era.push(set.series);
    if (primaryDex != null) {
      const list = speciesNames.get(primaryDex) ?? [];
      list.push(card.name);
      speciesNames.set(primaryDex, list);
    }

    const derived = derivedImageUrls(cardSetId, card.number);
    const small = card.images?.small;
    const large = card.images?.large;
    if (small && large && (small !== derived.small || large !== derived.large)) {
      exceptions[card.id] = { small, large };
    }
  }

  const dexSpecies: Record<string, string> = {};
  for (const [n, names] of [...speciesNames.entries()].sort((a, b) => a[0] - b[0])) {
    dexSpecies[String(n)] = shortestName(names);
  }

  mkdirSync(OUT_DIR, { recursive: true });
  writeJson(join(OUT_DIR, 'cards-index.json'), {
    id,
    name,
    setId,
    number,
    rarity,
    artist,
    types,
    dex,
    era,
  });
  writeJson(
    join(OUT_DIR, 'sets.json'),
    sets.map((s) => ({
      id: s.id,
      name: s.name,
      series: s.series,
      releaseDate: s.releaseDate,
      symbol: s.images?.symbol ?? null,
      logo: s.images?.logo ?? null,
    })),
  );
  writeJson(join(OUT_DIR, 'dex-species.json'), dexSpecies);
  writeJson(join(OUT_DIR, 'image-exceptions.json'), exceptions);

  const catalogDir = join(ROOT, 'src/templates/catalog');
  for (const file of readdirSync(catalogDir)) {
    if (!file.endsWith('.json') || file === 'manifest.json') continue;
    const path = join(catalogDir, file);
    const tpl = JSON.parse(readFileSync(path, 'utf8')) as {
      placements: Array<{
        kind: string;
        cardId: string | null;
        card?: unknown;
      }>;
    };
    for (const placement of tpl.placements) {
      if (placement.kind !== 'card' || !placement.cardId) continue;
      const i = id.indexOf(placement.cardId);
      if (i < 0) continue;
      const derived = derivedImageUrls(setId[i], number[i]);
      placement.card = {
        card_id: placement.cardId,
        name: name[i],
        set: setId[i],
        number: number[i],
        imageUrl: derived.small,
      };
    }
    writeJson(path, tpl);
  }

  const indexPath = join(OUT_DIR, 'cards-index.json');
  const indexBytes = readFileSync(indexPath).byteLength;
  const hash = createHash('sha256').update(readFileSync(indexPath)).digest('hex').slice(0, 12);

  console.log(`cards: ${id.length}`);
  console.log(`sets: ${sets.length}`);
  console.log(`species: ${Object.keys(dexSpecies).length}`);
  console.log(`image exceptions: ${Object.keys(exceptions).length}`);
  console.log(`cards-index.json: ${(indexBytes / (1024 * 1024)).toFixed(2)} MB (sha ${hash})`);
  if (indexBytes > 6 * 1024 * 1024) {
    throw new Error(`cards-index.json is ${indexBytes} bytes — budget is 6 MB`);
  }

  rmSync(sourceRoot, { recursive: true, force: true });
}

main();
