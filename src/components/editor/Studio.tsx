'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import type { PointerEvent as ReactPointerEvent } from 'react';
import {
  addMerge,
  adoptPlacementsIntoMerge,
  cellsForMerge,
  clearPage,
  deletePage,
  placeIntoCell,
  placementAt,
  placementFromCard,
  placementFromPack,
  placementFromUpload,
  proposalFromSelection,
  removePlacement,
  setOwnership,
  slotSize,
  switchPageMode,
  unmerge,
} from '@/domain/slots';
import { LAYOUTS } from '@/domain/layouts';
import { markBinderInteractive, type CardHit } from '@/search';
import type { Binder, Merge, Page, Placement, Transform } from '@/domain/types';
import type { MediaBlob } from '@/persistence/types';
import { useStudioStore } from '@/state/studioStore';
import { useAuthSession } from '@/components/auth/useAuthSession';
import { anonymousMayAddPage } from '@/persistence/playgroundBinder';
import { SearchPanel } from '@/components/search/SearchPanel';
import { MediaLibrary, type PackItem } from '@/components/editor/MediaLibrary';
import { SlotGrid } from '@/components/editor/SlotGrid';
import { CropEditor } from '@/components/editor/CropEditor';
import { PrintDialog, type ArtPocket } from '@/components/editor/PrintDialog';
import { Inspector, type SelectionInfo } from '@/components/editor/Inspector';
import { SavedStamp } from '@/components/editor/SavedStamp';
import { useConfirmWithUndo } from '@/components/editor/ConfirmWithUndoToast';
import { useBinderHistory } from '@/components/editor/useBinderHistory';
import { useCardNames } from '@/components/editor/useCardNames';
import { BinderFrame } from '@/components/binder/BinderFrame';
import { Panel } from '@/components/ui/Panel';
import { PromptStrip } from '@/components/ui/PromptStrip';
import { SavePrompt } from '@/components/auth/SavePrompt';

/** Plain-language versions of the domain's merge rejection codes. */
const MERGE_PROBLEMS: Record<string, string> = {
  '1x1': 'Pick at least two pockets to join them.',
  empty: 'Pick at least two pockets to join them.',
  'single-mode': 'A pocket can only cross the middle when the binder shows two pages at once.',
  'not-facing': 'Those pages do not face each other.',
  'not-contiguous-gutter': 'A pocket that crosses the middle has to touch both pages.',
  'too-many-pages': 'A pocket can cover one page, or one facing pair — not more.',
  overlap: 'One of those pockets is already part of another merged pocket.',
  bounds: 'That block does not fit on the page.',
  'unknown page': 'Those pockets are not on this binder.',
};

/**
 * Dragging a card moves it; dragging across pockets selects a block. Those two
 * collide on a pocket that already has a card, because dnd-kit captures the
 * pointer on pointerdown and no other pocket then sees the drag. Holding shift
 * opts out of dragging entirely, so selecting a block works from any pocket,
 * full or empty.
 */
class SelectAwarePointerSensor extends PointerSensor {
  static activators = [
    {
      eventName: 'onPointerDown' as const,
      handler: ({ nativeEvent }: ReactPointerEvent) => !nativeEvent.shiftKey,
    },
  ];
}

type Pending =
  | { source: 'card'; card: CardHit }
  | { source: 'slot'; placement: Placement; label: string }
  | { source: 'art'; asset: MediaBlob }
  | { source: 'pack'; item: PackItem };

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

function cellsFromSelected(selected: Set<string>) {
  return [...selected]
    .map(parseCellId)
    .filter((c): c is { pageId: string; row: number; col: number } => c != null);
}

