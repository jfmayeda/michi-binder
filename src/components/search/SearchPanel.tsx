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

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1 text-xs text-ink-soft">
      <span className="font-display tracking-wide uppercase">{label}</span>
      {children}
    </label>
  );
}

const selectClass =
  'rounded-md border border-rule bg-paper-sun px-2 py-1.5 text-sm text-ink shadow-stamp outline-none focus:border-accent';

export function SearchPanel() {
  const [catalog, setCatalog] = useState<LoadedCatalog | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [query, setQuery] = useState<SearchQuery>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready'>('idle');

  const load = useCallback(async () => {
    if (catalog) return catalog;
    setStatus('loading');
    const loaded = await ensureCatalog();
    setCatalog(loaded);
    setStatus('ready');
    return loaded;
  }, [catalog]);

  useEffect(() => {
    const onFirst = () => {
      void load().catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Could not open the card box.');
        setStatus('idle');
      });
    };
    const input = document.getElementById('card-search-text');
    input?.addEventListener('focus', onFirst, { once: true });
    return () => input?.removeEventListener('focus', onFirst);
  }, [load]);

  const facets = useMemo(
    () => (catalog ? uniqueFacets(catalog.index, catalog.dexSpecies) : null),
    [catalog],
  );

  const hits: CardHit[] = useMemo(() => {
    if (!catalog) return [];
    return searchCatalog(catalog, { ...query, text }, 240);
  }, [catalog, query, text]);

  const beginSearch = () => {
    void load().catch((err: unknown) => {
      setError(err instanceof Error ? err.message : 'Could not open the card box.');
    });
  };

  return (
    <DndContext>
      <section className="flex h-full min-h-0 flex-col gap-4 bg-paper p-4 texture-paper">
        <header>
          <p className="font-display text-xs tracking-[0.2em] text-accent uppercase">
            Card box
          </p>
          <h2 className="font-display text-2xl text-ink">Search the catalog</h2>
        </header>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Name or artist">
            <input
              id="card-search-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onFocus={beginSearch}
              placeholder="Pikachu, Ken Sugimori…"
              className={`${selectClass} w-full`}
            />
          </Field>
          <Field label="Set">
            <select
              className={selectClass}
              value={query.setId ?? ''}
              onChange={(e) => setQuery((q) => ({ ...q, setId: e.target.value || undefined }))}
              onFocus={beginSearch}
            >
              <option value="">Any set</option>
              {catalog?.sets.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Species">
            <select
              className={selectClass}
              value={query.speciesDex ?? ''}
              onChange={(e) =>
                setQuery((q) => ({
                  ...q,
                  speciesDex: e.target.value ? Number(e.target.value) : undefined,
                }))
              }
              onFocus={beginSearch}
            >
              <option value="">Any species</option>
              {facets?.species.map((s) => (
                <option key={s.dex} value={s.dex}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Artist">
            <select
              className={selectClass}
              value={query.artist ?? ''}
              onChange={(e) => setQuery((q) => ({ ...q, artist: e.target.value || undefined }))}
              onFocus={beginSearch}
            >
              <option value="">Any artist</option>
              {facets?.artist.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="flex flex-col gap-2">
          <p className="font-display text-xs tracking-wide text-ink-soft uppercase">Type</p>
          <div className="flex flex-wrap gap-1.5">
            {(facets?.type ?? ['Grass', 'Fire', 'Water', 'Lightning', 'Psychic', 'Fighting']).map(
              (type) => {
                const on = query.type === type;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => {
                      beginSearch();
                      setQuery((q) => ({ ...q, type: on ? undefined : type }));
                    }}
                    className={`rounded-md px-2.5 py-1 text-xs shadow-stamp ${
                      on ? 'bg-accent text-paper-sun' : 'bg-paper-sun text-ink border border-rule'
                    }`}
                  >
                    {type}
                  </button>
                );
              },
            )}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Rarity">
            <select
              className={selectClass}
              value={query.rarity ?? ''}
              onChange={(e) => setQuery((q) => ({ ...q, rarity: e.target.value || undefined }))}
              onFocus={beginSearch}
            >
              <option value="">Any rarity</option>
              {facets?.rarity.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Era">
            <select
              className={selectClass}
              value={query.era ?? ''}
              onChange={(e) => setQuery((q) => ({ ...q, era: e.target.value || undefined }))}
              onFocus={beginSearch}
            >
              <option value="">Any era</option>
              {facets?.era.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </Field>
        </div>

        {error ? <p className="text-sm text-accent-ink">{error}</p> : null}

        {status === 'loading' ? (
          <p className="text-ink-soft">Shuffling the card box…</p>
        ) : null}

        {status === 'ready' && hits.length === 0 ? (
          <p className="text-ink-soft">
            Nothing in the box matches that vibe yet. Try a broader name, or lift a filter.
          </p>
        ) : null}

        {hits.length > 0 ? (
          <VirtualGrid
            items={hits}
            columnCount={4}
            rowHeight={210}
            height={520}
            getKey={(hit) => hit.id}
            renderItem={(hit) => (
              <CardThumb
                hit={hit}
                selected={selectedId === hit.id}
                onSelect={() => setSelectedId(hit.id)}
              />
            )}
          />
        ) : null}
      </section>
    </DndContext>
  );
}
