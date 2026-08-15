'use client';

import { useEffect, useMemo, useState } from 'react';
import { derivedCardImageUrl } from '@/search/images';
import type { CardIndex } from '@/search/types';

type ColorsFile = {
  setId: string;
  cards: Record<string, { hex: string; weight: number }[]>;
};

function hexToHsl(hex: string) {
  const n = hex.replace('#', '');
  const r = parseInt(n.slice(0, 2), 16) / 255;
  const g = parseInt(n.slice(2, 4), 16) / 255;
  const b = parseInt(n.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  let h = 0;
  let s = 0;
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    switch (max) {
      case r:
        h = 60 * (((g - b) / d) % 6);
        break;
      case g:
        h = 60 * ((b - r) / d + 2);
        break;
      default:
        h = 60 * ((r - g) / d + 4);
        break;
    }
  }
  if (h < 0) h += 360;
  return { h, s, l };
}

function hueBucket(hex: string) {
  const { h, s, l } = hexToHsl(hex);
  if (s < 0.14) return 'Paper / gray';
  if (l < 0.16) return 'Ink';
  if (h < 18 || h >= 345) return 'Red';
  if (h < 42) return 'Orange';
  if (h < 68) return 'Yellow';
  if (h < 155) return 'Green';
  if (h < 255) return 'Blue';
  if (h < 310) return 'Purple';
  return 'Pink';
}

const ORDER = ['Red', 'Orange', 'Yellow', 'Green', 'Blue', 'Purple', 'Pink', 'Paper / gray', 'Ink'];

export function ColorCheck() {
  const [data, setData] = useState<{
    setId: string;
    groups: Record<string, { id: string; name: string; hex: string; image: string }[]>;
  } | null>(null);

  useEffect(() => {
    void Promise.all([
      fetch('/data/colors.json').then((r) => r.json() as Promise<ColorsFile>),
      fetch('/data/cards-index.json').then((r) => r.json() as Promise<CardIndex>),
    ]).then(([colors, index]) => {
      const byId = new Map(index.id.map((id, i) => [id, i]));
      const groups: Record<string, { id: string; name: string; hex: string; image: string }[]> = {};
      for (const [id, swatches] of Object.entries(colors.cards)) {
        const top = swatches[0]?.hex ?? '#cccccc';
        const bucket = hueBucket(top);
        const i = byId.get(id);
        const name = i != null ? index.name[i] : id;
        const setId = i != null ? index.setId[i] : colors.setId;
        const number = i != null ? index.number[i] : '';
        (groups[bucket] ??= []).push({
          id,
          name,
          hex: top,
          image: derivedCardImageUrl(setId, number),
        });
      }
      setData({ setId: colors.setId, groups });
    });
  }, []);

  const buckets = useMemo(() => {
    if (!data) return [];
    return ORDER.filter((k) => data.groups[k]?.length).map((k) => [k, data.groups[k]] as const);
  }, [data]);

  if (!data) {
    return <p className="p-8 text-ink-soft">Sorting the paint box…</p>;
  }

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <p className="font-display text-xs tracking-[0.2em] text-accent uppercase">Gate 2</p>
      <h1 className="font-display mt-2 text-4xl text-ink">Color check — {data.setId}</h1>
      <p className="mt-3 max-w-2xl text-ink-soft">
        One set only. Cards grouped by the hue of their heaviest cluster. Water should land in
        Blue, fire in Orange/Red, Pikachu in Yellow.
      </p>
      {buckets.map(([bucket, cards]) => (
        <section key={bucket} className="mt-10">
          <h2 className="font-display text-2xl text-ink">
            {bucket}{' '}
            <span className="text-base text-ink-faint">({cards.length})</span>
          </h2>
          <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-5 md:grid-cols-8">
            {cards.map((c) => (
              <figure key={c.id} className="rounded-md border border-rule bg-paper-sun p-1.5 shadow-stamp">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={c.image} alt={c.name} loading="lazy" className="aspect-[5/7] w-full rounded-sm object-cover" />
                <figcaption className="mt-1 truncate text-[0.65rem] text-ink">{c.name}</figcaption>
                <div className="mt-1 h-2 rounded-sm" style={{ background: c.hex }} />
              </figure>
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}
