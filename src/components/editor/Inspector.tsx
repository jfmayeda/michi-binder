'use client';

import { Panel } from '@/components/ui/Panel';
import { Marker } from '@/components/ui/Marker';
import { assemblyAnnotation } from '@/domain/split';
import { LAYOUTS } from '@/domain/layouts';
import type { Binder, Merge, Page, Placement } from '@/domain/types';

export type SelectionInfo = {
  count: number;
  /** Set when exactly one pocket is selected. */
  single: {
    page: Page;
    row: number;
    col: number;
    merge: Merge | undefined;
    placement: Placement | undefined;
    cardName: string | undefined;
  } | null;
  /** Plain-language reason a multi-pocket selection cannot merge, if any. */
  mergeProblem: string | null;
  mergeShape: { cols: number; rows: number } | null;
};

/**
 * Contextual properties for whatever is selected.
 *
 * Every action for a pocket lives here with a full text label, instead of the
 * previous build's unlabelled chips inside the pocket itself. The panel shows
 * only what applies to the current selection, so the editor never presents
 * every tool at once.
 */
export function Inspector({
  binder,
  selection,
  onMerge,
  onUnmerge,
  onRemoveCard,
  onToggleOwnership,
  onEditArt,
  onPrintArt,
  onClearSelection,
  onClearPage,
  onDeletePage,
  currentPages,
  cardNames,
}: {
  binder: Binder;
  selection: SelectionInfo;
  onMerge: () => void;
  onUnmerge: (mergeId: string) => void;
  onRemoveCard: (placementId: string) => void;
  onToggleOwnership: (placementId: string, next: 'owned' | 'wanted') => void;
  onEditArt: () => void;
  onPrintArt: () => void;
  onClearSelection: () => void;
  onClearPage: (page: Page) => void;
  onDeletePage: (page: Page) => void;
  currentPages: Page[];
  cardNames: Record<string, string>;
}) {
  const layout = LAYOUTS[binder.layoutId];
  const { single, count, mergeProblem, mergeShape } = selection;

  const placedHere = binder.placements.filter((p) =>
    currentPages.some((page) => page.id === p.pageId),
  ).length;

  const wanted = binder.placements.filter(
    (p) =>
      p.kind === 'card' &&
      p.ownership === 'wanted' &&
      currentPages.some((page) => page.id === p.pageId),
  );

  return (
    <div className="flex min-h-0 flex-col gap-3">
      <Panel title={count === 0 ? 'Nothing selected' : count === 1 ? 'This pocket' : 'Selection'} active={count > 0}>
        {count === 0 ? (
          <p className="text-sm text-ink-soft">
            Click a pocket in the binder to see what you can do with it. Drag across several to
            select a block.
          </p>
        ) : null}

        {count > 1 ? (
          <div className="grid gap-2.5">
            <p className="gb-num text-sm">
              {count} pockets{mergeShape ? ` · ${mergeShape.cols} × ${mergeShape.rows}` : ''}
            </p>
            {mergeProblem ? (
              <p className="text-sm text-red-ink">{mergeProblem}</p>
            ) : (
              <p className="text-sm text-ink-soft">
                These can become one pocket{' '}
                {mergeShape
                  ? `that prints at ${mergeShape.cols * 7} × ${mergeShape.rows * 9.5} cm`
                  : ''}
                .
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="gb-btn gb-btn--primary"
                disabled={Boolean(mergeProblem)}
                onClick={onMerge}
              >
                Merge into one pocket
              </button>
              <button type="button" className="gb-btn" onClick={onClearSelection}>
                Clear selection
              </button>
            </div>
          </div>
        ) : null}

        {single ? (
          <div className="grid gap-2.5">
            <p className="gb-num text-sm">
              {single.merge
                ? `Merged pocket, ${single.merge.colSpan} × ${single.merge.rowSpan}`
                : `Row ${single.row + 1}, column ${single.col + 1}`}
            </p>

            <div className="gb-stats rounded-sm border border-rule bg-paper-sunk p-2">
              <p className="gb-stat">
                <span className="gb-stat__key">Prints at</span>
                <span className="gb-stat__dots" aria-hidden="true" />
                <span className="gb-stat__val">
                  {(single.merge?.colSpan ?? 1) * 7} × {(single.merge?.rowSpan ?? 1) * 9.5} cm
                </span>
              </p>
              <p className="gb-stat">
                <span className="gb-stat__key">Opens from</span>
                <span className="gb-stat__dots" aria-hidden="true" />
                <span className="gb-stat__val">
                  {layout.insertionMap
                    ? layout.insertionMap[single.col] === 'L'
                      ? 'the left'
                      : 'the right'
                    : 'not measured yet'}
                </span>
              </p>
            </div>

            {single.merge ? (
              <p>
                <Marker tone="merge">{assemblyAnnotation(binder, single.merge)}</Marker>
              </p>
            ) : null}

            {single.placement?.kind === 'card' ? (
              <>
                <p className="text-sm">
                  <b>{single.cardName ?? single.placement.cardId}</b>
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="gb-btn"
                    aria-pressed={single.placement.ownership === 'owned'}
                    onClick={() =>
                      onToggleOwnership(
                        single.placement!.id,
                        single.placement!.ownership === 'owned' ? 'wanted' : 'owned',
                      )
                    }
                  >
                    {single.placement.ownership === 'owned'
                      ? 'Mark as still needed'
                      : 'Mark as owned'}
                  </button>
                  <button
                    type="button"
                    className="gb-btn"
                    onClick={() => onRemoveCard(single.placement!.id)}
                  >
                    Take the card out
                  </button>
                </div>
              </>
            ) : null}

            {single.placement?.kind === 'art' ? (
              <>
                <p className="text-sm">Your own art is in this pocket.</p>
                <div className="flex flex-wrap gap-2">
                  <button type="button" className="gb-btn" onClick={onEditArt}>
                    Re-fit the picture
                  </button>
                  {single.merge ? (
                    <button type="button" className="gb-btn gb-btn--primary" onClick={onPrintArt}>
                      Print this art
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="gb-btn"
                    onClick={() => onRemoveCard(single.placement!.id)}
                  >
                    Take the art out
                  </button>
                </div>
              </>
            ) : null}

            {!single.placement ? (
              <p className="text-sm text-ink-soft">
                This pocket is empty. Pick a card or a picture on the left, then click here.
              </p>
            ) : null}

            {single.merge ? (
              <button
                type="button"
                className="gb-btn"
                onClick={() => onUnmerge(single.merge!.id)}
              >
                Split back into single pockets
              </button>
            ) : null}
          </div>
        ) : null}
      </Panel>

      <Panel title="Still needed here" count={`${wanted.length}`}>
        {wanted.length === 0 ? (
          <p className="text-sm text-ink-soft">
            {placedHere === 0
              ? 'Nothing placed here yet.'
              : `Everything on this ${currentPages.length > 1 ? 'spread' : 'page'} is marked as owned.`}
          </p>
        ) : (
          <ul className="grid gap-1">
            {wanted.map((p) => (
              <li key={p.id} className="flex items-center gap-2 text-mini">
                <Marker tone="wanted">Want</Marker>
                <span className="truncate">
                  {(p.cardId && cardNames[p.cardId]) || p.cardId}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="This page">
        <div className="flex flex-wrap gap-2">
          {currentPages.map((page) => (
            <button
              key={`clear-${page.id}`}
              type="button"
              className="gb-btn"
              onClick={() => onClearPage(page)}
            >
              Empty page {page.position}
            </button>
          ))}
          {binder.pages.length > 1
            ? currentPages.map((page) => (
                <button
                  key={`del-${page.id}`}
                  type="button"
                  className="gb-btn"
                  onClick={() => onDeletePage(page)}
                >
                  Remove page {page.position}
                </button>
              ))
            : null}
        </div>
      </Panel>
    </div>
  );
}
