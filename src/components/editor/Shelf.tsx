'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { LayoutId, PageMode } from '@/domain/layouts';
import { LAYOUTS as LAYOUT_DEFS } from '@/domain/layouts';
import type { Binder } from '@/domain/types';
import { useConfirmWithUndo } from '@/components/editor/ConfirmWithUndoToast';
import { useStudioStore } from '@/state/studioStore';
import { pageTemplates } from '@/templates/catalog';
import { cloneTemplatePage } from '@/templates/clone';
import { Panel } from '@/components/ui/Panel';

const LAYOUT_IDS: LayoutId[] = ['2x2', '3x3', '4x3', '4x4'];

export function Shelf() {
  const router = useRouter();
  const { binders, loaded, refresh, create, rename, remove, restore } = useStudioStore();
  const [title, setTitle] = useState('My binder');
  const [layoutId, setLayoutId] = useState<LayoutId>('3x3');
  const [pageMode, setPageMode] = useState<PageMode>('double');
  const [templateId, setTemplateId] = useState('');
  const { ask, host } = useConfirmWithUndo<Binder>();

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const layout = LAYOUT_DEFS[layoutId];

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <header className="mb-6">
        <p className="gb-label">The shelf</p>
        <h1 className="mt-1 text-3xl">Your binders</h1>
        <p className="mt-2 max-w-prose text-ink-soft">
          Pocket layout and single-or-facing pages are picked once, the way you pick a physical
          binder. They stay as they are for the life of the binder.
        </p>
      </header>

      <Panel title="Start a binder" stepped>
        <form
          className="grid gap-3 sm:grid-cols-2"
          onSubmit={async (e) => {
            e.preventDefault();
            const picked = pageTemplates.find((t) => t.id === templateId);
            if (picked) {
              const cloned = cloneTemplatePage(picked, 1, crypto.randomUUID());
              cloned.title = title;
              await restore(cloned);
              await refresh();
              router.push(`/studio/${cloned.id}`);
              return;
            }
            const binder = await create({ title, layoutId, pageMode });
            router.push(`/studio/${binder.id}`);
          }}
        >
          <label className="grid gap-1 sm:col-span-2">
            <span className="gb-label">Name</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="gb-input" />
          </label>
          <label className="grid gap-1">
            <span className="gb-label">Pockets per page</span>
            <select
              value={layoutId}
              onChange={(e) => setLayoutId(e.target.value as LayoutId)}
              className="gb-select"
            >
              {LAYOUT_IDS.map((id) => (
                <option key={id} value={id}>
                  {LAYOUT_DEFS[id].rows} × {LAYOUT_DEFS[id].cols}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1">
            <span className="gb-label">How pages show</span>
            <select
              value={pageMode}
              onChange={(e) => setPageMode(e.target.value as PageMode)}
              className="gb-select"
            >
              <option value="double">Two facing pages</option>
              <option value="single">One page at a time</option>
            </select>
          </label>
          <label className="grid gap-1 sm:col-span-2">
            <span className="gb-label">Or start from a draft template</span>
            <select
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
              className="gb-select"
            >
              <option value="">Empty binder</option>
              {pageTemplates.map((tpl) => (
                <option key={tpl.id} value={tpl.id}>
                  {tpl.title}
                </option>
              ))}
            </select>
          </label>
          <p className="gb-num text-mini text-ink-soft sm:col-span-2">
            A page will be {layout.cols * 7} × {layout.rows * 9.5} cm of pockets.
          </p>
          <button type="submit" className="gb-btn gb-btn--primary sm:col-span-2">
            Start it
          </button>
        </form>
      </Panel>

      <h2 className="gb-label mt-8 mb-2">On the shelf</h2>
      {!loaded ? <p className="text-ink-soft">Looking…</p> : null}
      {loaded && binders.length === 0 ? (
        <Panel title="Empty shelf">
          <p className="text-sm text-ink-soft">
            Nothing here yet. Start one above — it is kept in this browser.
          </p>
        </Panel>
      ) : null}

      <ul className="grid gap-3 sm:grid-cols-2">
        {binders.map((b) => (
          <li key={b.id}>
            <Panel
              title={b.title}
              count={`${b.pages.length} ${b.pages.length === 1 ? 'page' : 'pages'}`}
              stepped
            >
              <p className="gb-num text-mini text-ink-soft">
                {LAYOUT_DEFS[b.layoutId].rows} × {LAYOUT_DEFS[b.layoutId].cols} pockets ·{' '}
                {b.pageMode === 'double' ? 'facing pages' : 'one page at a time'} ·{' '}
                {b.placements.length} placed
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="gb-btn gb-btn--primary"
                  onClick={() => router.push(`/studio/${b.id}`)}
                >
                  Open
                </button>
                <button
                  type="button"
                  className="gb-btn"
                  onClick={async () => {
                    const next = window.prompt('Rename this binder', b.title);
                    if (next) await rename(b.id, next);
                  }}
                >
                  Rename
                </button>
                <button
                  type="button"
                  className="gb-btn"
                  onClick={() =>
                    ask({
                      title: `Put “${b.title}” away?`,
                      body: 'It leaves the shelf with everything on its pages.',
                      confirmLabel: 'Delete it',
                      toastMessage: 'Binder removed.',
                      snapshot: b,
                      apply: async () => {
                        await remove(b.id);
                      },
                      restore: async (snapshot) => {
                        await restore(snapshot);
                      },
                    })
                  }
                >
                  Delete
                </button>
              </div>
            </Panel>
          </li>
        ))}
      </ul>

      {host}
    </main>
  );
}
