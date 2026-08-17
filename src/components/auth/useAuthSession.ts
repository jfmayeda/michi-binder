'use client';

import { useEffect, useState } from 'react';
import { createBrowserSupabase } from '@/persistence/supabaseBrowser';

export function useAuthSession() {
  const [state, setState] = useState<'loading' | 'anon' | 'user'>('loading');

  useEffect(() => {
    let alive = true;
    void (async () => {
      const supabase = createBrowserSupabase();
      if (!supabase) {
        if (alive) setState('anon');
        return;
      }
      const { data } = await supabase.auth.getSession();
      if (alive) setState(data.session ? 'user' : 'anon');
    })();
    return () => {
      alive = false;
    };
  }, []);

  return state;
}
