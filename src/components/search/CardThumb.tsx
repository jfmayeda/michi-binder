'use client';

import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import type { CardHit } from '@/search';

export function CardThumb({
  hit,
  selected,
  onSelect,
}: {
  hit: CardHit;
  selected: boolean;
  onSelect: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `search:${hit.id}`,
    data: { kind: 'search' as const, card: hit },
  });
  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined;

  return (
    <button
      ref={setNodeRef}
      type="button"
      style={style}
      {...listeners}
      {...attributes}
      onClick={onSelect}
      aria-pressed={selected}
      className={`flex flex-col gap-1 rounded-md border p-1.5 text-left shadow-stamp outline-none ${
        selected ? 'border-accent bg-accent-soft' : 'border-rule bg-paper'
      } ${isDragging ? 'opacity-70' : ''}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={hit.imageSmall}
        alt=""
        width={120}
        height={168}
        loading="lazy"
        decoding="async"
        className="aspect-[5/7] w-full rounded-sm object-cover"
      />
      <span className="font-display line-clamp-2 text-xs leading-tight text-ink">{hit.name}</span>
      <span className="text-[0.65rem] text-ink-faint">
        {hit.setId} · {hit.number}
      </span>
    </button>
  );
}
