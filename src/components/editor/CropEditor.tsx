'use client';

import { useMemo, useRef, useState } from 'react';
import { coverCrop, cropBoxAspect, panCrop, zoomCrop } from '@/domain/crop';
import { Dialog } from '@/components/ui/Dialog';
import type { Transform } from '@/domain/types';

/**
 * Fit a picture to a pocket. Nothing here touches the original file — the
 * result is a stored crop and rotation, so the same picture can be re-fitted
 * to a different pocket later without losing anything.
 */
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
  const fresh = () => coverCrop(widthPx, heightPx, colSpan, rowSpan, 0);
  const [transform, setTransform] = useState<Transform>(() => initial ?? fresh());
  const drag = useRef<{ x: number; y: number } | null>(null);
  const frame = useRef<HTMLDivElement>(null);

  const boxAspect = useMemo(
    () => cropBoxAspect(widthPx, heightPx, colSpan, rowSpan, transform.rotation),
    [widthPx, heightPx, colSpan, rowSpan, transform.rotation],
  );

  const nudge = (dx: number, dy: number) =>
    setTransform((t) => ({ ...t, crop: panCrop(t.crop, dx, dy) }));

  return (
    <Dialog
      title="Fit the picture"
      description={`This pocket is ${colSpan} × ${rowSpan}, which prints at ${colSpan * 7} × ${rowSpan * 9.5} cm. Drag to move the picture, or use the arrow keys.`}
      onClose={onCancel}
      footer={
        <>
          <button type="button" className="gb-btn" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className="gb-btn"
            onClick={() => setTransform(fresh())}
          >
            Reset
          </button>
          <button
            type="button"
            className="gb-btn gb-btn--primary"
            onClick={() => onSave(transform)}
          >
            Place it
          </button>
        </>
      }
    >
      <div
        ref={frame}
        role="application"
        aria-label="Crop area. Drag, or use the arrow keys to move the picture."
        tabIndex={0}
        className="relative mx-auto overflow-hidden rounded-sm border border-ink bg-paper-sunk"
        style={{ aspectRatio: `${colSpan * 7} / ${rowSpan * 9.5}`, maxHeight: '48vh' }}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          drag.current = { x: event.clientX, y: event.clientY };
        }}
        onPointerMove={(event) => {
          if (!drag.current) return;
          const box = frame.current?.getBoundingClientRect();
          const w = box?.width || 280;
          const h = box?.height || 380;
          const dx = (event.clientX - drag.current.x) / w;
          const dy = (event.clientY - drag.current.y) / h;
          drag.current = { x: event.clientX, y: event.clientY };
          nudge(-dx, -dy);
        }}
        onPointerUp={() => {
          drag.current = null;
        }}
        onKeyDown={(event) => {
          const step = event.shiftKey ? 0.05 : 0.01;
          if (event.key === 'ArrowLeft') nudge(-step, 0);
          else if (event.key === 'ArrowRight') nudge(step, 0);
          else if (event.key === 'ArrowUp') nudge(0, -step);
          else if (event.key === 'ArrowDown') nudge(0, step);
          else return;
          event.preventDefault();
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt=""
          draggable={false}
          className="absolute inset-0 h-full w-full cursor-grab object-cover active:cursor-grabbing"
          style={{
            objectPosition: `${(transform.crop.x + transform.crop.w / 2) * 100}% ${(transform.crop.y + transform.crop.h / 2) * 100}%`,
            transform: `rotate(${transform.rotation}deg) scale(${1 / Math.max(transform.crop.w, transform.crop.h)})`,
          }}
        />
        {/* Thirds guides, so a subject can be lined up against the pocket edge. */}
        <span aria-hidden="true" className="pointer-events-none absolute inset-0">
          <span className="absolute top-0 bottom-0 left-1/3 w-px bg-ink/15" />
          <span className="absolute top-0 bottom-0 left-2/3 w-px bg-ink/15" />
          <span className="absolute top-1/3 right-0 left-0 h-px bg-ink/15" />
          <span className="absolute top-2/3 right-0 left-0 h-px bg-ink/15" />
        </span>
      </div>

      <label className="mt-3 flex items-center gap-2 text-sm">
        <span className="gb-label">Zoom</span>
        <input
          type="range"
          min={0.4}
          max={1}
          step={0.01}
          value={transform.crop.w}
          aria-label="Zoom"
          onChange={(e) => {
            const nextW = Number(e.target.value);
            const factor = nextW / transform.crop.w;
            setTransform((t) => ({ ...t, crop: zoomCrop(t.crop, factor, boxAspect) }));
          }}
          className="flex-1 accent-[var(--color-red)]"
        />
      </label>

      <button
        type="button"
        className="gb-btn mt-3"
        onClick={() => {
          const rotation = ((transform.rotation + 90) % 360) as Transform['rotation'];
          setTransform(coverCrop(widthPx, heightPx, colSpan, rowSpan, rotation));
        }}
      >
        Rotate 90°
      </button>
    </Dialog>
  );
}
