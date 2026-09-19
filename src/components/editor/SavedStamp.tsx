'use client';

import { Marker } from '@/components/ui/Marker';
import type { SaveStatus } from '@/state/saveQueue';

/**
 * Save state, always visible in the status area. Each state carries a glyph
 * and words, and the two recoverable ones carry the recovery action with them.
 */
export function SavedStamp({ status, onRetry }: { status: SaveStatus; onRetry: () => void }) {
  if (status === 'saving') {
    return (
      <span className="gb-label" role="status" aria-live="polite">
        Saving…
      </span>
    );
  }
  if (status === 'offline') {
    return (
      <span className="flex items-center gap-1.5" role="status" aria-live="polite">
        <Marker tone="note">Offline — kept on this device</Marker>
        <button type="button" className="gb-btn gb-btn--quiet !min-h-7 !px-1.5 text-micro" onClick={onRetry}>
          Retry
        </button>
      </span>
    );
  }
  if (status === 'error') {
    return (
      <span className="flex items-center gap-1.5" role="status" aria-live="polite">
        <Marker tone="wanted">Could not save</Marker>
        <button type="button" className="gb-btn gb-btn--quiet !min-h-7 !px-1.5 text-micro" onClick={onRetry}>
          Try again
        </button>
      </span>
    );
  }
  return (
    <span role="status" aria-live="polite">
      <Marker tone="owned">Saved on this device</Marker>
    </span>
  );
}
