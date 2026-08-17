'use client';

import { SignInPanel } from '@/components/auth/SignInPanel';

export function SavePrompt({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="fixed inset-0 z-20 flex items-end justify-center bg-ink/30 p-4 sm:items-center">
      <div className="w-full max-w-md rounded-lg border border-rule bg-paper p-5 shadow-lift">
        <p className="font-display text-xl text-ink">Keep this page?</p>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          The playground holds one scrap page on this device. An account gives you a whole binder
          — this spread comes with you.
        </p>
        <SignInPanel />
        <button type="button" className="mt-3 text-sm text-ink-faint" onClick={onDismiss}>
          Stay on this page a little longer
        </button>
      </div>
    </div>
  );
}
