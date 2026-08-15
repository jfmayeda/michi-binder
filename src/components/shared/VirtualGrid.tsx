'use client';

import { useRef, useState, type ReactNode } from 'react';

export function VirtualGrid<T>({
  items,
  columnCount,
  rowHeight,
  height,
  renderItem,
  getKey,
}: {
  items: T[];
  columnCount: number;
  rowHeight: number;
  height: number;
  renderItem: (item: T, index: number) => ReactNode;
  getKey: (item: T, index: number) => string;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const rows = Math.ceil(items.length / columnCount);
  const overscan = 2;
  const startRow = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
  const visibleRows = Math.ceil(height / rowHeight) + overscan * 2;
  const endRow = Math.min(rows, startRow + visibleRows);
  const startIndex = startRow * columnCount;
  const endIndex = Math.min(items.length, endRow * columnCount);
  const slice = items.slice(startIndex, endIndex);

  return (
    <div
      ref={scroller}
      className="overflow-auto rounded-lg border border-rule bg-paper-sun/70"
      style={{ height }}
      onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
    >
      <div style={{ height: rows * rowHeight, position: 'relative' }}>
        <div
          className="absolute right-0 left-0 grid gap-2 px-2"
          style={{
            top: startRow * rowHeight,
            gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))`,
          }}
        >
          {slice.map((item, i) => {
            const index = startIndex + i;
            return <div key={getKey(item, index)}>{renderItem(item, index)}</div>;
          })}
        </div>
      </div>
    </div>
  );
}
