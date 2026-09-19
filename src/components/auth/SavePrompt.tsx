'use client';

import { Dialog } from '@/components/ui/Dialog';
import { SignInPanel } from '@/components/auth/SignInPanel';

export function SavePrompt({ onDismiss }: { onDismiss: () => void }) {
  return (
    <Dialog
      title="One page at a time, for now"
      description="Without an account this browser holds a single page. An account is what unlocks a whole binder."
      onClose={onDismiss}
      footer={
        <button type="button" className="gb-btn" onClick={onDismiss}>
          Keep working on this page
        </button>
      }
    >
      <SignInPanel />
    </Dialog>
  );
}
