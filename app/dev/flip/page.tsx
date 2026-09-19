'use client';

import { useState } from 'react';
import { BinderViewer, type ViewerSpread } from '@/components/binder/BinderViewer';
import { TemplateSpread } from '@/components/landing/TemplateSpread';
import starter from '@/templates/catalog/starter-binder.json';
import type { TemplateFile } from '@/templates/types';

const template = starter as TemplateFile;

/**
 * The M1 page-turn prototype, now running the same component the product uses,
 * so the prototype and the shipped binder cannot drift apart.
 * `?lowperf=1` or `?mode=2d` forces the 2D fallback.
 */
export default function FlipPage() {
  const [index, setIndex] = useState(0);
  const pages = template.pages.slice().sort((a, b) => a.position - b.position);

  const spreads: ViewerSpread[] = [
    { left: null, right: <TemplateSpread template={template} pageId={pages[0].id} /> },
  ];
  for (let i = 1; i < pages.length; i += 2) {
    spreads.push({
      left: pages[i] ? <TemplateSpread template={template} pageId={pages[i].id} /> : null,
      right: pages[i + 1] ? <TemplateSpread template={template} pageId={pages[i + 1].id} /> : null,
    });
  }

  return (
    <main className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-8">
      <header>
        <p className="gb-label">Prototype</p>
        <h1 className="mt-1 text-3xl">Page turn</h1>
      </header>
      <BinderViewer
        layoutId={template.layoutId}
        spreads={spreads}
        index={index}
        onIndexChange={setIndex}
        label="Prototype"
      />
    </main>
  );
}
