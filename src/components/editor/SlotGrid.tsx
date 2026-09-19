'use client';

import { useDraggable, useDroppable } from '@dnd-kit/core';
import type { CSSProperties, PointerEvent, ReactNode } from 'react';
import { LAYOUTS, SLOT_CM } from '@/domain/layouts';
import { cellsForMerge } from '@/domain/slots';
import { assemblyAnnotation } from '@/domain/split';
import type { Binder, Merge, Page, Placement } from '@/domain/types';
import { derivedCardImageUrl } from '@/search/images';
import { CardImage } from '@/components/ui/CardImage';

export function cardThumbUrl(cardId: string): string {
  const dash = cardId.indexOf('-');
  if (dash < 0) return derivedCardImageUrl(cardId, '1');
  return derivedCardImageUrl(cardId.slice(0, dash), cardId.slice(dash + 1));
}

/** "base1-58" -> "base1 · 58", for the stand-in when art cannot load. */
function splitCardId(cardId: string): { setId: string; number: string } {
  const dash = cardId.indexOf('-');
  if (dash < 0) return { setId: cardId, number: '' };
  return { setId: cardId.slice(0, dash), number: cardId.slice(dash + 1) };
}

type CellSpec = {
  key: string;
  row: number;
  col: number;
  colSpan: number;
  rowSpan: number;
  merge: Merge | undefined;
  placement: Placement | undefined;
};

/**
 * Which cells this page actually draws, and how far each one spans. Built
 * before any JSX so the loop counters are never mutated mid-render.
 */
function buildCells(binder: Binder, page: Page): CellSpec[] {
  const layout = LAYOUTS[binder.layoutId];
  const spans = new Map<string, { mergeId?: string; colSpan: number; rowSpan: number }>();

  for (const merge of binder.merges) {
    const cells = cellsForMerge(binder, merge);
    if ('error' in cells) continue;
    const onThis = cells.filter((c) => c.pageId === page.id);
    if (onThis.length === 0) continue;
    const origin = onThis.reduce((a, b) =>
      a.row < b.row || (a.row === b.row && a.col < b.col) ? a : b,
    );
    spans.set(`${origin.row}:${origin.col}`, {
      mergeId: merge.id,
      colSpan:
        merge.spansGutter && origin.pageId === merge.pageId
          ? Math.min(merge.colSpan, layout.cols - merge.col)
          : 1 + Math.max(...onThis.map((c) => c.col)) - Math.min(...onThis.map((c) => c.col)),
      rowSpan: 1 + Math.max(...onThis.map((c) => c.row)) - Math.min(...onThis.map((c) => c.row)),
    });
    for (const c of onThis) {
      if (c.row !== origin.row || c.col !== origin.col) {
        spans.set(`${c.row}:${c.col}`, { colSpan: 0, rowSpan: 0 });
      }
    }
  }

  const out: CellSpec[] = [];
  const total = layout.rows * layout.cols;
  for (let i = 0; i < total; i += 1) {
    const row = Math.floor(i / layout.cols);
    const col = i % layout.cols;
    const key = `${row}:${col}`;
    const block = spans.get(key);
    if (block && block.colSpan === 0) continue;
    const merge = block?.mergeId ? binder.merges.find((m) => m.id === block.mergeId) : undefined;
    const placement = merge
      ? binder.placements.find((p) => p.mergeId === merge.id)
      : binder.placements.find((p) => p.pageId === page.id && p.row === row && p.col === col);
    out.push({
      key,
      row,
      col,
      colSpan: block?.colSpan ?? 1,
      rowSpan: block?.rowSpan ?? 1,
      merge,
      placement,
    });
  }
  return out;
}

function describe(cell: CellSpec, cardName?: string): string {
  const where =
    cell.colSpan > 1 || cell.rowSpan > 1
      ? `Merged pocket, ${cell.colSpan} by ${cell.rowSpan}, from row ${cell.row + 1} column ${cell.col + 1}`
      : `Pocket row ${cell.row + 1}, column ${cell.col + 1}`;
  if (!cell.placement) return `${where} — empty`;
  if (cell.placement.kind === 'art') return `${where} — holds your art`;
  return `${where} — ${cardName ?? cell.placement.cardId ?? 'a card'}`;
}

