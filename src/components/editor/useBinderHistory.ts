'use client';

import { useCallback, useRef, useState } from 'react';
import type { Binder } from '@/domain/types';

const LIMIT = 40;

export type HistoryEntry = { binder: Binder; label: string };

/**
 * One undo stack for every binder edit.
 *
 * The previous build only offered undo on the four actions that went through a
 * confirm dialog, so the most common destructive action in the editor —
 * dropping a card onto an occupied pocket — was the one thing you could not
 * take back. Every mutation now goes through `apply`, which records what the
 * binder looked like first.
 */
export function useBinderHistory(save: (binder: Binder) => void) {
  const stack = useRef<HistoryEntry[]>([]);
  const binderId = useRef<string | null>(null);
  const [top, setTop] = useState<string | null>(null);

  const reset = useCallback((id: string) => {
    if (binderId.current === id) return;
    binderId.current = id;
    stack.current = [];
    setTop(null);
  }, []);

  /** Record `from`, then persist `to`. `label` describes the *undoable* action. */
  const apply = useCallback(
    (from: Binder, to: Binder, label: string) => {
      stack.current = [...stack.current.slice(-(LIMIT - 1)), { binder: from, label }];
      setTop(label);
      save(to);
    },
    [save],
  );

  const undo = useCallback(() => {
    const entry = stack.current[stack.current.length - 1];
    if (!entry) return null;
    stack.current = stack.current.slice(0, -1);
    setTop(stack.current[stack.current.length - 1]?.label ?? null);
    save(entry.binder);
    return entry.label;
  }, [save]);

  return { apply, undo, reset, canUndo: top !== null, undoLabel: top };
}
