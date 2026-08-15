'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserSupabase } from '@/persistence/supabaseBrowser';
import { createBrowserPlaygroundAdapter } from '@/persistence';
import { migratePlayground } from '@/persistence/migratePlayground';
import { SupabaseAdapter } from '@/persistence/supabaseAdapter';

export default function AuthCallbackPage() {
  const router = useRouter();
  useEffect(() => {
    void (async () => {
      const supabase = createBrowserSupabase();
      if (!supabase) {
        router.replace('/');
        return;
      }
      await supabase.auth.exchangeCodeForSession(window.location.href).catch(() => undefined);
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.replace('/');
        return;
      }
      await migratePlayground({
        playground: createBrowserPlaygroundAdapter(),
        remote: new SupabaseAdapter(supabase, data.session.user.id),
      });
      router.replace('/shelf');
    })();
  }, [router]);
  return <p className="p-8 text-ink-soft">Opening your shelf…</p>;
}