function Pocket({
  id,
  cell,
  page,
  openSide,
  selected,
  targetable,
  label,
  annotation,
  children,
  onClick,
  onPointerDown,
  onPointerEnter,
}: {
  id: string;
  cell: CellSpec;
  page: Page;
  openSide: string | null;
  selected: boolean;
  targetable: boolean;
  label: string;
  annotation: string | null;
  children: ReactNode;
  onClick: () => void;
  onPointerDown?: (event: PointerEvent) => void;
  onPointerEnter?: (event: PointerEvent) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  const style: CSSProperties = {
    gridColumn: `span ${cell.colSpan}`,
    gridRow: `span ${cell.rowSpan}`,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative min-w-0">
      <button
        type="button"
        aria-pressed={selected}
        aria-label={label}
        data-pocket={`${page.id}:${cell.row}:${cell.col}`}
        data-open-side={openSide ?? undefined}
        onClick={onClick}
        onPointerDown={onPointerDown}
        onPointerEnter={onPointerEnter}
        className={`binder-pocket block h-full w-full cursor-pointer p-0 ${
          cell.colSpan > 1 || cell.rowSpan > 1 ? 'binder-pocket--merged' : ''
        } ${selected ? 'is-selected' : ''} ${isOver ? 'is-over' : ''} ${
          targetable && !selected ? 'is-targetable' : ''
        }`}
      >
        {children}
      </button>
      {selected ? (
        <span className="pointer-events-none absolute top-0 left-0.5 z-3 text-[0.7rem] leading-none text-red" aria-hidden="true">
          &#9656;
        </span>
      ) : null}
      {annotation ? (
        <span className="pointer-events-none absolute right-1 bottom-1 z-3">
          <span className="gb-marker gb-marker--merge">{annotation}</span>
        </span>
      ) : null}
    </div>
  );
}

function DragFill({ placement, children }: { placement: Placement; children: ReactNode }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `slot:${placement.id}`,
    data: { kind: 'placement' as const, placement },
  });
  return (
    <span
      ref={setNodeRef}
      className={`block h-full w-full ${isDragging ? 'opacity-35' : ''}`}
      {...listeners}
      {...attributes}
    >
      {children}
    </span>
  );
}

export function SlotGrid({
  binder,
  page,
  selected,
  targetable = false,
  cardNames,
  artUrls,
  onPlace,
  onSelectPointerDown,
  onSelectPointerEnter,
}: {
  binder: Binder;
  page: Page;
  /** Selected cells on this page, keyed "row:col". */
  selected: Set<string>;
  /** True while a card or art is waiting for a destination. */
  targetable?: boolean;
  cardNames?: Record<string, string>;
  artUrls?: Record<string, string>;
  onPlace: (row: number, col: number) => void;
  onSelectPointerDown?: (row: number, col: number, event: PointerEvent) => void;
  onSelectPointerEnter?: (row: number, col: number, event: PointerEvent) => void;
}) {
  const layout = LAYOUTS[binder.layoutId];
  const cells = buildCells(binder, page);

  return (
    <div
      className="binder-grid"
      style={{
        gridTemplateColumns: `repeat(${layout.cols}, minmax(0, 1fr))`,
        gridTemplateRows: `repeat(${layout.rows}, minmax(0, 1fr))`,
      }}
    >
      {cells.map((cell) => {
        const { placement } = cell;
        const cardName = placement?.cardId ? cardNames?.[placement.cardId] : undefined;
        const artUrl =
          placement?.kind === 'art'
            ? (placement.uploadAssetId && artUrls?.[placement.uploadAssetId]) ||
              (placement.packItemId ? `/art-packs/${placement.packItemId}.svg` : undefined)
            : undefined;

        let body: ReactNode = null;
        if (placement?.kind === 'card' && placement.cardId) {
          const { setId, number } = splitCardId(placement.cardId);
          body = (
            <span className="absolute inset-[4%]">
              <CardImage
                src={cardThumbUrl(placement.cardId)}
                name={cardName ?? placement.cardId}
                setId={setId}
                number={number}
                seed={placement.cardId}
              />
            </span>
          );
        } else if (!placement && (cell.colSpan > 1 || cell.rowSpan > 1)) {
          body = (
            <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 p-2 text-center">
              <span className="gb-label">Art pocket</span>
              <span className="gb-num text-mini text-ink-soft">
                {cell.colSpan * SLOT_CM.width} × {cell.rowSpan * SLOT_CM.height} cm
              </span>
            </span>
          );
        } else if (placement?.kind === 'art') {
          body = artUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={artUrl} alt="" className="binder-pocket__art" draggable={false} />
          ) : (
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="gb-label">Art</span>
            </span>
          );
        }

        const label = describe(cell, cardName);
        const annotation = cell.merge ? assemblyAnnotation(binder, cell.merge) : null;

        return (
          <Pocket
            key={cell.key}
            id={`${page.id}:${cell.row}:${cell.col}`}
            cell={cell}
            page={page}
            openSide={layout.insertionMap ? layout.insertionMap[cell.col] : null}
            selected={selected.has(cell.key)}
            targetable={targetable}
            label={label}
            annotation={annotation}
            onClick={() => onPlace(cell.row, cell.col)}
            onPointerDown={(event) => onSelectPointerDown?.(cell.row, cell.col, event)}
            onPointerEnter={(event) => onSelectPointerEnter?.(cell.row, cell.col, event)}
          >
            {placement ? <DragFill placement={placement}>{body}</DragFill> : body}
          </Pocket>
        );
      })}
    </div>
  );
}
