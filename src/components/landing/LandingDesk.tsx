'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Binder2D } from '@/components/binder/Binder2D';
import { FlipBinder } from '@/components/binder/FlipBinder';
import {
  persistRenderMode,
  probeFrameTimes,
  readForcedLowPerf,
  readStoredRenderMode,
  type RenderMode,
} from '@/components/binder/renderMode';
import { createBrowserPlaygroundAdapter } from '@/persistence';
import { ensurePlaygroundBinder, PLAYGROUND_BINDER_ID } from '@/persistence/playgroundBinder';
import { cloneTemplatePage } from '@/templates/clone';
import { templateToPages } from '@/templates/showcase';
import starter from '@/templates/catalog/starter-binder.json';
import type { TemplateFile } from '@/templates/types';

const starterTemplate = starter as TemplateFile;

export function LandingDesk() {
  const router = useRouter();
  const [mode, setMode] = useState<RenderMode | null>(null);
  const [spread, setSpread] = useState(0);
  const probed = useRef(false);
  const pages = templateToPages(starterTemplate);

  useEffect(() => {
    if (readForcedLowPerf()) {
      setMode('2d');
      return;
    }
    setMode(readStoredRenderMode() ?? '3d');
  }, []);

  const onFlipMotionStart = useCallback(() => {
    if (probed.current) return;
    probed.current = true;
    if (readForcedLowPerf() || readStoredRenderMode()) return;
    void probeFrameTimes(700).then((result) => {
      if (result.shouldDegrade) {
        setMode('2d');
        persistRenderMode('2d');
      }
    });
  }, []);

  const openPlayground = async (clone: boolean) => {
    const adapter = createBrowserPlaygroundAdapter();
    if (clone) {
      const pagePosition = spread === 0 ? 1 : spread * 2 + 1;
      const binder = cloneTemplatePage(starterTemplate, pagePosition);
      await adapter.saveBinder(binder);
    } else {
      const existing = await adapter.getBinder(PLAYGROUND_BINDER_ID);
      if (!existing) await ensurePlaygroundBinder(adapter);
    }
    router.push(`/studio/${PLAYGROUND_BINDER_ID}`);
  };

  if (!mode) return <div className="binder-desk" />;

  return (
    <div>
      {mode === '3d' ? (
        <FlipBinder
          pages={pages}
          hint="Flip the starter scrapbook — cards on these pages are baked in, so the big catalog stays asleep."
          onFlipMotionStart={onFlipMotionStart}
          onSpreadChange={setSpread}
        />
      ) : (
        <Binder2D
          pages={pages}
          hint="2D mode — same starter scrapbook, quieter motion."
          onFlipMotionStart={onFlipMotionStart}
          onSpreadChange={setSpread}
        />
      )}
      <div className="mx-auto mt-4 flex max-w-xl flex-wrap justify-center gap-3 px-4 pb-10">
        <button
          type="button"
          className="rounded-md bg-accent px-4 py-2 font-display text-paper-sun shadow-stamp"
          onClick={() => void openPlayground(true)}
        >
          Clone this page
        </button>
        <button
          type="button"
          className="rounded-md bg-paper-sun px-4 py-2 font-display text-ink shadow-stamp"
          onClick={() => void openPlayground(false)}
        >
          Start from scratch
        </button>
      </div>
    </div>
  );
}
