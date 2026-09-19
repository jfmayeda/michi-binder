'use client';

import { DndContext } from '@dnd-kit/core';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ensureCatalog,
  searchCatalog,
  uniqueFacets,
  type CardHit,
  type SearchQuery,
} from '@/search';
import type { LoadedCatalog } from '@/search/query';
import { VirtualGrid } from '@/components/shared/VirtualGrid';
import { CardThumb } from './CardThumb';
import themeCollections from '@/templates/theme-collections.json';

const SWATCHES = [
  { name: 'Pink', hue: 330, color: '#e2a0b6' },
  { name: 'Blue', hue: 210, color: '#7ba4cd' },
  { name: 'Yellow', hue: 52, color: '#dfc260' },
  { name: 'Green', hue: 140, color: '#84b78f' },
  { name: 'Orange', hue: 28, color: '#d98a55' },
  { name: 'Purple', hue: 280, color: '#9d85b8' },
];

function activeFilterCount(q: SearchQuery): number {
  return [q.setId, q.speciesDex, q.type, q.artist, q.rarity, q.era, q.hueDeg].filter(
    (v) => v !== undefined && v !== '',
  ).length;
}

/**
 * The card box.
 *
 * Name search is the primary control and always visible. Everything else lives
 * behind one "More filters" disclosure that reports how many are on, so the
 * panel never opens as a wall of selects. The catalog loads as soon as the
 * panel mounts, so the results area always has a state to show — results,
 * loading, empty, or an error — rather than sitting blank until something is
 * focused, which is what the previous build did.
 */
