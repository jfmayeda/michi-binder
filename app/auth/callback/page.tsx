'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserSupabase } from '@/persistence/supabaseBrowser';

export default function AuthCallbackPage() {
  const router = useRouter();
  useEffect(() => {
    const supabase = createBrowserSupabase();
    if (!supabase) {
      router.replace('/');
      return;
    }
    void supabase.auth.exchangeCodeForSession(window.location.href).finally(() => {
      router.replace('/shelf');
    });
  }, [router]);
  return <p className="p-8 text-ink-soft">Opening your shelf…</p>;
}
