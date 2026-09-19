'use client';

import { useEffect, useState } from 'react';

/**
 * Stable hue from a card id, so a card's stand-in looks the same every time
 * and a spread of stand-ins still reads as a varied page rather than a grid of
 * identical gray boxes.
 */
function hueFor(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) h = (h * 31 + seed.charCodeAt(i)) % 360;
  return h;
}

export type CardImageProps = {
  src: string | null;
  /** Card name, shown in the stand-in and used for the accessible name. */
  name: string;
  setId?: string | null;
  number?: string | null;
  seed: string;
  className?: string;
  /** Decorative inside a labelled pocket; named when it stands alone. */
  alt?: string;
  loading?: 'lazy' | 'eager';
};

/**
 * Card art with a real failure path.
 *
 * Images are hotlinked to the TCG dataset's CDN, which the PRD already flags as
 * a longevity risk, and which is simply unreachable offline. Rather than render
 * a broken image icon, this falls back to a typed stand-in carrying the card's
 * name, set and number — enough to keep a spread readable and a pull list
 * checkable with no network at all.
 */
export function CardImage({
  src,
  name,
  setId,
  number,
  seed,
  className = '',
  alt,
  loading = 'lazy',
}: CardImageProps) {
  const [state, setState] = useState<'loading' | 'ok' | 'failed'>(src ? 'loading' : 'failed');

  useEffect(() => {
    setState(src ? 'loading' : 'failed');
  }, [src]);

  if (state !== 'failed' && src) {
    return (
      <>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt ?? ''}
          loading={loading}
          decoding="async"
          draggable={false}
          onLoad={() => setState('ok')}
          onError={() => setState('failed')}
          className={`h-full w-full object-contain ${state === 'loading' ? 'opacity-0' : ''} ${className}`}
        />
        {state === 'loading' ? (
          <span
            aria-hidden="true"
            className="absolute inset-0 animate-pulse bg-paper-sunk"
          />
        ) : null}
      </>
    );
  }

  const hue = hueFor(seed);
  return (
    <span
      className={`gb-cardfallback flex h-full w-full flex-col overflow-hidden border border-ink/30 bg-paper-raised ${className}`}
      role={alt ? 'img' : undefined}
      aria-label={alt || undefined}
      title={`${name}${setId ? ` · ${setId}` : ''}${number ? ` #${number}` : ''}`}
    >
      <span
        aria-hidden="true"
        className="block h-[56%] w-full border-b border-ink/25"
        style={{
          background: `radial-gradient(120% 100% at 30% 15%, hsl(${hue} 52% 80%), hsl(${(hue + 34) % 360} 40% 54%))`,
        }}
      />
      <span className="flex min-h-0 flex-1 flex-col justify-between gap-0.5 p-[4%]">
        <span className="gb-cardfallback__name line-clamp-3 text-ink">{name}</span>
        <span className="gb-num gb-cardfallback__meta text-ink-faint">
          {setId ?? '—'} {number ? `· ${number}` : ''}
        </span>
      </span>
    </span>
  );
}
