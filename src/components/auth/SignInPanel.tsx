'use client';

import { useState } from 'react';
import { Panel } from '@/components/ui/Panel';
import { Marker } from '@/components/ui/Marker';
import { createBrowserSupabase } from '@/persistence/supabaseBrowser';

/**
 * Accounts are optional and, in a build with no Supabase keys, unavailable.
 *
 * Rather than show a form that silently fails, the panel checks first and says
 * plainly that accounts are off, keeping the on-device path as the promise it
 * can actually keep.
 */
export function SignInPanel() {
  const configured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
  const [email, setEmail] = useState('');
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!configured) {
    return (
      <Panel title="Accounts" stepped>
        <p className="text-sm text-ink-soft">
          Accounts are not switched on in this build, so there is no sign-in to offer yet.
          Everything you design is saved in this browser and stays there.
        </p>
        <p className="mt-2">
          <Marker tone="note">Sign-in disabled in this build</Marker>
        </p>
      </Panel>
    );
  }

  return (
    <Panel title="Save to an account" stepped>
      <form
        className="grid max-w-md gap-2"
        onSubmit={async (event) => {
          event.preventDefault();
          const supabase = createBrowserSupabase();
          if (!supabase) return;
          setBusy(true);
          const { error } = await supabase.auth.signInWithOtp({
            email,
            options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
          });
          setBusy(false);
          setNote(
            error
              ? 'Could not send that link. Your work is still saved in this browser.'
              : 'Check your email for a sign-in link.',
          );
        }}
      >
        <label className="grid gap-1">
          <span className="gb-label">Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="gb-input"
          />
        </label>
        <button type="submit" className="gb-btn gb-btn--primary" disabled={busy}>
          {busy ? 'Sending…' : 'Email me a sign-in link'}
        </button>
        {note ? (
          <p className="text-mini text-ink-soft" role="status">
            {note}
          </p>
        ) : null}
      </form>
    </Panel>
  );
}
