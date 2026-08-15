'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { LayoutId, PageMode } from '@/domain/layouts';
import { useStudioStore } from '@/state/studioStore';

const LAYOUTS: LayoutId[] = ['2x2', '3x3', '4x3', '4x4'];

export function Shelf() {
  const router = useRouter();
  const { binders, loaded, refresh, create, rename, remove, restore } = useStudioStore();
  const [title, setTitle] = useState('My binder');
  const [layoutId, setLayoutId] = useState<LayoutId>('3x3');
  const [pageMode, setPageMode] = useState<PageMode>('double');
  const [pendingDelete, setPendingDelete] = useState<{ id: string; title: string } | null>(null);
  const [undoBinder, setUndoBinder] = useState<Awaited<ReturnType<typeof remove>>>(null);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <p className="font-display text-xs tracking-[0.2em] text-accent uppercase">The shelf</p>
      <h1 className="font-display mt-2 text-4xl text-ink">Your binders</h1>
      <p className="mt-2 text-ink-soft">
        Layout and page mode are chosen once, like buying a physical binder — they stay put.
      </p>

      <form
        className="mt-8 grid gap-3 rounded-lg border border-rule bg-paper-sun p-4 shadow-page sm:grid-cols-2"
        onSubmit={async (e) => {
          e.preventDefault();
          const binder = await create({ title, layoutId, pageMode });
          router.push(`/studio/${binder.id}`);
        }}
      >
        <label className="flex flex-col gap-1 text-sm text-ink-soft">
          Title
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="rounded-md border border-rule bg-paper px-3 py-2 text-ink shadow-stamp"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-ink-soft">
          Layout
          <select
            value={layoutId}
            onChange={(e) => setLayoutId(e.target.value as LayoutId)}
            className="rounded-md border border-rule bg-paper px-3 py-2 text-ink shadow-stamp"
          >
            {LAYOUTS.map((id) => (
              <option key={id} value={id}>
                {id}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm text-ink-soft">
          Page mode
          <select
            value={pageMode}
            onChange={(e) => setPageMode(e.target.value as PageMode)}
            className="rounded-md border border-rule bg-paper px-3 py-2 text-ink shadow-stamp"
          >
            <option value="double">Double (facing spreads)</option>
            <option value="single">Single</option>
          </select>
        </label>
        <button
          type="submit"
          className="self-end rounded-md bg-accent px-4 py-2 font-display text-paper-sun shadow-stamp"
        >
          Start a binder
        </button>
      </form>

      <ul className="mt-10 grid gap-4 sm:grid-cols-2">
        {!loaded ? <li className="text-ink-soft">Dusting the shelf…</li> : null}
        {loaded && binders.length === 0 ? (
          <li className="text-ink-soft">Empty shelf. Start one above — it stays on this device.</li>
        ) : null}
        {binders.map((b) => (
          <li
            key={b.id}
            className="flex items-stretch overflow-hidden rounded-lg border border-rule bg-paper-sun shadow-page"
          >
            <div
              className="w-8 texture-linen"
              style={{ backgroundColor: 'var(--color-accent-soft)' }}
              aria-hidden
            />
            <div className="flex flex-1 flex-col gap-2 p-4">
              <button
                type="button"
                className="font-display text-left text-xl text-ink"
                onClick={() => router.push(`/studio/${b.id}`)}
              >
                {b.title}
              </button>
              <p className="text-xs text-ink-faint">
                {b.layoutId} · {b.pageMode} · {b.pages.length} pages
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="text-sm text-accent"
                  onClick={async () => {
                    const next = window.prompt('Rename binder', b.title);
                    if (next) await rename(b.id, next);
                  }}
                >
                  Rename
                </button>
                <button
                  type="button"
                  className="text-sm text-accent-ink"
                  onClick={() => setPendingDelete({ id: b.id, title: b.title })}
                >
                  Delete
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {pendingDelete ? (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-ink/40">
          <div className="max-w-sm rounded-lg border border-rule bg-paper p-5 shadow-lift">
            <p className="font-display text-xl text-ink">Put this binder away?</p>
            <p className="mt-2 text-sm text-ink-soft">
              “{pendingDelete.title}” will leave the shelf. You can undo for a moment after.
            </p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                className="rounded-md bg-accent px-3 py-1.5 text-paper-sun"
                onClick={async () => {
                  const snapshot = await remove(pendingDelete.id);
                  setUndoBinder(snapshot);
                  setPendingDelete(null);
                }}
              >
                Delete
              </button>
              <button type="button" className="rounded-md px-3 py-1.5 text-ink-soft" onClick={() => setPendingDelete(null)}>
                Keep it
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {undoBinder ? (
        <div className="fixed bottom-6 left-1/2 z-20 -translate-x-1/2 rounded-md border border-rule bg-paper-sun px-4 py-3 shadow-lift">
          Binder removed.{' '}
          <button
            type="button"
            className="text-accent underline"
            onClick={async () => {
              await restore(undoBinder);
              setUndoBinder(null);
            }}
          >
            Undo
          </button>
        </div>
      ) : null}

      {/* TODO T5.3: replace this dev-only shelf gate with a real session check. */}
    </main>
  );
}
