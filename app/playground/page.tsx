'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserPlaygroundAdapter } from '@/persistence';
import { ensurePlaygroundBinder } from '@/persistence/playgroundBinder';

export default function PlaygroundPage() {
  const router = useRouter();
  useEffect(() => {
    void ensurePlaygroundBinder(createBrowserPlaygroundAdapter()).then((binder) => {
      router.replace(`/studio/${binder.id}`);
    });
  }, [router]);
  return (
    <main className="grid min-h-dvh place-items-center p-8">
      <p className="gb-label">Opening your page…</p>
    </main>
  );
}
