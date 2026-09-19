'use client';

import type { CSSProperties, ReactNode } from 'react';
import { LAYOUTS, type LayoutId } from '@/domain/layouts';

/**
 * The binder as an object: shell, rings, and one or two leaves.
 *
 * Proportions come from the layout, not from a magic number. A page is
 * (cols × 7 cm) by (rows × 9.5 cm), so a 3×3 leaf is 21 × 28.5 and a spread is
 * 42 × 28.5. Nothing here stretches a page to fill its container.
 */
export function BinderFrame({
  layoutId,
  mode,
  left,
  right,
  maxWidth,
  transition,
  className = '',
  onTransitionEnd,
}: {
  layoutId: LayoutId;
  mode: 'single' | 'double';
  left?: ReactNode;
  right: ReactNode;
  /** CSS length capping the whole binder, e.g. "56rem". */
  maxWidth?: string;
  /** Applied to the moving group so a page turn can be animated. */
  transition?: string;
  className?: string;
  onTransitionEnd?: () => void;
}) {
  const layout = LAYOUTS[layoutId];
  const style = {
    ['--page-cols']: layout.cols,
    ['--page-rows']: layout.rows,
    ...(maxWidth ? { ['--binder-max']: maxWidth } : {}),
  } as CSSProperties;

  return (
    <div className={`binder ${className}`} style={style}>
      <div
        className={`binder-spread w-full ${transition ?? ''}`}
        onTransitionEnd={onTransitionEnd}
        onAnimationEnd={onTransitionEnd}
      >
        {mode === 'double' ? (
          <>
            <div className="binder-page binder-page--left">{left}</div>
            <div className="binder-spine" aria-hidden="true">
              <div className="binder-rings">
                <span />
                <span />
                <span />
              </div>
            </div>
            <div className="binder-page binder-page--right">{right}</div>
          </>
        ) : (
          <div className="binder-page binder-page--right">{right}</div>
        )}
      </div>
    </div>
  );
}
