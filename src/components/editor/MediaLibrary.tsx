'use client';

import { useEffect, useState } from 'react';
import { sha256Hex } from '@/media/checksum';
import type { MediaBlob } from '@/persistence/types';
import { useStudioStore } from '@/state/studioStore';
import { useConfirmWithUndo } from '@/components/editor/ConfirmWithUndoToast';

const ACCEPT = 'image/png,image/jpeg,image/webp';

function previewUrl(blob: MediaBlob) {
  return URL.createObjectURL(new Blob([blob.bytes], { type: blob.mime }));
}

export function MediaLibrary({
  onSelect,
}: {
  onSelect?: (asset: MediaBlob) => void;
}) {
  const { media, refreshMedia, importMedia, removeMedia, restoreMedia } = useStudioStore();
  const { ask, host } = useConfirmWithUndo<MediaBlob>();
  const [error, setError] = useState<string | null>(null);
  const [urls, setUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    void refreshMedia();
  }, [refreshMedia]);

  useEffect(() => {
    const next: Record<string, string> = {};
    for (const item of media) next[item.id] = previewUrl(item);
    setUrls(next);
    return () => {
      Object.values(next).forEach((u) => URL.revokeObjectURL(u));
    };
  }, [media]);

  return (
    <section className="flex flex-col gap-3 border-t border-rule p-4">
      <header>
        <p className="font-display text-xs tracking-[0.2em] text-accent uppercase">Art box</p>
        <p className="text-xs text-ink-faint">Originals stay untouched — we only remember how you crop later.</p>
      </header>
      <label className="cursor-pointer rounded-md border border-rule bg-paper-sun px-3 py-2 text-center text-sm text-ink shadow-stamp">
        Add png, jpg, or webp
        <input
          type="file"
          accept={ACCEPT}
          className="sr-only"
          onChange={async (event) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (!file) return;
            if (!ACCEPT.split(',').includes(file.type) && file.type !== 'image/jpg') {
              setError('That file isn’t a png, jpg, or webp.');
              return;
            }
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
              setError('Could not keep that picture.');
            }
          }}
        />
      </label>
      {error ? <p className="text-xs text-accent-ink">{error}</p> : null}
      <ul className="grid grid-cols-2 gap-2">
        {media.length === 0 ? (
          <li className="col-span-2 text-xs text-ink-faint">Empty art box. Add a picture above.</li>
        ) : null}
        {media.map((item) => (
          <li key={item.id} className="overflow-hidden rounded-md border border-rule bg-paper-sun shadow-stamp">
            <button type="button" className="block w-full" onClick={() => onSelect?.(item)}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={urls[item.id]} alt="" className="aspect-square w-full object-cover" />
              <span className="block truncate px-1 py-0.5 text-[0.65rem] text-ink-soft">{item.fileName}</span>
            </button>
            <button
              type="button"
              className="px-1 pb-1 text-[0.65rem] text-accent-ink"
              onClick={() =>
                ask({
                  title: 'Remove this picture?',
                  body: 'The original leaves the art box. You can undo for a moment after.',
                  confirmLabel: 'Remove',
                  toastMessage: 'Picture removed.',
                  snapshot: item,
                  apply: () => removeMedia(item.id),
                  restore: (snap) => restoreMedia(snap),
                })
              }
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
      {host}
    </section>
  );
}
