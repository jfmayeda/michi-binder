'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Dialog } from '@/components/ui/Dialog';

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

  const ask = useCallback((request: ConfirmRequest<T>) => setDialog(request), []);
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
      onDismiss={() => setToast(null)}
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
  onDismiss,
}: {
  dialog: Pick<ConfirmRequest<T>, 'title' | 'body' | 'confirmLabel' | 'cancelLabel'> | null;
  toast: { message: string } | null;
  onConfirm: () => void;
  onCancel: () => void;
  onUndo: () => void;
  onDismiss?: () => void;
}) {
  return (
    <>
      {dialog ? (
        <Dialog
          title={dialog.title}
          description={dialog.body}
          onClose={onCancel}
          width="sm"
          footer={
            <>
              <button type="button" className="gb-btn" onClick={onCancel}>
                {dialog.cancelLabel ?? 'Keep it'}
              </button>
              <button type="button" className="gb-btn gb-btn--primary" onClick={onConfirm}>
                {dialog.confirmLabel ?? 'Confirm'}
              </button>
            </>
          }
        >
          <p className="text-sm text-ink-soft">You can undo this for a few seconds afterwards.</p>
        </Dialog>
      ) : null}
      {toast ? (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-5 left-1/2 z-40 -translate-x-1/2"
        >
          <span className="gb-prompt shadow-[var(--shadow-overlay)]">
            <span className="gb-prompt__marker" aria-hidden="true">
              done
            </span>
            {toast.message}
            <button type="button" className="gb-btn !min-h-8 !px-2.5" onClick={onUndo}>
              Undo
            </button>
            <button
              type="button"
              className="gb-icon-btn !h-7 !w-7"
              aria-label="Dismiss"
              onClick={onDismiss}
            >
              <span aria-hidden="true">×</span>
            </button>
          </span>
        </div>
      ) : null}
    </>
  );
}
