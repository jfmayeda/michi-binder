'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { SearchPanel } from '@/components/search/SearchPanel';
import {
  placeIntoCell,
  placementAt,
  placementFromCard,
  removePlacement,
} from '@/domain/slots';
import { LAYOUTS } from '@/domain/layouts';
import type { CardHit } from '@/search';
import '@/components/binder/binder.css';
import { SlotGrid } from '@/components/editor/SlotGrid';
import {
  persistRenderMode,
  readStoredRenderMode,
  type RenderMode,
} from '@/components/binder/renderMode';
import type { Binder, Page, Placement } from '@/domain/types';
import { useStudioStore } from '@/state/studioStore';

function resequence(pages: Page[]): Page[] {
  return pages.map((p, i) => ({ ...p, position: i + 1 }));
}

function parseCellId(id: string): { pageId: string; row: number; col: number } | null {
  const last = id.lastIndexOf(':');
  const mid = id.lastIndexOf(':', last - 1);
  if (last < 0 || mid < 0) return null;
  const pageId = id.slice(0, mid);
  const row = Number(id.slice(mid + 1, last));
  const col = Number(id.slice(last + 1));
  if (!pageId || Number.isNaN(row) || Number.isNaN(col)) return null;
  return { pageId, row, col };
}

type Pending =
  | { source: 'search'; card: CardHit }
  | { source: 'slot'; placement: Placement };

