'use client';

import { useDraggable } from '@dnd-kit/core';
import type { CardHit } from '@/search';
import { CardImage } from '@/components/ui/CardImage';

/**
 * One search result. The card keeps its 5:7 proportions — the art is never
 * cropped to fit the tile — and the name, set and number are always legible
 * beneath it, because scanning a result list is a reading task.
 */
export function CardThumb({
  hit,
  selected,
  onSelect,
}: {
  hit: CardHit;
  selected: boolean;
  onSelect: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `search:${hit.id}`,
    data: { kind: 'search' as const, card: hit },
  });

  return (
    <button
      ref={setNodeRef}
      type="button"
      {...listeners}
      {...attributes}
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={`${hit.name}, ${hit.setId} ${hit.number}${selected ? ', selected' : ''}`}
      className={`flex h-full w-full flex-col gap-1 rounded-sm border p-1.5 text-left transition-colors ${
        selected
          ? 'border-ink bg-red-wash shadow-[var(--shadow-step-sm)]'
          : 'border-rule bg-paper-raised hover:border-ink'
      } ${isDragging ? 'opacity-40' : ''}`}
    >
      <span className="relative block aspect-[5/7] w-full overflow-hidden rounded-xs bg-paper-sunk">
        <CardImage
          src={hit.imageSmall}
          name={hit.name}
          setId={hit.setId}
          number={hit.number}
          seed={hit.id}
          showMeta={false}
        />
        {selected ? (
          <span
            className="absolute top-0.5 left-0.5 text-[0.7rem] leading-none text-red"
            aria-hidden="true"
          >
            &#9656;
          </span>
        ) : null}
      </span>
      <span className="line-clamp-2 text-mini leading-tight font-semibold text-ink">
        {hit.name}
      </span>
      <span className="gb-num text-micro text-ink-faint">
        {hit.setId} · {hit.number}
      </span>
    </button>
  );
}
