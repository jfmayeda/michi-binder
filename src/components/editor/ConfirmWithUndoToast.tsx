'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';

export const UNDO_TOAST_MS = 8000;

export type ConfirmRequest<T> = {
  title: string;
  body: string;
  confirmLabel?: string;
  cancelLabel?: string;
  toastMessage: string;
  snapshot: T;
  apply: () => void | Promise<void>;
  restore: (snapshot: T) => void | Promise<void>;
};

type ToastState<T> = {
  message: string;
  snapshot: T;
  restore: (snapshot: T) => void | Promise<void>;
};

export function useConfirmWithUndo<T>(expiryMs = UNDO_TOAST_MS) {
  const [dialog, setDialog] = useState<ConfirmRequest<T> | null>(null);
  const [toast, setToast] = useState<ToastState<T> | null>(null);

  const ask = useCallback((request: ConfirmRequest<T>) => {
    setDialog(request);
  }, []);

  const cancel = useCallback(() => setDialog(null), []);

  const confirm = useCallback(async () => {
    if (!dialog) return;
    const current = dialog;
    await current.apply();
    setDialog(null);
    setToast({
      message: current.toastMessage,
      snapshot: current.snapshot,
      restore: current.restore,
    });
  }, [dialog]);

  const undo = useCallback(async () => {
    if (!toast) return;
    await toast.restore(toast.snapshot);
    setToast(null);
  }, [toast]);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), expiryMs);
    return () => window.clearTimeout(id);
  }, [toast, expiryMs]);

  const host: ReactNode = (
    <ConfirmWithUndoToast
      dialog={dialog}
      toast={toast}
      onConfirm={() => void confirm()}
      onCancel={cancel}
      onUndo={() => void undo()}
    />
  );

  return { ask, host, dialog, toast, confirm, cancel, undo };
}

export function ConfirmWithUndoToast<T>({
  dialog,
  toast,
  onConfirm,
  onCancel,
  onUndo,
}: {
  dialog: Pick<ConfirmRequest<T>, 'title' | 'body' | 'confirmLabel' | 'cancelLabel'> | null;
  toast: { message: string } | null;
  onConfirm: () => void;
  onCancel: () => void;
  onUndo: () => void;
}) {
  return (
    <>
      {dialog ? (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-ink/40">
          <div className="max-w-sm rounded-lg border border-rule bg-paper p-5 shadow-lift">
            <p className="font-display text-xl text-ink">{dialog.title}</p>
            <p className="mt-2 text-sm text-ink-soft">{dialog.body}</p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                className="rounded-md bg-accent px-3 py-1.5 text-paper-sun shadow-stamp"
                onClick={onConfirm}
              >
                {dialog.confirmLabel ?? 'Confirm'}
              </button>
              <button type="button" className="rounded-md px-3 py-1.5 text-ink-soft" onClick={onCancel}>
                {dialog.cancelLabel ?? 'Keep it'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {toast ? (
        <div className="fixed bottom-6 left-1/2 z-30 -translate-x-1/2 rounded-md border border-rule bg-paper-sun px-4 py-3 shadow-lift">
          {toast.message}{' '}
          <button type="button" className="text-accent underline" onClick={onUndo}>
            Undo
          </button>
        </div>
      ) : null}
    </>
  );
}
