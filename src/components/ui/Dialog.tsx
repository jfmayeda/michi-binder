'use client';

import { useCallback, useEffect, useRef, type ReactNode } from 'react';

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/**
 * A real modal: labelled, focus-trapped, Escape-dismissable, and it puts focus
 * back where it came from. Replaces the bare fixed overlays the previous build
 * used for crop, export and confirm.
 */
export function Dialog({
  title,
  description,
  onClose,
  footer,
  width = 'md',
  children,
}: {
  title: string;
  description?: string;
  onClose: () => void;
  footer?: ReactNode;
  width?: 'sm' | 'md' | 'lg';
  children: ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const returnTo = useRef<HTMLElement | null>(null);

  const trap = useCallback((event: KeyboardEvent) => {
    if (event.key !== 'Tab') return;
    const panel = panelRef.current;
    if (!panel) return;
    const items = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
      (el) => el.offsetParent !== null || el === document.activeElement,
    );
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }, []);

  useEffect(() => {
    returnTo.current = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    panel?.querySelector<HTMLElement>(FOCUSABLE)?.focus() ?? panel?.focus();

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
        return;
      }
      trap(event);
    };
    document.addEventListener('keydown', onKey, true);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey, true);
      document.body.style.overflow = previousOverflow;
      returnTo.current?.focus?.();
    };
  }, [onClose, trap]);

  const max = width === 'sm' ? 'max-w-sm' : width === 'lg' ? 'max-w-2xl' : 'max-w-lg';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-ink/45 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="gb-dialog-title"
        aria-describedby={description ? 'gb-dialog-desc' : undefined}
        tabIndex={-1}
        className={`gb-panel w-full ${max} my-auto shadow-[var(--shadow-overlay)]`}
      >
        <h2 className="gb-strip gb-strip--active" id="gb-dialog-title">
          {title}
        </h2>
        <div className="gb-panel__body">
          {description ? (
            <p id="gb-dialog-desc" className="mb-3 text-sm text-ink-soft">
              {description}
            </p>
          ) : null}
          {children}
        </div>
        {footer ? (
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-rule bg-paper-sunk p-3">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
