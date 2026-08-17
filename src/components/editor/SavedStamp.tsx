'use client';

import type { SaveStatus } from '@/state/saveQueue';

export function SavedStamp({ status, onRetry }: { status: SaveStatus; onRetry: () => void }) {
  if (status === 'saving') {
    return <p className="text-xs tracking-wide text-ink-faint uppercase">Pressing the page…</p>;
  }
  if (status === 'offline') {
    return (
      <p className="text-xs text-ink-soft">
        Kept on this desk.{' '}
        <button type="button" className="text-accent underline decoration-accent-soft" onClick={onRetry}>
          Stamp when the line is back
        </button>
      </p>
    );
  }
  if (status === 'error') {
    return (
      <p className="text-xs text-accent-ink">
        Couldn’t stamp.{' '}
        <button type="button" className="underline decoration-accent-soft" onClick={onRetry}>
          Try again
        </button>
      </p>
    );
  }
  return (
    <p className="inline-flex items-center gap-1 rounded-sm border border-accent-soft bg-accent-soft/40 px-2 py-0.5 text-xs tracking-wide text-accent-ink uppercase shadow-stamp">
      Stamped
    </p>
  );
}
