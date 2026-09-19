'use client';

import { useEffect, useState } from 'react';
import { ensureCatalog } from '@/search';

/**
 * Card ids to display names.
 *
 * A placement stores only the card id, so without this the binder and the pull
 * list show "base1-58" where a person expects "Pikachu". The catalog is the
 * same cached index search already uses, so this costs nothing extra once the
 * editor has prefetched it.
 */
export function useCardNames(cardIds: string[]): Record<string, string> {
  const [names, setNames] = useState<Record<string, string>>({});
  const key = cardIds.slice().sort().join(',');

  useEffect(() => {
    if (!key) return;
    let alive = true;
    ensureCatalog().then(
      (catalog) => {
        if (!alive) return;
        const next: Record<string, string> = {};
        for (const id of key.split(',')) {
          const i = catalog.index.id.indexOf(id);
          if (i >= 0) next[id] = catalog.index.name[i];
        }
        setNames(next);
      },
      () => {
        /* Names stay as ids; the binder is still usable offline. */
      },
    );
    return () => {
      alive = false;
    };
  }, [key]);

  return names;
}
