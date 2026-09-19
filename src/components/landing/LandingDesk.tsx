'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BinderViewer, type ViewerSpread } from '@/components/binder/BinderViewer';
import { TemplateSpread } from '@/components/landing/TemplateSpread';
import { Dialog } from '@/components/ui/Dialog';
import { createBrowserPlaygroundAdapter } from '@/persistence';
import { ensurePlaygroundBinder, PLAYGROUND_BINDER_ID } from '@/persistence/playgroundBinder';
import { cloneTemplatePage } from '@/templates/clone';
import starter from '@/templates/catalog/starter-binder.json';
import type { TemplateFile } from '@/templates/types';

const template = starter as TemplateFile;

/** Facing pairs: spread 0 is the inside cover plus page 1, then (2,3), (4,5)… */
function buildSpreads(file: TemplateFile) {
  const pages = file.pages.slice().sort((a, b) => a.position - b.position);
  const out: { left: string | null; right: string | null }[] = [
    { left: null, right: pages[0]?.id ?? null },
  ];
  for (let i = 1; i < pages.length; i += 2) {
    out.push({ left: pages[i]?.id ?? null, right: pages[i + 1]?.id ?? null });
  }
  return out;
}

export function LandingDesk() {
  const router = useRouter();
  const [index, setIndex] = useState(1);
  const [confirmReplace, setConfirmReplace] = useState(false);
  const [busy, setBusy] = useState(false);

  const pageSpreads = useMemo(() => buildSpreads(template), []);
  const viewerSpreads: ViewerSpread[] = pageSpreads.map((s) => ({
    left: s.left ? <TemplateSpread template={template} pageId={s.left} /> : null,
    right: s.right ? <TemplateSpread template={template} pageId={s.right} /> : null,
  }));

  /** The page whose copy the primary action would open. */
  const visiblePagePosition = index === 0 ? 1 : index * 2 + 1;

  const openCopy = async (force: boolean) => {
    const adapter = createBrowserPlaygroundAdapter();
    const existing = await adapter.getBinder(PLAYGROUND_BINDER_ID);
    const hasWork = Boolean(existing && existing.placements.length > 0);
    if (hasWork && !force) {
      setConfirmReplace(true);
      return;
    }
    setBusy(true);
    const copy = cloneTemplatePage(template, visiblePagePosition, PLAYGROUND_BINDER_ID);
    await adapter.saveBinder(copy);
    router.push(`/studio/${PLAYGROUND_BINDER_ID}`);
  };

  const openBlank = async () => {
    setBusy(true);
    const adapter = createBrowserPlaygroundAdapter();
    const binder = await ensurePlaygroundBinder(adapter);
    router.push(`/studio/${binder.id}`);
  };

  return (
    <div className="flex flex-col items-center gap-5">
      <BinderViewer
        layoutId={template.layoutId}
        spreads={viewerSpreads}
        index={index}
        onIndexChange={setIndex}
        label="Starter binder"
        maxWidth="46rem"
      />

      <div className="flex flex-col items-center gap-2">
        <button
          type="button"
          className="gb-btn gb-btn--primary gb-btn--lg"
          disabled={busy}
          onClick={() => void openCopy(false)}
        >
          {busy ? 'Opening…' : 'Edit a copy of this page'}
        </button>
        <button
          type="button"
          className="gb-btn gb-btn--quiet"
          disabled={busy}
          onClick={() => void openBlank()}
        >
          or start with an empty page
        </button>
        <p className="max-w-prose text-center text-mini text-ink-soft">
          No account needed. Your page is saved in this browser.
        </p>
      </div>

      {confirmReplace ? (
        <Dialog
          title="Replace the page you already have?"
          description="There is already a page saved in this browser with cards on it. Opening a copy of the starter page will take its place."
          onClose={() => setConfirmReplace(false)}
          width="sm"
          footer={
            <>
              <button
                type="button"
                className="gb-btn"
                onClick={() => {
                  setConfirmReplace(false);
                  void openBlank();
                }}
              >
                Open my page instead
              </button>
              <button
                type="button"
                className="gb-btn gb-btn--primary"
                onClick={() => {
                  setConfirmReplace(false);
                  void openCopy(true);
                }}
              >
                Replace it
              </button>
            </>
          }
        >
          <p className="text-sm text-ink-soft">
            This cannot be undone, so open your own page first if you are not sure.
          </p>
        </Dialog>
      ) : null}
    </div>
  );
}
