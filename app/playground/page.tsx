'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserPlaygroundAdapter } from '@/persistence';
import { ensurePlaygroundBinder } from '@/persistence/playgroundBinder';

export default function PlaygroundPage() {
  const router = useRouter();
  useEffect(() => {
    void (async () => {
      const binder = await ensurePlaygroundBinder(createBrowserPlaygroundAdapter());
      router.replace(`/studio/${binder.id}`);
    })();
  }, [router]);
  return <p className="p-8 text-ink-soft">Opening your scrap page…</p>;
}
