'use client';

import { useDraggable, useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import type { CSSProperties, ReactNode } from 'react';
import { LAYOUTS } from '@/domain/layouts';
import { cellsForMerge } from '@/domain/slots';
import { assemblyAnnotation } from '@/domain/split';
import type { Binder, Page, Placement } from '@/domain/types';
import { derivedCardImageUrl } from '@/search/images';

function cardThumbUrl(cardId: string): string {
  const dash = cardId.indexOf('-');
  if (dash < 0) return derivedCardImageUrl(cardId, '1');
  return derivedCardImageUrl(cardId.slice(0, dash), cardId.slice(dash + 1));
}

function DropCell({
  id,
  className,
  style,
  children,
  onClick,
}: {
  id: string;
  className: string;
  style?: CSSProperties;
  children: ReactNode;
  onClick: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      role="button"
      tabIndex={0}
      style={style}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onClick();
        }
      }}
      className={`${className} ${isOver ? 'ring-2 ring-accent' : ''}`}
    >
      {children}
    </div>
  );
}

function DragFill({ placement, children }: { placement: Placement; children: ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `slot:${placement.id}`,
    data: { kind: 'placement' as const, placement },
  });
  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined;
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`h-full ${isDragging ? 'opacity-60' : ''}`}
      {...listeners}
      {...attributes}
    >
      {children}
    </div>
  );
}

export function SlotGrid({
  binder,
  page,
  selected,
  onToggle,
  onPlace,
  onRemove,
}: {
  binder: Binder;
  page: Page;
  selected: Set<string>;
  onToggle: (row: number, col: number) => void;
  onPlace?: (row: number, col: number) => void;
  onRemove?: (placementId: string) => void;
}) {
  const layout = LAYOUTS[binder.layoutId];
  const occupied = new Map<string, { mergeId?: string; colSpan: number; rowSpan: number }>();
  for (const merge of binder.merges) {
    const cells = cellsForMerge(binder, merge);
    if ('error' in cells) continue;
    const onThis = cells.filter((c) => c.pageId === page.id);
    if (onThis.length === 0) continue;
    const origin = onThis.reduce((a, b) =>
      a.row < b.row || (a.row === b.row && a.col < b.col) ? a : b,
    );
    occupied.set(`${origin.row}:${origin.col}`, {
      mergeId: merge.id,
      colSpan: merge.spansGutter && origin.pageId === merge.pageId
        ? Math.min(merge.colSpan, layout.cols - merge.col)
        : 1 + Math.max(...onThis.map((c) => c.col)) - Math.min(...onThis.map((c) => c.col)),
      rowSpan: 1 + Math.max(...onThis.map((c) => c.row)) - Math.min(...onThis.map((c) => c.row)),
    });
    for (const c of onThis) {
      if (c.row !== origin.row || c.col !== origin.col) {
        occupied.set(`${c.row}:${c.col}`, { colSpan: 0, rowSpan: 0 });
      }
    }
  }

  const items: ReactNode[] = [];
  for (let r = 0; r < layout.rows; r += 1) {
    for (let c = 0; c < layout.cols; c += 1) {
      const key = `${r}:${c}`;
      const block = occupied.get(key);
      if (block?.colSpan === 0) continue;
      const merge = block?.mergeId
        ? binder.merges.find((m) => m.id === block.mergeId)
        : undefined;
      const placement = merge
        ? binder.placements.find((p) => p.mergeId === merge.id)
        : binder.placements.find((p) => p.pageId === page.id && p.row === r && p.col === c);
      const spanStyle = block
        ? { gridColumn: `span ${block.colSpan}`, gridRow: `span ${block.rowSpan}` }
        : undefined;
      const selectedCell = selected.has(key);
      const body = (
        <>
          {placement?.kind === 'card' && placement.cardId ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={cardThumbUrl(placement.cardId)}
              alt=""
              className="h-full w-full object-cover"
              draggable={false}
            />
          ) : placement?.kind === 'art' ? (
            <span className="block p-1 text-ink-soft">art</span>
          ) : (
            <span className="block p-1 text-ink-faint">
              {r + 1}×{c + 1}
            </span>
          )}
          {merge ? (
            <span className="absolute right-1 bottom-1 rounded-sm bg-paper px-1 text-[0.55rem] text-accent">
              {assemblyAnnotation(binder, merge)}
            </span>
          ) : null}
          {placement && onRemove ? (
            <span
              role="button"
              tabIndex={0}
              className="absolute top-1 right-1 z-10 rounded-sm bg-paper/90 px-1 text-accent-ink"
              onClick={(e) => {
                e.stopPropagation();
                onRemove(placement.id);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.stopPropagation();
                  onRemove(placement.id);
                }
              }}
            >
              ×
            </span>
          ) : null}
        </>
      );
      items.push(
        <DropCell
          key={key}
          id={`${page.id}:${r}:${c}`}
          style={spanStyle}
          onClick={() => {
            if (onPlace) onPlace(r, c);
            else onToggle(r, c);
          }}
          className={`relative min-h-16 overflow-hidden rounded-sm border text-left text-[0.65rem] ${
            selectedCell ? 'border-accent bg-accent-soft' : 'border-rule bg-paper-sun/80'
          }`}
        >
          {placement ? <DragFill placement={placement}>{body}</DragFill> : body}
        </DropCell>,
      );
    }
  }

  return (
    <div
      className="grid h-full min-h-0 gap-1 p-2"
      style={{
        gridTemplateColumns: `repeat(${layout.cols}, minmax(0, 1fr))`,
        gridTemplateRows: `repeat(${layout.rows}, minmax(0, 1fr))`,
      }}
    >
      {items}
    </div>
  );
}
