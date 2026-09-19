'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserSupabase } from '@/persistence/supabaseBrowser';

/**
 * The shelf needs an account. Without one — including in a build with no
 * Supabase keys — visitors go back to the landing page, which offers the
 * on-device page that does work.
 */
export default function ShelfLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ok, setOk] = useState(false);

  useEffect(() => {
    let alive = true;
    const supabase = createBrowserSupabase();
    if (!supabase) {
      router.replace('/');
      return;
    }
    void supabase.auth.getSession().then(({ data }) => {
      if (!alive) return;
      if (!data.session) router.replace('/');
      else setOk(true);
    });
    return () => {
      alive = false;
    };
  }, [router]);

  if (!ok) {
    return (
      <main className="grid min-h-dvh place-items-center p-8">
        <p className="gb-label">Checking your account…</p>
      </main>
    );
  }
  return children;
}