export function SearchPanel({
  onSelectCard,
  selectedId: selectedIdProp,
  wrapDnd = true,
  columns = 2,
}: {
  onSelectCard?: (hit: CardHit) => void;
  selectedId?: string | null;
  wrapDnd?: boolean;
  columns?: number;
}) {
  const [catalog, setCatalog] = useState<LoadedCatalog | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [query, setQuery] = useState<SearchQuery>({});
  const [ownSelected, setOwnSelected] = useState<string | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [tab, setTab] = useState<'search' | 'vibe'>('search');
  const [showFilters, setShowFilters] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const selectedId = selectedIdProp !== undefined ? selectedIdProp : ownSelected;

  // The catalog is an external system: subscribe to it and set state from the
  // settled promise, never synchronously from the effect body.
  useEffect(() => {
    let alive = true;
    ensureCatalog().then(
      (loaded) => {
        if (!alive) return;
        setCatalog(loaded);
        setStatus('ready');
        setError(null);
      },
      (err: unknown) => {
        if (!alive) return;
        setStatus('error');
        setError(err instanceof Error ? err.message : 'Could not open the card box.');
      },
    );
    return () => {
      alive = false;
    };
  }, [attempt]);

  const load = useCallback(() => {
    setStatus('loading');
    setAttempt((a) => a + 1);
  }, []);

  const facets = useMemo(
    () => (catalog ? uniqueFacets(catalog.index, catalog.dexSpecies) : null),
    [catalog],
  );

  const hits: CardHit[] = useMemo(() => {
    if (!catalog) return [];
    return searchCatalog(catalog, { ...query, text }, 240);
  }, [catalog, query, text]);

  const filterCount = activeFilterCount(query);
  const clearAll = () => {
    setQuery({});
    setText('');
  };

  const results = (
    <>
      {status === 'error' ? (
        <div className="gb-panel__body">
          <p className="text-sm text-red-ink">{error}</p>
          <button type="button" className="gb-btn mt-3" onClick={load}>
            Try again
          </button>
        </div>
      ) : null}

      {status === 'loading' ? (
        <div className="gb-panel__body">
          <div className="grid grid-cols-2 gap-2" aria-hidden="true">
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className="aspect-[5/7] animate-pulse rounded-sm bg-paper-sunk" />
            ))}
          </div>
          <p className="gb-label mt-3">Opening the card box…</p>
        </div>
      ) : null}

      {status === 'ready' && hits.length === 0 ? (
        <div className="gb-panel__body">
          <p className="text-sm text-ink-soft">
            {text || filterCount > 0
              ? 'Nothing matches that yet. Try a shorter name, or clear a filter.'
              : 'Type a name to start, or open the filters.'}
          </p>
          {text || filterCount > 0 ? (
            <button type="button" className="gb-btn mt-3" onClick={clearAll}>
              Clear search and filters
            </button>
          ) : null}
        </div>
      ) : null}

      {hits.length > 0 ? (
        <VirtualGrid
          items={hits}
          columnCount={columns}
          rowHeight={columns > 2 ? 240 : 212}
          height={320}
          fill
          getKey={(hit) => hit.id}
          renderItem={(hit) => (
            <CardThumb
              hit={hit}
              selected={selectedId === hit.id}
              onSelect={() => {
                setOwnSelected(hit.id);
                onSelectCard?.(hit);
              }}
            />
          )}
        />
      ) : null}
    </>
  );

  const body = (
    <section className="flex h-full min-h-0 flex-col">
      <div className="gb-tabs" role="tablist" aria-label="Card box">
        <button
          type="button"
          role="tab"
          className="gb-tab"
          aria-selected={tab === 'search'}
          onClick={() => setTab('search')}
        >
          Search
        </button>
        <button
          type="button"
          role="tab"
          className="gb-tab"
          aria-selected={tab === 'vibe'}
          onClick={() => setTab('vibe')}
        >
          By vibe
        </button>
        <span className="gb-label ml-auto self-center pr-2">
          {status === 'ready' ? `${hits.length} shown` : '—'}
        </span>
      </div>

      {tab === 'search' ? (
        <>
          <div className="flex-none border-b border-rule p-3">
            <label className="grid gap-1">
              <span className="gb-label">Card name or artist</span>
              <input
                id="card-search-text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Pikachu, Ken Sugimori…"
                className="gb-input"
                aria-label="Card name or artist"
                autoComplete="off"
              />
            </label>
            <div className="mt-2 flex items-center gap-2">
              <button
                type="button"
                className="gb-btn gb-btn--quiet !min-h-8 !px-2 text-mini"
                aria-expanded={showFilters}
                onClick={() => setShowFilters((s) => !s)}
              >
                <span aria-hidden="true">{showFilters ? '▾' : '▸'}</span>
                More filters
                {filterCount > 0 ? (
                  <span className="gb-num ml-1 rounded-xs bg-ink px-1 text-micro text-paper-raised">
                    {filterCount}
                  </span>
                ) : null}
              </button>
              {filterCount > 0 || text ? (
                <button
                  type="button"
                  className="gb-btn gb-btn--quiet !min-h-8 !px-2 text-mini"
                  onClick={clearAll}
                >
                  Clear
                </button>
              ) : null}
            </div>

            {showFilters ? (
              <div className="mt-3 grid gap-2.5 border-t border-rule pt-3">
                <label className="grid gap-1">
                  <span className="gb-label">Set</span>
                  <select
                    className="gb-select"
                    value={query.setId ?? ''}
                    onChange={(e) =>
                      setQuery((q) => ({ ...q, setId: e.target.value || undefined }))
                    }
                  >
                    <option value="">Any set</option>
                    {catalog?.sets.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1">
                  <span className="gb-label">Pokémon</span>
                  <select
                    className="gb-select"
                    value={query.speciesDex ?? ''}
                    onChange={(e) =>
                      setQuery((q) => ({
                        ...q,
                        speciesDex: e.target.value ? Number(e.target.value) : undefined,
                      }))
                    }
                  >
                    <option value="">Any Pokémon</option>
                    {facets?.species.map((s) => (
                      <option key={s.dex} value={s.dex}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="grid gap-1">
                  <span className="gb-label">Artist</span>
                  <select
                    className="gb-select"
                    value={query.artist ?? ''}
                    onChange={(e) =>
                      setQuery((q) => ({ ...q, artist: e.target.value || undefined }))
                    }
                  >
                    <option value="">Any artist</option>
                    {facets?.artist.map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="grid gap-1">
                    <span className="gb-label">Rarity</span>
                    <select
                      className="gb-select"
                      value={query.rarity ?? ''}
                      onChange={(e) =>
                        setQuery((q) => ({ ...q, rarity: e.target.value || undefined }))
                      }
                    >
                      <option value="">Any</option>
                      {facets?.rarity.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="grid gap-1">
                    <span className="gb-label">Era</span>
                    <select
                      className="gb-select"
                      value={query.era ?? ''}
                      onChange={(e) =>
                        setQuery((q) => ({ ...q, era: e.target.value || undefined }))
                      }
                    >
                      <option value="">Any</option>
                      {facets?.era.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div>
                  <p className="gb-label mb-1.5">Energy type</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(facets?.type ?? ['Grass', 'Fire', 'Water', 'Lightning', 'Psychic']).map(
                      (type) => (
                        <button
                          key={type}
                          type="button"
                          className="gb-chip"
                          aria-pressed={query.type === type}
                          onClick={() =>
                            setQuery((q) => ({ ...q, type: q.type === type ? undefined : type }))
                          }
                        >
                          {type}
                        </button>
                      ),
                    )}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
          <div className="flex min-h-0 flex-1 flex-col">{results}</div>
        </>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="gb-panel__body">
            <p className="gb-label mb-2">Dominant colour</p>
            <div className="flex flex-wrap gap-1.5">
              {SWATCHES.map((swatch) => (
                <button
                  key={swatch.name}
                  type="button"
                  className="gb-chip"
                  aria-pressed={query.hueDeg === swatch.hue}
                  onClick={() => {
                    setTab('search');
                    setText('');
                    setQuery((q) => ({
                      ...q,
                      hueDeg: q.hueDeg === swatch.hue ? undefined : swatch.hue,
                    }));
                  }}
                >
                  <span
                    aria-hidden="true"
                    className="inline-block h-3 w-3 rounded-xs border border-ink"
                    style={{ backgroundColor: swatch.color }}
                  />
                  {swatch.name}
                </button>
              ))}
            </div>
            <p className="mt-2 text-micro text-ink-faint">
              Colours come from art extracted for each card, not from its energy type.
            </p>

            <p className="gb-label mt-4 mb-2">Starting points</p>
            <ul className="grid gap-1.5">
              {themeCollections.collections.map((collection) => (
                <li key={collection.id}>
                  <button
                    type="button"
                    className="gb-row w-full border border-rule"
                    onClick={() => {
                      setTab('search');
                      setQuery({});
                      setText(collection.searchText);
                    }}
                  >
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold">{collection.name}</span>
                      <span className="block text-micro text-ink-soft">
                        {collection.description}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </section>
  );

  return wrapDnd ? <DndContext>{body}</DndContext> : body;
}
