'use client';

import { SearchPanel } from '@/components/search/SearchPanel';
import { Panel } from '@/components/ui/Panel';

export default function DevSearchPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      <p className="gb-label">Prototype</p>
      <h1 className="mt-1 mb-4 text-3xl">Card box</h1>
      <Panel title="Card box" active flush className="h-[70dvh]" bodyClassName="flex min-h-0 flex-col">
        <SearchPanel columns={4} />
      </Panel>
    </main>
  );
}
