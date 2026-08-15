'use client';

import type { ReactNode } from 'react';
import { LAYOUTS } from '@/domain/layouts';
import { cellsForMerge } from '@/domain/slots';
import { assemblyAnnotation } from '@/domain/split';
import type { Binder, Page } from '@/domain/types';

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
      if (c.row !== origin.row || c.col !== origin.col) occupied.set(`${c.row}:${c.col}`, { colSpan: 0, rowSpan: 0 });
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
      items.push(
        <button
          key={key}
          type="button"
          style={spanStyle}
          onClick={() => {
            if (onPlace) onPlace(r, c);
            else onToggle(r, c);
          }}
          className={`relative min-h-16 rounded-sm border text-left text-[0.65rem] ${
            selectedCell ? 'border-accent bg-accent-soft' : 'border-rule bg-paper-sun/80'
          }`}
        >
          {placement?.kind === 'card' ? (
            <span className="block p-1 font-display text-ink">{placement.cardId}</span>
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
              className="absolute top-1 right-1 text-accent-ink"
              onClick={(e) => {
                e.stopPropagation();
                onRemove(placement.id);
              }}
            >
              ×
            </span>
          ) : null}
        </button>,
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