export function Studio() {
  const { binderId } = useParams<{ binderId: string }>();
  const router = useRouter();
  const { binders, loaded, refresh, save, retrySave, saveStatus, media, removeMedia, restoreMedia } =
    useStudioStore();
  const binder = binders.find((b) => b.id === binderId);
  const session = useAuthSession();

  const [spread, setSpread] = useState(0);
  const [pageIndex, setPageIndex] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState<Pending | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [tool, setTool] = useState<'cards' | 'art'>('cards');
  const [printOpen, setPrintOpen] = useState(false);
  const [savePrompt, setSavePrompt] = useState(false);
  const [dragging, setDragging] = useState<string | null>(null);
  const [crop, setCrop] = useState<{
    pageId: string;
    row: number;
    col: number;
    widthPx: number;
    heightPx: number;
    colSpan: number;
    rowSpan: number;
    draft: Placement;
    imageUrl: string;
    revoke?: boolean;
  } | null>(null);

  const marqueeStart = useRef<{ pageId: string; row: number; col: number } | null>(null);
  const marqueeMoved = useRef(false);
  const lastAnchor = useRef<{ pageId: string; row: number; col: number } | null>(null);

  const { ask, host } = useConfirmWithUndo<Binder>();
  const { apply, undo, reset, canUndo, undoLabel } = useBinderHistory(save);
  const sensors = useSensors(
    useSensor(SelectAwarePointerSensor, { activationConstraint: { distance: 8 } }),
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (binder) reset(binder.id);
  }, [binder, reset]);

  // Prefetch the card catalog once the binder is on screen, so the first
  // search is instant without the landing page ever touching it.
  useEffect(() => {
    if (loaded) markBinderInteractive();
  }, [loaded]);

  useEffect(() => {
    const gone = () => useStudioStore.setState({ saveStatus: 'offline' });
    const back = () => void retrySave();
    window.addEventListener('offline', gone);
    window.addEventListener('online', back);
    return () => {
      window.removeEventListener('offline', gone);
      window.removeEventListener('online', back);
    };
  }, [retrySave]);

  useEffect(() => {
    const end = () => {
      marqueeStart.current = null;
    };
    window.addEventListener('pointerup', end);
    return () => window.removeEventListener('pointerup', end);
  }, []);

  const sortedPages = useMemo(
    () => (binder ? binder.pages.slice().sort((a, b) => a.position - b.position) : []),
    [binder],
  );

  const spreadCount = useMemo(() => {
    if (!binder) return 1;
    const maxPos = Math.max(...binder.pages.map((p) => p.position), 1);
    return 1 + Math.ceil(Math.max(0, maxPos - 1) / 2);
  }, [binder]);

  const placedCardIds = useMemo(
    () =>
      binder
        ? [...new Set(binder.placements.map((p) => p.cardId).filter((id): id is string => !!id))]
        : [],
    [binder],
  );
  const resolvedNames = useCardNames(placedCardIds);
  const cardNames = useMemo(() => {
    const names: Record<string, string> = { ...resolvedNames };
    if (pending?.source === 'card') names[pending.card.id] = pending.card.name;
    return names;
  }, [pending, resolvedNames]);

  const artUrls = useMemo(() => {
    const map: Record<string, string> = {};
    for (const item of media) {
      map[item.id] = URL.createObjectURL(new Blob([item.bytes], { type: item.mime }));
    }
    return map;
  }, [media]);

  useEffect(
    () => () => Object.values(artUrls).forEach((u) => URL.revokeObjectURL(u)),
    [artUrls],
  );

  const doUndo = useCallback(() => {
    const label = undo();
    if (label) {
      setSelected(new Set());
      setPending(null);
      setProblem(null);
    }
  }, [undo]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z' && !event.shiftKey) {
        event.preventDefault();
        doUndo();
        return;
      }
      if (event.key === 'Escape') {
        setPending(null);
        setProblem(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [doUndo]);

  if (!loaded) {
    return (
      <main className="grid min-h-dvh place-items-center p-8">
        <p className="gb-label">Opening the binder…</p>
      </main>
    );
  }

  if (!binder) {
    return (
      <main className="mx-auto grid min-h-dvh max-w-md place-items-center p-8">
        <Panel title="Not on this shelf" stepped>
          <p className="text-sm text-ink-soft">
            There is no binder saved here under that name. It may have been on another device, or
            in a browser whose data was cleared.
          </p>
          <button type="button" className="gb-btn gb-btn--primary mt-3" onClick={() => router.push('/')}>
            Back to the start
          </button>
        </Panel>
      </main>
    );
  }

  const layout = LAYOUTS[binder.layoutId];
  const pageByPos = (pos: number) => binder.pages.find((p) => p.position === pos);
  const leftPage = spread === 0 ? undefined : pageByPos(spread * 2);
  const rightPage = pageByPos(spread === 0 ? 1 : spread * 2 + 1);
  const singlePage = sortedPages[Math.min(pageIndex, Math.max(0, sortedPages.length - 1))];
  const currentPages =
    binder.pageMode === 'single'
      ? [singlePage].filter((p): p is Page => Boolean(p))
      : [leftPage, rightPage].filter((p): p is Page => Boolean(p));

  const commit = (next: Binder, label: string) => apply(binder, next, label);

  const selectedFor = (page: Page) => {
    const keys = new Set<string>();
    selected.forEach((k) => {
      if (k.startsWith(`${page.id}:`)) keys.add(k.slice(page.id.length + 1));
    });
    return keys;
  };

  const paintRect = (
    a: { pageId: string; row: number; col: number },
    b: { pageId: string; row: number; col: number },
  ) => {
    const proposal = proposalFromSelection(binder, [a, b]);
    if ('error' in proposal) {
      setSelected(new Set([`${b.pageId}:${b.row}:${b.col}`]));
      return;
    }
    const draft: Merge = {
      id: 'draft',
      pageId: proposal.pageId,
      row: proposal.row,
      col: proposal.col,
      rowSpan: proposal.rowSpan,
      colSpan: proposal.colSpan,
      spansGutter: Boolean(proposal.spansGutter),
    };
    const cells = cellsForMerge(binder, draft);
    if ('error' in cells) return;
    setSelected(new Set(cells.map((c) => `${c.pageId}:${c.row}:${c.col}`)));
  };

  const openCrop = (
    pageId: string,
    row: number,
    col: number,
    draft: Placement,
    imageUrl: string,
    widthPx: number,
    heightPx: number,
    revoke = false,
  ) => {
    const size = slotSize(binder, pageId, row, col);
    setCrop({
      pageId,
      row,
      col,
      widthPx,
      heightPx,
      colSpan: size.colSpan,
      rowSpan: size.rowSpan,
      draft,
      imageUrl,
      revoke,
    });
    setPending(null);
  };

  const incomingFromPending = (): Placement | null => {
    if (!pending) return null;
    if (pending.source === 'card') return placementFromCard(crypto.randomUUID(), pending.card.id);
    if (pending.source === 'art') return placementFromUpload(crypto.randomUUID(), pending.asset.id);
    if (pending.source === 'pack') return placementFromPack(crypto.randomUUID(), pending.item.id);
    return pending.placement;
  };

  const placeAt = (pageId: string, row: number, col: number, incoming: Placement, what: string) => {
    if (incoming.kind === 'art' && incoming.assetKind === 'upload' && incoming.uploadAssetId) {
      const asset = media.find((m) => m.id === incoming.uploadAssetId);
      if (asset) {
        openCrop(
          pageId,
          row,
          col,
          incoming,
          URL.createObjectURL(new Blob([asset.bytes], { type: asset.mime })),
          asset.widthPx,
          asset.heightPx,
          true,
        );
        return;
      }
    }
    if (incoming.kind === 'art' && incoming.packItemId && pending?.source === 'pack') {
      openCrop(pageId, row, col, incoming, pending.item.file, 800, 1086);
      return;
    }

    const existing = placementAt(binder, pageId, row, col);
    commit(
      placeIntoCell(binder, pageId, row, col, incoming),
      existing && existing.id !== incoming.id ? `replacing a card with ${what}` : `placing ${what}`,
    );
    setPending(null);
    setProblem(null);
    setSelected(new Set([`${pageId}:${row}:${col}`]));
  };

  const onPocketClick = (page: Page, row: number, col: number) => {
    const incoming = incomingFromPending();
    if (incoming) {
      const what =
        pending?.source === 'card'
          ? pending.card.name
          : pending?.source === 'art'
            ? pending.asset.fileName
            : pending?.source === 'pack'
              ? pending.item.title
              : 'that card';
      placeAt(page.id, row, col, incoming, what);
      return;
    }
    if (marqueeMoved.current) return;
    setSelected(new Set([`${page.id}:${row}:${col}`]));
    setProblem(null);
  };

  const onPocketPointerDown = (page: Page, row: number, col: number, event: PointerEvent) => {
    if (pending) return;
    const cell = { pageId: page.id, row, col };
    marqueeMoved.current = false;
    if (event.shiftKey && lastAnchor.current) {
      // Shift-click extends from the last anchor, and keeps that anchor so the
      // same gesture can carry on into a drag.
      paintRect(lastAnchor.current, cell);
      marqueeStart.current = lastAnchor.current;
      marqueeMoved.current = true;
      return;
    }
    lastAnchor.current = cell;
    marqueeStart.current = cell;
  };

  const onPocketPointerEnter = (page: Page, row: number, col: number, event: PointerEvent) => {
    if (pending || event.buttons !== 1 || !marqueeStart.current) return;
    marqueeMoved.current = true;
    paintRect(marqueeStart.current, { pageId: page.id, row, col });
  };

  const proposal = proposalFromSelection(binder, cellsFromSelected(selected));
  const mergeProblem =
    selected.size > 1 && 'error' in proposal
      ? (MERGE_PROBLEMS[proposal.error] ?? 'Those pockets cannot be joined.')
      : null;
  const mergeShape =
    selected.size > 1 && !('error' in proposal)
      ? { cols: proposal.colSpan, rows: proposal.rowSpan }
      : null;

  const commitMerge = () => {
    const p = proposalFromSelection(binder, cellsFromSelected(selected));
    if ('error' in p) {
      setProblem(MERGE_PROBLEMS[p.error] ?? 'Those pockets cannot be joined.');
      return;
    }
    try {
      const id = crypto.randomUUID();
      commit(
        adoptPlacementsIntoMerge(addMerge(binder, p, id), id),
        `joining ${p.colSpan * p.rowSpan} pockets`,
      );
      setSelected(new Set());
      setProblem(null);
    } catch (err) {
      const code = err instanceof Error ? err.message : 'merge';
      setProblem(MERGE_PROBLEMS[code] ?? 'Those pockets cannot be joined.');
    }
  };

  const requestUnmerge = (mergeId: string) => {
    const result = unmerge(binder, mergeId);
    if (!result.needsConfirm) {
      commit(result.binder, 'splitting a pocket');
      setSelected(new Set());
      return;
    }
    const snapshot = binder;
    ask({
      title: 'Split this pocket?',
      body: 'What is inside it comes out too.',
      confirmLabel: 'Split it',
      toastMessage: 'Pocket split.',
      snapshot,
      apply: () => apply(snapshot, unmerge(snapshot, mergeId, { confirmed: true }).binder, 'splitting a pocket'),
      restore: (snap) => save(snap),
    });
  };

  const askClearPage = (page: Page) => {
    const snapshot = binder;
    ask({
      title: `Empty page ${page.position}?`,
      body: 'Every pocket on it is emptied, and any merged pockets go back to single.',
      confirmLabel: 'Empty it',
      toastMessage: `Page ${page.position} emptied.`,
      snapshot,
      apply: () => apply(snapshot, clearPage(snapshot, page.id), `emptying page ${page.position}`),
      restore: (snap) => save(snap),
    });
  };

  const askDeletePage = (page: Page) => {
    const snapshot = binder;
    ask({
      title: `Remove page ${page.position}?`,
      body: 'The page and everything on it leaves the binder.',
      confirmLabel: 'Remove it',
      toastMessage: `Page ${page.position} removed.`,
      snapshot,
      apply: () => apply(snapshot, deletePage(snapshot, page.id), `removing page ${page.position}`),
      restore: (snap) => save(snap),
    });
  };

  const askModeSwitch = () => {
    const next = binder.pageMode === 'double' ? 'single' : 'double';
    const result = switchPageMode(binder, next);
    if (!result.needsConfirm) {
      commit(result.binder, `showing ${next === 'double' ? 'two pages' : 'one page'}`);
      return;
    }
    const snapshot = binder;
    ask({
      title: `This splits ${result.crossPageCount} pocket${result.crossPageCount === 1 ? '' : 's'}`,
      body: 'Pockets that cross the middle only exist when two pages face each other, so those will come apart.',
      confirmLabel: 'Show one page',
      toastMessage: 'Now showing one page at a time.',
      snapshot,
      apply: () =>
        apply(snapshot, switchPageMode(snapshot, 'single', { confirmed: true }).binder, 'showing one page'),
      restore: (snap) => save(snap),
    });
  };

  // ---- Selection summary for the inspector -----------------------------
  const singleCell = selected.size === 1 ? cellsFromSelected(selected)[0] : null;
  const singlePageObj = singleCell ? binder.pages.find((p) => p.id === singleCell.pageId) : undefined;
  const singleMerge = singleCell
    ? binder.merges.find((m) => {
        const cells = cellsForMerge(binder, m);
        if ('error' in cells) return false;
        return cells.some(
          (c) => c.pageId === singleCell.pageId && c.row === singleCell.row && c.col === singleCell.col,
        );
      })
    : undefined;
  const singlePlacement = singleCell
    ? placementAt(binder, singleCell.pageId, singleCell.row, singleCell.col)
    : undefined;

  const selection: SelectionInfo = {
    count: selected.size,
    single:
      singleCell && singlePageObj
        ? {
            page: singlePageObj,
            row: singleCell.row,
            col: singleCell.col,
            merge: singleMerge,
            placement: singlePlacement,
            cardName: singlePlacement?.cardId ? cardNames[singlePlacement.cardId] : undefined,
          }
        : null,
    mergeProblem,
    mergeShape,
  };

  // ---- Art pockets available to print ----------------------------------
  const artPockets: ArtPocket[] = binder.merges
    .map((merge) => {
      const placement = binder.placements.find((p) => p.mergeId === merge.id && p.kind === 'art');
      if (!placement) return null;
      const url = placement.uploadAssetId
        ? artUrls[placement.uploadAssetId]
        : placement.packItemId
          ? `/art-packs/${placement.packItemId}.svg`
          : null;
      if (!url) return null;
      const asset = placement.uploadAssetId
        ? media.find((m) => m.id === placement.uploadAssetId)
        : undefined;
      return {
        merge,
        placement,
        imageUrl: url,
        sourceWidthPx: asset?.widthPx ?? 800,
      };
    })
    .filter((x): x is ArtPocket => x !== null);

  const editSelectedArt = () => {
    if (!singleCell || !singlePlacement || singlePlacement.kind !== 'art') return;
    const asset = singlePlacement.uploadAssetId
      ? media.find((m) => m.id === singlePlacement.uploadAssetId)
      : undefined;
    if (asset) {
      openCrop(
        singleCell.pageId,
        singleCell.row,
        singleCell.col,
        singlePlacement,
        URL.createObjectURL(new Blob([asset.bytes], { type: asset.mime })),
        asset.widthPx,
        asset.heightPx,
        true,
      );
      return;
    }
    if (singlePlacement.packItemId) {
      openCrop(
        singleCell.pageId,
        singleCell.row,
        singleCell.col,
        singlePlacement,
        `/art-packs/${singlePlacement.packItemId}.svg`,
        800,
        1086,
      );
    }
  };

  // ---- The prompt: one place that says what happens next ----------------
  let promptTone: 'idle' | 'asking' | 'problem' = 'idle';
  let promptBody: React.ReactNode = 'Click a pocket to select it, or pick a card on the left to place one.';
  if (problem) {
    promptTone = 'problem';
    promptBody = problem;
  } else if (pending) {
    promptTone = 'asking';
    const name =
      pending.source === 'card'
        ? pending.card.name
        : pending.source === 'art'
          ? pending.asset.fileName
          : pending.source === 'pack'
            ? pending.item.title
            : pending.label;
    promptBody = (
      <>
        Click a pocket to put <b>{name}</b> in it. A pocket that already has something will be
        replaced, and you can undo that.
      </>
    );
  } else if (selected.size > 1) {
    promptTone = mergeProblem ? 'problem' : 'idle';
    promptBody = mergeProblem ?? `${selected.size} pockets picked. Join them from the panel on the right.`;
  } else if (selected.size === 1) {
    promptBody = 'One pocket picked. Its options are on the right.';
  }

  const toolPanel = (
    <Panel
      title={tool === 'cards' ? 'Card box' : 'Art box'}
      active
      flush
      className="h-full min-h-0"
      bodyClassName="flex min-h-0 flex-col"
    >
      <div className="gb-tabs" role="tablist" aria-label="Tools">
        <button
          type="button"
          role="tab"
          className="gb-tab"
          aria-selected={tool === 'cards'}
          onClick={() => setTool('cards')}
        >
          Cards
        </button>
        <button
          type="button"
          role="tab"
          className="gb-tab"
          aria-selected={tool === 'art'}
          onClick={() => setTool('art')}
        >
          My art
        </button>
      </div>
      <div className="min-h-0 flex-1">
        {tool === 'cards' ? (
          <SearchPanel
            wrapDnd={false}
            selectedId={pending?.source === 'card' ? pending.card.id : null}
            onSelectCard={(card) => {
              setPending({ source: 'card', card });
              setProblem(null);
            }}
          />
        ) : (
          <MediaLibrary
            selectedId={pending?.source === 'art' ? pending.asset.id : null}
            onSelect={(asset) => {
              setPending({ source: 'art', asset });
              setProblem(null);
            }}
            onSelectPack={(item) => {
              setPending({ source: 'pack', item });
              setProblem(null);
            }}
            onRemove={(asset) =>
              ask({
                title: `Remove ${asset.fileName}?`,
                body: 'It leaves your art box. Pockets already using it keep what is in them.',
                confirmLabel: 'Remove',
                toastMessage: 'Picture removed.',
                snapshot: binder,
                apply: () => void removeMedia(asset.id),
                restore: () => void restoreMedia(asset),
              })
            }
          />
        )}
      </div>
    </Panel>
  );

  // The three handlers below read marquee refs, but only from pointer and
  // click events — never while rendering. The compiler cannot see that across
  // the closure created here, so the rule is disabled for this block only.
  /* eslint-disable react-hooks/refs */
  const leaf = (page: Page | undefined, empty: string) =>
    page ? (
      <SlotGrid
        binder={binder}
        page={page}
        selected={selectedFor(page)}
        targetable={pending !== null}
        cardNames={cardNames}
        artUrls={artUrls}
        onPlace={(r, c) => onPocketClick(page, r, c)}
        onSelectPointerDown={(r, c, e) => onPocketPointerDown(page, r, c, e)}
        onSelectPointerEnter={(r, c, e) => onPocketPointerEnter(page, r, c, e)}
      />
    ) : (
      <div className="grid h-full place-items-center p-4">
        <p className="gb-label text-center">{empty}</p>
      </div>
    );
  /* eslint-enable react-hooks/refs */

  const atFirst = binder.pageMode === 'single' ? pageIndex <= 0 : spread <= 0;
  const atLast =
    binder.pageMode === 'single' ? pageIndex >= sortedPages.length - 1 : spread >= spreadCount - 1;
  const goPrev = () =>
    binder.pageMode === 'single'
      ? setPageIndex((i) => Math.max(0, i - 1))
      : setSpread((s) => Math.max(0, s - 1));
  const goNext = () =>
    binder.pageMode === 'single'
      ? setPageIndex((i) => Math.min(sortedPages.length - 1, i + 1))
      : setSpread((s) => Math.min(spreadCount - 1, s + 1));

  return (
    <DndContext
      sensors={sensors}
      onDragStart={(event: DragStartEvent) => {
        const data = event.active.data.current as
          | { kind: 'search'; card: CardHit }
          | { kind: 'placement'; placement: Placement }
          | undefined;
        setDragging(data?.kind === 'search' ? data.card.name : 'that card');
      }}
      onDragCancel={() => setDragging(null)}
      onDragEnd={(event: DragEndEvent) => {
        setDragging(null);
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
          placeAt(
            dest.pageId,
            dest.row,
            dest.col,
            placementFromCard(crypto.randomUUID(), data.card.id),
            data.card.name,
          );
          return;
        }
        placeAt(dest.pageId, dest.row, dest.col, data.placement, 'that card');
      }}
    >
      <div className="flex min-h-dvh flex-col bg-paper">
        <header className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-ink bg-paper-raised px-4 py-2.5">
          <button
            type="button"
            className="gb-btn gb-btn--quiet !min-h-8"
            onClick={() => router.push(session === 'user' ? '/shelf' : '/')}
          >
            <span aria-hidden="true">←</span> {session === 'user' ? 'Shelf' : 'Start'}
          </button>
          <div className="min-w-0">
            <h1 className="truncate text-lg leading-tight font-semibold">{binder.title}</h1>
            <p className="gb-label">
              {layout.rows} × {layout.cols} pockets ·{' '}
              {binder.pageMode === 'double' ? 'facing pages' : 'one page at a time'}
            </p>
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="gb-btn"
              disabled={!canUndo}
              onClick={doUndo}
              title={undoLabel ? `Undo ${undoLabel}` : 'Nothing to undo yet'}
            >
              Undo{undoLabel ? <span className="gb-sr"> {undoLabel}</span> : null}
            </button>
            <button type="button" className="gb-btn" onClick={askModeSwitch}>
              Show {binder.pageMode === 'double' ? 'one page' : 'two pages'}
            </button>
            <button
              type="button"
              className="gb-btn"
              onClick={() => {
                if (session !== 'user' && !anonymousMayAddPage(binder.pages.length)) {
                  setSavePrompt(true);
                  return;
                }
                commit(
                  {
                    ...binder,
                    pages: [
                      ...binder.pages,
                      {
                        id: crypto.randomUUID(),
                        binderId: binder.id,
                        position: binder.pages.length + 1,
                      },
                    ],
                  },
                  'adding a page',
                );
              }}
            >
              Add page
            </button>
            <button
              type="button"
              className="gb-btn gb-btn--primary"
              onClick={() => setPrintOpen(true)}
            >
              Print &amp; export
            </button>
          </div>
        </header>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 p-3 lg:grid-cols-[19rem_minmax(0,1fr)_19rem]">
          <div className="order-2 min-h-0 lg:order-1 lg:h-[calc(100dvh-7.5rem)]">{toolPanel}</div>

          <div className="order-1 flex min-w-0 flex-col items-center gap-3 lg:order-2">
            <div className="flex w-full items-center justify-center gap-2">
              <button
                type="button"
                className="gb-icon-btn"
                aria-label="Previous spread"
                disabled={atFirst}
                onClick={goPrev}
              >
                <span aria-hidden="true">◀</span>
              </button>
              <span className="gb-num rounded-sm border border-ink bg-paper-raised px-2.5 py-1 text-mini">
                {binder.pageMode === 'single'
                  ? `Page ${Math.min(pageIndex + 1, sortedPages.length)} of ${sortedPages.length}`
                  : `Spread ${spread + 1} of ${spreadCount}`}
              </span>
              <button
                type="button"
                className="gb-icon-btn"
                aria-label="Next spread"
                disabled={atLast}
                onClick={goNext}
              >
                <span aria-hidden="true">▶</span>
              </button>
            </div>

            <BinderFrame
              layoutId={binder.layoutId}
              mode={binder.pageMode}
              maxWidth={binder.pageMode === 'double' ? '56rem' : '31rem'}
              left={leaf(leftPage, 'Inside cover')}
              right={leaf(rightPage ?? singlePage, 'Back cover')}
            />

            <nav aria-label="Pages" className="flex max-w-full flex-wrap justify-center gap-1">
              {sortedPages.map((page) => {
                const current = currentPages.some((p) => p.id === page.id);
                return (
                  <button
                    key={page.id}
                    type="button"
                    aria-current={current}
                    aria-label={`Go to page ${page.position}`}
                    className={`gb-num min-h-8 rounded-sm border px-2 text-mini ${
                      current
                        ? 'border-ink bg-ink text-paper-raised'
                        : 'border-rule bg-paper-raised hover:border-ink'
                    }`}
                    onClick={() => {
                      if (binder.pageMode === 'single') {
                        setPageIndex(sortedPages.findIndex((p) => p.id === page.id));
                      } else {
                        setSpread(page.position === 1 ? 0 : Math.floor(page.position / 2));
                      }
                    }}
                  >
                    {page.position}
                  </button>
                );
              })}
            </nav>

            <div className="w-full max-w-3xl">
              <PromptStrip
                tone={promptTone}
                action={
                  pending ? (
                    <button
                      type="button"
                      className="gb-btn !min-h-8 !px-2.5"
                      onClick={() => setPending(null)}
                    >
                      Cancel
                    </button>
                  ) : undefined
                }
              >
                {promptBody}
              </PromptStrip>
            </div>
          </div>

          <div className="order-3 min-h-0 overflow-y-auto lg:h-[calc(100dvh-7.5rem)]">
            <Inspector
              binder={binder}
              selection={selection}
              currentPages={currentPages}
              cardNames={cardNames}
              onMerge={commitMerge}
              onUnmerge={requestUnmerge}
              onRemoveCard={(id) => {
                commit(removePlacement(binder, id), 'taking something out of a pocket');
              }}
              onToggleOwnership={(id, next) =>
                commit(setOwnership(binder, id, next), 'changing owned or wanted')
              }
              onEditArt={editSelectedArt}
              onPrintArt={() => setPrintOpen(true)}
              onClearSelection={() => setSelected(new Set())}
              onClearPage={askClearPage}
              onDeletePage={askDeletePage}
            />
          </div>
        </div>

        <footer className="flex flex-wrap items-center gap-3 border-t border-rule bg-paper-raised px-4 py-2">
          <SavedStamp status={saveStatus} onRetry={() => void retrySave()} />
          <span className="gb-label ml-auto">
            Drag a card to move it · Shift-drag to pick a block · Ctrl+Z undoes
          </span>
        </footer>
      </div>

      <DragOverlay dropAnimation={null}>
        {dragging ? (
          <span className="gb-prompt shadow-[var(--shadow-overlay)]">
            <span className="gb-prompt__marker" aria-hidden="true">
              drop
            </span>
            {dragging}
          </span>
        ) : null}
      </DragOverlay>

      {crop ? (
        <CropEditor
          imageUrl={crop.imageUrl}
          widthPx={crop.widthPx}
          heightPx={crop.heightPx}
          colSpan={crop.colSpan}
          rowSpan={crop.rowSpan}
          initial={'version' in crop.draft.transform ? (crop.draft.transform as Transform) : undefined}
          onSave={(transform) => {
            commit(
              placeIntoCell(binder, crop.pageId, crop.row, crop.col, {
                ...crop.draft,
                transform,
              }),
              'fitting a picture',
            );
            if (crop.revoke) URL.revokeObjectURL(crop.imageUrl);
            setCrop(null);
            setSelected(new Set([`${crop.pageId}:${crop.row}:${crop.col}`]));
          }}
          onCancel={() => {
            if (crop.revoke) URL.revokeObjectURL(crop.imageUrl);
            setCrop(null);
          }}
        />
      ) : null}

      {printOpen ? (
        <PrintDialog
          binder={binder}
          pages={currentPages}
          artPockets={artPockets}
          onClose={() => setPrintOpen(false)}
        />
      ) : null}

      {savePrompt ? <SavePrompt onDismiss={() => setSavePrompt(false)} /> : null}
      {host}
    </DndContext>
  );
}