export function Studio() {
  const { binderId } = useParams<{ binderId: string }>();
  const router = useRouter();
  const { binders, loaded, refresh, save } = useStudioStore();
  const binder = binders.find((b) => b.id === binderId);
  const [spread, setSpread] = useState(0);
  const [pageIndex, setPageIndex] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState<Pending | null>(null);
  const [mode, setMode] = useState<RenderMode>('2d');
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  useEffect(() => {
    void refresh();
    setMode(readStoredRenderMode() ?? '2d');
  }, [refresh]);

  const sortedPages = useMemo(
    () => (binder ? binder.pages.slice().sort((a, b) => a.position - b.position) : []),
    [binder],
  );

  const spreads = useMemo(() => {
    if (!binder) return [0];
    const maxPos = Math.max(...binder.pages.map((p) => p.position), 1);
    return Array.from({ length: 1 + Math.ceil(Math.max(0, maxPos - 1) / 2) }, (_, i) => i);
  }, [binder]);

  if (!loaded) return <p className="p-8 text-ink-soft">Opening the binder…</p>;
  if (!binder) {
    return (
      <main className="p-8">
        <p className="text-ink-soft">That binder isn’t on this shelf.</p>
        <button type="button" className="mt-3 text-accent" onClick={() => router.push('/shelf')}>
          Back to the shelf
        </button>
      </main>
    );
  }

  const pageByPos = (pos: number) => binder.pages.find((p) => p.position === pos);
  const leftPos = spread === 0 ? null : spread * 2;
  const rightPos = spread === 0 ? 1 : spread * 2 + 1;
  const leftPage = leftPos ? pageByPos(leftPos) : undefined;
  const rightPage = pageByPos(rightPos);
  const singlePage = sortedPages[Math.min(pageIndex, Math.max(0, sortedPages.length - 1))];

  const toggle = (page: Page, row: number, col: number) => {
    const key = `${page.id}:${row}:${col}`;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const selectedFor = (page: Page) => {
    const keys = new Set<string>();
    selected.forEach((k) => {
      if (k.startsWith(`${page.id}:`)) keys.add(k.slice(page.id.length + 1));
    });
    return keys;
  };

  const persist = (next: Binder) => save(next);

  const incomingFromPending = (): Placement | null => {
    if (!pending) return null;
    if (pending.source === 'search') {
      return placementFromCard(crypto.randomUUID(), pending.card.id);
    }
    return pending.placement;
  };

  const placeAt = (pageId: string, row: number, col: number, incoming: Placement) => {
    persist(placeIntoCell(binder, pageId, row, col, incoming));
    setPending(null);
  };

  const onCellClick = (page: Page, row: number, col: number) => {
    const incoming = incomingFromPending();
    if (incoming) {
      placeAt(page.id, row, col, incoming);
      return;
    }
    const existing = placementAt(binder, page.id, row, col);
    if (existing) {
      setPending({ source: 'slot', placement: existing });
      return;
    }
    toggle(page, row, col);
  };

  const onDragEnd = (event: DragEndEvent) => {
    const overId = event.over?.id;
    if (typeof overId !== 'string') return;
    const dest = parseCellId(overId);
    if (!dest) return;
    const data = event.active.data.current as
      | { kind: 'search'; card: CardHit }
      | { kind: 'placement'; placement: Placement }
      | undefined;
    if (!data) return;
    if (data.kind === 'search') {
      placeAt(dest.pageId, dest.row, dest.col, placementFromCard(crypto.randomUUID(), data.card.id));
      return;
    }
    placeAt(dest.pageId, dest.row, dest.col, data.placement);
  };

  const leaf = (page: Page | undefined, empty: string) =>
    page ? (
      <SlotGrid
        binder={binder}
        page={page}
        selected={selectedFor(page)}
        onToggle={(r, c) => toggle(page, r, c)}
        onPlace={(r, c) => onCellClick(page, r, c)}
        onRemove={(id) => persist(removePlacement(binder, id))}
      />
    ) : (
      <p className="p-6 text-ink-soft">{empty}</p>
    );

  const pendingLabel =
    pending?.source === 'search'
      ? pending.card.name
      : pending?.source === 'slot'
        ? pending.placement.cardId ?? 'that pocket'
        : null;

  return (
    <DndContext sensors={sensors} onDragEnd={onDragEnd}>
      <main className="flex min-h-dvh bg-paper-deep texture-linen">
        <aside className="flex w-80 shrink-0 flex-col border-r border-rule bg-paper">
          {pendingLabel ? (
            <p className="border-b border-rule bg-accent-soft px-3 py-2 text-xs text-accent-ink">
              Click a pocket for {pendingLabel}{' '}
              <button type="button" className="underline" onClick={() => setPending(null)}>
                cancel
              </button>
            </p>
          ) : (
            <p className="border-b border-rule px-3 py-2 text-xs text-ink-faint">
              Click a card then a pocket, or drag it in. Occupied pockets swap.
            </p>
          )}
          <div className="min-h-0 flex-1 overflow-y-auto">
            <SearchPanel wrapDnd={false} compact onSelectCard={(card) => setPending({ source: 'search', card })} />
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div>
              <button type="button" className="text-sm text-accent" onClick={() => router.push('/shelf')}>
                ← Shelf
              </button>
              <h1 className="font-display text-2xl text-ink">{binder.title}</h1>
              <p className="text-xs text-ink-faint">
                {binder.layoutId} · {binder.pageMode} · {LAYOUTS[binder.layoutId].rows}×
                {LAYOUTS[binder.layoutId].cols}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                className="rounded-md bg-paper-sun px-3 py-1.5 text-sm shadow-stamp"
                onClick={() => {
                  const next = mode === '3d' ? '2d' : '3d';
                  setMode(next);
                  persistRenderMode(next);
                }}
              >
                {mode === '3d' ? '3D' : '2D'}
              </button>
              <button
                type="button"
                className="rounded-md bg-paper-sun px-3 py-1.5 text-sm shadow-stamp"
                onClick={() =>
                  persist({
                    ...binder,
                    pages: [
                      ...binder.pages,
                      {
                        id: crypto.randomUUID(),
                        binderId: binder.id,
                        position: binder.pages.length + 1,
                      },
                    ],
                  })
                }
              >
                Add page
              </button>
            </div>
          </header>

          <section className="flex flex-1 flex-col items-center gap-4 overflow-x-auto px-4 pb-6">
            <div className={mode === '3d' ? 'binder-stage' : undefined}>
              {binder.pageMode === 'single' ? (
                <div className={mode === '3d' ? 'binder-book binder-book--single' : 'binder-2d binder-2d--single'}>
                  <div className="binder-leaf-slot" style={{ gridColumn: '1 / -1' }}>
                    <div className="binder-static right">{leaf(singlePage, 'Empty binder')}</div>
                  </div>
                </div>
              ) : (
                <div className={mode === '3d' ? 'binder-book' : 'binder-2d'}>
                  <div className="binder-leaf-slot">
                    <div className="binder-static left">{leaf(leftPage, 'Inside cover')}</div>
                  </div>
                  <div className="binder-spine" aria-hidden="true">
                    <div className="binder-rings">
                      <span />
                      <span />
                      <span />
                    </div>
                  </div>
                  <div className="binder-leaf-slot">
                    <div className="binder-static right">{leaf(rightPage, 'Back cover')}</div>
                  </div>
                </div>
              )}
            </div>

            {binder.pageMode === 'single' ? (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className="rounded-md bg-paper-sun px-3 py-1 shadow-stamp"
                  disabled={pageIndex <= 0}
                  onClick={() => setPageIndex((i) => Math.max(0, i - 1))}
                >
                  Previous
                </button>
                <span className="text-sm text-ink-soft">
                  Page {Math.min(pageIndex + 1, sortedPages.length)} of {sortedPages.length}
                </span>
                <button
                  type="button"
                  className="rounded-md bg-paper-sun px-3 py-1 shadow-stamp"
                  disabled={pageIndex >= sortedPages.length - 1}
                  onClick={() => setPageIndex((i) => Math.min(sortedPages.length - 1, i + 1))}
                >
                  Next
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className="rounded-md bg-paper-sun px-3 py-1 shadow-stamp"
                  disabled={spread <= 0}
                  onClick={() => setSpread((s) => Math.max(0, s - 1))}
                >
                  Previous
                </button>
                <span className="text-sm text-ink-soft">
                  Spread {spread + 1} of {spreads.length}
                </span>
                <button
                  type="button"
                  className="rounded-md bg-paper-sun px-3 py-1 shadow-stamp"
                  disabled={spread >= spreads.length - 1}
                  onClick={() => setSpread((s) => Math.min(spreads.length - 1, s + 1))}
                >
                  Next
                </button>
              </div>
            )}

            <ol className="flex max-w-full gap-2 overflow-x-auto px-2">
              {sortedPages.map((page) => (
                <li key={page.id} className="flex items-center">
                  <button
                    type="button"
                    className="rounded-md border border-rule bg-paper-sun px-2 py-1 text-xs shadow-stamp"
                    onClick={() => {
                      if (binder.pageMode === 'single') setPageIndex(sortedPages.findIndex((p) => p.id === page.id));
                      else setSpread(page.position === 1 ? 0 : Math.floor(page.position / 2));
                    }}
                  >
                    p{page.position}
                  </button>
                  <button
                    type="button"
                    className="ml-1 text-xs text-ink-faint"
                    onClick={() => {
                      if (binder.pages.length <= 1) return;
                      persist({
                        ...binder,
                        pages: resequence(
                          binder.pages
                            .filter((p) => p.id !== page.id)
                            .sort((a, b) => a.position - b.position),
                        ),
                        merges: binder.merges.filter((m) => m.pageId !== page.id),
                        placements: binder.placements.filter((pl) => pl.pageId !== page.id),
                      });
                    }}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ol>
            <button
              type="button"
              className="text-xs text-accent"
              onClick={() => {
                const sorted = binder.pages.slice().sort((a, b) => a.position - b.position);
                if (sorted.length < 2) return;
                const a = sorted[sorted.length - 2];
                const b = sorted[sorted.length - 1];
                persist({
                  ...binder,
                  pages: resequence(
                    sorted.map((p) => {
                      if (p.id === a.id) return { ...p, position: b.position };
                      if (p.id === b.id) return { ...p, position: a.position };
                      return p;
                    }),
                  ),
                });
              }}
            >
              Swap last two pages
            </button>
          </section>
        </div>
      </main>
    </DndContext>
  );
}
