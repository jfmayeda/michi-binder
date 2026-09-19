import type { ReactNode } from 'react';

/**
 * The album frame: a near-black outline, a monospace title strip, a body.
 * Every grouping in the app is one of these, so the hierarchy stays legible
 * without a second border style or a shadow vocabulary.
 */
export function Panel({
  title,
  count,
  active = false,
  stepped = false,
  sunk = false,
  flush = false,
  actions,
  className = '',
  bodyClassName = '',
  children,
}: {
  title?: string;
  /** Right-aligned counter in the strip, e.g. "56/56". */
  count?: string;
  /** Inverts the strip when this panel currently owns the user's attention. */
  active?: boolean;
  stepped?: boolean;
  sunk?: boolean;
  /** Drop body padding when the child manages its own. */
  flush?: boolean;
  actions?: ReactNode;
  className?: string;
  bodyClassName?: string;
  children: ReactNode;
}) {
  return (
    <section
      className={`gb-panel${sunk ? ' gb-panel--sunk' : ''}${stepped ? ' gb-panel--stepped' : ''} ${className}`}
    >
      {title ? (
        <h2 className={`gb-strip${active ? ' gb-strip--active' : ''}`}>
          <span>{title}</span>
          {count ? <span className="gb-strip__count">{count}</span> : null}
          {actions ? <span className="ml-auto flex items-center gap-1">{actions}</span> : null}
        </h2>
      ) : null}
      <div
        className={`gb-panel__body${flush ? ' gb-panel__body--flush' : ''} ${bodyClassName}`}
      >
        {children}
      </div>
    </section>
  );
}
