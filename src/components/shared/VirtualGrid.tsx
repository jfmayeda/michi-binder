'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

/**
 * Windowed grid. `fill` lets it take whatever height its flex parent gives it
 * and measure that, instead of every caller guessing a pixel height.
 */
export function VirtualGrid<T>({
  items,
  columnCount,
  rowHeight,
  height,
  fill = false,
  renderItem,
  getKey,
  className = '',
}: {
  items: T[];
  columnCount: number;
  rowHeight: number;
  /** Used as the height when `fill` is off, and as the estimate before measuring. */
  height: number;
  fill?: boolean;
  renderItem: (item: T, index: number) => ReactNode;
  getKey: (item: T, index: number) => string;
  className?: string;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [measured, setMeasured] = useState(height);

  useEffect(() => {
    if (!fill) return;
    const el = scroller.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const next = entry.contentRect.height;
      if (next > 0) setMeasured(next);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [fill]);

  const viewport = fill ? measured : height;
  const rows = Math.ceil(items.length / columnCount);
  const overscan = 2;
  const startRow = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
  const visibleRows = Math.ceil(viewport / rowHeight) + overscan * 2;
  const endRow = Math.min(rows, startRow + visibleRows);
  const startIndex = startRow * columnCount;
  const endIndex = Math.min(items.length, endRow * columnCount);
  const slice = items.slice(startIndex, endIndex);

  return (
    <div
      ref={scroller}
      className={`overflow-auto ${fill ? 'h-full min-h-0 flex-1' : ''} ${className}`}
      style={fill ? undefined : { height }}
      onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
    >
      <div style={{ height: rows * rowHeight, position: 'relative' }}>
        <div
          className="absolute right-0 left-0 grid gap-2 p-2"
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
