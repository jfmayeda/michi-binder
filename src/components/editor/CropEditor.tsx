'use client';

import { useMemo, useRef, useState } from 'react';
import {
  coverCrop,
  cropBoxAspect,
  panCrop,
  zoomCrop,
} from '@/domain/crop';
import type { Transform } from '@/domain/types';

export function CropEditor({
  imageUrl,
  widthPx,
  heightPx,
  colSpan,
  rowSpan,
  initial,
  onSave,
  onCancel,
}: {
  imageUrl: string;
  widthPx: number;
  heightPx: number;
  colSpan: number;
  rowSpan: number;
  initial?: Transform;
  onSave: (transform: Transform) => void;
  onCancel: () => void;
}) {
  const [transform, setTransform] = useState<Transform>(
    () => initial ?? coverCrop(widthPx, heightPx, colSpan, rowSpan, 0),
  );
  const drag = useRef<{ x: number; y: number } | null>(null);
  const boxAspect = useMemo(
    () => cropBoxAspect(widthPx, heightPx, colSpan, rowSpan, transform.rotation),
    [widthPx, heightPx, colSpan, rowSpan, transform.rotation],
  );

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-ink/50 p-4">
      <div className="w-full max-w-lg rounded-lg border border-rule bg-paper p-4 shadow-lift">
        <p className="font-display text-xl text-ink">Fit the picture</p>
        <p className="text-xs text-ink-faint">
          Window stays {colSpan}×{rowSpan} pockets ({colSpan * 7} × {rowSpan * 9.5} cm).
        </p>
        <div
          className="relative mt-3 aspect-[7/9.5] overflow-hidden rounded-md border border-rule bg-paper-deep"
          onPointerDown={(event) => {
            (event.target as HTMLElement).setPointerCapture?.(event.pointerId);
            drag.current = { x: event.clientX, y: event.clientY };
          }}
          onPointerMove={(event) => {
            if (!drag.current) return;
            const dx = (event.clientX - drag.current.x) / 280;
            const dy = (event.clientY - drag.current.y) / 280;
            drag.current = { x: event.clientX, y: event.clientY };
            setTransform((t) => ({ ...t, crop: panCrop(t.crop, -dx, -dy) }));
          }}
          onPointerUp={() => {
            drag.current = null;
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt=""
            draggable={false}
            className="absolute inset-0 h-full w-full object-cover"
            style={{
              objectPosition: `${(transform.crop.x + transform.crop.w / 2) * 100}% ${(transform.crop.y + transform.crop.h / 2) * 100}%`,
              transform: `rotate(${transform.rotation}deg) scale(${1 / Math.max(transform.crop.w, transform.crop.h)})`,
            }}
          />
        </div>
        <label className="mt-3 flex items-center gap-2 text-xs text-ink-soft">
          Zoom
          <input
            type="range"
            min={0.4}
            max={1}
            step={0.01}
            value={transform.crop.w}
            onChange={(e) => {
              const nextW = Number(e.target.value);
              const factor = nextW / transform.crop.w;
              setTransform((t) => ({ ...t, crop: zoomCrop(t.crop, factor, boxAspect) }));
            }}
            className="flex-1 accent-[var(--color-accent)]"
          />
        </label>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-md bg-paper-sun px-3 py-1.5 text-sm shadow-stamp"
            onClick={() => {
              const rotation = ((transform.rotation + 90) % 360) as Transform['rotation'];
              setTransform(coverCrop(widthPx, heightPx, colSpan, rowSpan, rotation));
            }}
          >
            Rotate 90°
          </button>
          <button
            type="button"
            className="rounded-md bg-accent px-3 py-1.5 text-sm text-paper-sun shadow-stamp"
            onClick={() => onSave(transform)}
          >
            Place
          </button>
          <button type="button" className="px-3 py-1.5 text-sm text-ink-soft" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
