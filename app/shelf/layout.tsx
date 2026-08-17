'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserSupabase } from '@/persistence/supabaseBrowser';

/**
 * Shelf is authed-only in every build. Anonymous visitors go to landing / playground.
 */
export default function ShelfLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ok, setOk] = useState(false);

  useEffect(() => {
    void (async () => {
      const supabase = createBrowserSupabase();
      if (!supabase) {
        router.replace('/');
        return;
      }
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.replace('/');
        return;
      }
      setOk(true);
    })();
  }, [router]);

  if (!ok) return <p className="p-8 text-ink-soft">Checking the desk drawer…</p>;
  return children;
}
