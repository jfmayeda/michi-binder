'use client';

import { useState } from 'react';
import { createBrowserSupabase } from '@/persistence/supabaseBrowser';

export function SignInPanel() {
  const [email, setEmail] = useState('');
  const [note, setNote] = useState<string | null>(null);

  return (
    <form
      className="mt-6 flex max-w-md flex-col gap-2"
      onSubmit={async (event) => {
        event.preventDefault();
        const supabase = createBrowserSupabase();
        if (!supabase) {
          setNote('Sign-in isn’t wired in this environment yet. The playground still works on this device.');
          return;
        }
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
        });
        setNote(
          error
            ? 'Could not send a magic link. You can keep designing in the playground.'
            : 'Check your email for a magic link.',
        );
      }}
    >
      <p className="font-display text-sm text-ink">Save this binder to an account</p>
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        className="rounded-md border border-rule bg-paper-sun px-3 py-2 text-ink shadow-stamp"
      />
      <button type="submit" className="rounded-md bg-accent px-3 py-2 text-sm text-paper-sun shadow-stamp">
        Email me a link
      </button>
      <button
        type="button"
        className="text-sm text-accent"
        onClick={async () => {
          const supabase = createBrowserSupabase();
          if (!supabase) {
            setNote('Sign-in isn’t wired in this environment yet. The playground still works on this device.');
            return;
          }
          const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: `${window.location.origin}/auth/callback` },
          });
          if (error) {
            setNote('Google sign-in isn’t available yet. Try a magic link, or keep designing in the playground.');
          }
        }}
      >
        Continue with Google
      </button>
      {note ? <p className="text-xs text-ink-soft">{note}</p> : null}
    </form>
  );
}
