'use client';

import { useEffect, useMemo, useState } from 'react';
import { sha256Hex } from '@/media/checksum';
import type { MediaBlob } from '@/persistence/types';
import { useStudioStore } from '@/state/studioStore';

const ACCEPT = 'image/png,image/jpeg,image/webp';

export type PackItem = { id: string; file: string; title: string };
type Pack = { id: string; title: string; items: PackItem[] };

/**
 * The art box. Uploads stay byte-for-byte as imported — cropping is stored as
 * a transform on the placement, never applied to the original — so anything
 * you place can be re-fitted later without losing the source.
 */
export function MediaLibrary({
  onSelect,
  onSelectPack,
  selectedId,
  onRemove,
}: {
  onSelect?: (asset: MediaBlob) => void;
  onSelectPack?: (item: PackItem) => void;
  selectedId?: string | null;
  onRemove?: (asset: MediaBlob) => void;
}) {
  const { media, refreshMedia, importMedia } = useStudioStore();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [packs, setPacks] = useState<Pack[]>([]);

  useEffect(() => {
    void refreshMedia();
    let alive = true;
    void fetch('/art-packs/manifest.json')
      .then((r) => r.json())
      .then((data: { packs: Pack[] }) => {
        if (alive) setPacks(data.packs);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [refreshMedia]);

  // Object URLs are derived from media, not stored in state, so there is no
  // set-state-in-effect cascade and no chance of rendering a revoked URL.
  const urls = useMemo(() => {
    const map: Record<string, string> = {};
    for (const item of media) {
      map[item.id] = URL.createObjectURL(new Blob([item.bytes], { type: item.mime }));
    }
    return map;
  }, [media]);

  useEffect(() => {
    return () => {
      Object.values(urls).forEach((u) => URL.revokeObjectURL(u));
    };
  }, [urls]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex-none border-b border-rule p-3">
        <label className="gb-btn gb-btn--primary w-full cursor-pointer">
          {busy ? 'Reading the picture…' : 'Add a picture'}
          <input
            type="file"
            accept={ACCEPT}
            className="gb-sr"
            disabled={busy}
            onChange={async (event) => {
              const file = event.target.files?.[0];
              event.target.value = '';
              if (!file) return;
              if (!ACCEPT.split(',').includes(file.type) && file.type !== 'image/jpg') {
                setError('That file has to be a png, jpg or webp.');
                return;
              }
              setBusy(true);
              try {
                const bytes = await file.arrayBuffer();
                const sha256 = await sha256Hex(bytes);
                const bmp = await createImageBitmap(file);
                await importMedia({
                  id: crypto.randomUUID(),
                  bytes,
                  mime: file.type,
                  fileName: file.name,
                  widthPx: bmp.width,
                  heightPx: bmp.height,
                  sha256,
                });
                bmp.close();
                setError(null);
              } catch {
                setError('Could not read that picture.');
              } finally {
                setBusy(false);
              }
            }}
          />
        </label>
        <p className="mt-2 text-micro text-ink-soft">
          Your original is kept as-is. Cropping is remembered separately, so you can re-fit it
          any time.
        </p>
        {error ? (
          <p className="mt-2 text-mini text-red-ink" role="alert">
            {error}
          </p>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        <p className="gb-label mb-2">Your pictures</p>
        {media.length === 0 ? (
          <p className="text-mini text-ink-soft">
            Nothing here yet. Add a picture above, then click a pocket to place it.
          </p>
        ) : (
          <ul className="grid grid-cols-2 gap-2">
            {media.map((item) => (
              <li key={item.id} className="relative">
                <button
                  type="button"
                  aria-pressed={selectedId === item.id}
                  aria-label={`Use ${item.fileName}`}
                  onClick={() => onSelect?.(item)}
                  className={`block w-full overflow-hidden rounded-sm border text-left ${
                    selectedId === item.id
                      ? 'border-ink bg-red-wash shadow-[var(--shadow-step-sm)]'
                      : 'border-rule bg-paper-raised hover:border-ink'
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={urls[item.id]}
                    alt=""
                    className="aspect-[7/9.5] w-full bg-paper-sunk object-contain"
                  />
                  <span className="block truncate px-1 py-1 text-micro text-ink-soft">
                    {item.fileName}
                  </span>
                </button>
                {onRemove ? (
                  <button
                    type="button"
                    className="gb-icon-btn absolute top-1 right-1 !h-6 !w-6 bg-paper-raised text-mini"
                    aria-label={`Remove ${item.fileName}`}
                    onClick={() => onRemove(item)}
                  >
                    <span aria-hidden="true">×</span>
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        )}

        {packs.map((pack) => (
          <div key={pack.id} className="mt-4">
            <p className="gb-label mb-2">{pack.title}</p>
            <ul className="grid grid-cols-2 gap-2">
              {pack.items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    aria-label={`Use ${item.title}`}
                    onClick={() => onSelectPack?.(item)}
                    className="block w-full overflow-hidden rounded-sm border border-rule bg-paper-raised text-left hover:border-ink"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.file}
                      alt=""
                      className="aspect-[7/9.5] w-full bg-paper-sunk object-contain"
                    />
                    <span className="block truncate px-1 py-1 text-micro text-ink-soft">
                      {item.title}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
