import { buildMiniSearch, type LoadedCatalog } from './query';
import type { CardIndex, ImageExceptions, SetInfo } from './types';

let catalogPromise: Promise<LoadedCatalog> | null = null;
let binderInteractive = false;
let idlePrefetchStarted = false;

const INDEX_URL = '/data/cards-index.json';

export function resetSearchLoaderForTests() {
  catalogPromise = null;
  binderInteractive = false;
  idlePrefetchStarted = false;
}

export function markBinderInteractive() {
  binderInteractive = true;
  scheduleIdlePrefetch();
}

export function isBinderInteractive() {
  return binderInteractive;
}

function scheduleIdlePrefetch() {
  if (idlePrefetchStarted || catalogPromise || !binderInteractive) return;
  idlePrefetchStarted = true;
  const ric = globalThis.requestIdleCallback;
  if (typeof ric === 'function') {
    ric(() => {
      void ensureCatalog();
    });
  } else {
    setTimeout(() => {
      void ensureCatalog();
    }, 1);
  }
}

async function fetchJson<T>(url: string, fetcher: typeof fetch): Promise<T> {
  const res = await fetcher(url);
  if (!res.ok) throw new Error(`Failed to load ${url}: ${res.status}`);
  return (await res.json()) as T;
}

export async function ensureCatalog(fetcher: typeof fetch = fetch): Promise<LoadedCatalog> {
  if (!catalogPromise) {
    catalogPromise = (async () => {
      const [index, sets, dexSpecies, exceptions, colorsFile] = await Promise.all([
        fetchJson<CardIndex>(INDEX_URL, fetcher),
        fetchJson<SetInfo[]>('/data/sets.json', fetcher),
        fetchJson<Record<string, string>>('/data/dex-species.json', fetcher),
        fetchJson<ImageExceptions>('/data/image-exceptions.json', fetcher),
        fetchJson<{ cards?: Record<string, { hex: string; weight: number }[]> }>(
          '/data/colors.json',
          fetcher,
        ).catch(() => ({ cards: {} })),
      ]);
      return {
        index,
        sets,
        dexSpecies,
        exceptions,
        colors: colorsFile.cards ?? {},
        mini: buildMiniSearch(index),
      };
    })();
  }
  return catalogPromise;
}

/** True if a URL is the card index (used by AT-9). */
export function isCardIndexUrl(url: string) {
  return url.includes('/data/cards-index.json');
}
