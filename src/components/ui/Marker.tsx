import type { ReactNode } from 'react';

export type MarkerTone = 'owned' | 'wanted' | 'merge' | 'note';

const GLYPH: Record<MarkerTone, string> = {
  owned: '●',
  wanted: '○',
  merge: '▣',
  note: '!',
};

/**
 * A small retro status marker. Carries a glyph as well as a colour, so state
 * never depends on colour alone.
 */
export function Marker({
  tone,
  children,
  title,
}: {
  tone: MarkerTone;
  children: ReactNode;
  title?: string;
}) {
  return (
    <span className={`gb-marker gb-marker--${tone}`} title={title}>
      <span aria-hidden="true">{GLYPH[tone]}</span>
      {children}
    </span>
  );
}
