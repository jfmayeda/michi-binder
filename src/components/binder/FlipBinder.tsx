'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import './binder.css';
import { SPREAD_COUNT, spreadCountFor, spreadPages, type DummyPage } from './dummyPages';

function CoverPage({ title, kicker }: { title: string; kicker: string }) {
  return (
    <div className="binder-page wash-cover">
      <p className="binder-page-kicker">{kicker}</p>
      <h2 className="binder-page-title">{title}</h2>
      <p className="binder-page-note">
        Cloth-bound, rings in the gutter, paper that wants to be turned.
      </p>
    </div>
  );
}

export function DummySheet({ page }: { page: DummyPage | 'cover' | 'back' }) {
  if (page === 'cover') {
    return <CoverPage kicker="Inside cover" title="Hello, collector." />;
  }
  if (page === 'back') {
    return <CoverPage kicker="Back cover" title="That’s the last leaf." />;
  }

  const filled = page.id % 3;
  const rows = page.rows ?? 3;
  const cols = page.cols ?? 3;
  const slots = page.slots;
  return (
    <div className={`binder-page wash-${page.wash}`}>
      <p className="binder-page-kicker">Dummy leaf</p>
      <h2 className="binder-page-title">{page.label}</h2>
      <p className="binder-page-note">{page.note}</p>
      <div
        className="binder-grid"
        aria-hidden="true"
        style={{
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gridTemplateRows: `repeat(${rows}, 1fr)`,
        }}
      >
        {slots
          ? Array.from({ length: rows * cols }, (_, i) => {
              const row = Math.floor(i / cols);
              const col = i % cols;
              const slot = slots.find((s) => s.row === row && s.col === col);
              if (
                slots.some(
                  (s) =>
                    !(s.row === row && s.col === col) &&
                    row >= s.row &&
                    row < s.row + s.rowSpan &&
                    col >= s.col &&
                    col < s.col + s.colSpan,
                )
              ) {
                return null;
              }
              return (
                <div
                  key={i}
                  className={slot?.imageUrl ? 'binder-slot filled' : slot ? 'binder-slot filled' : 'binder-slot'}
                  style={
                    slot
                      ? { gridColumn: `span ${slot.colSpan}`, gridRow: `span ${slot.rowSpan}` }
                      : undefined
                  }
                >
                  {slot?.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={slot.imageUrl} alt="" loading="lazy" className="binder-slot-img" />
                  ) : null}
                </div>
              );
            })
          : Array.from({ length: 9 }, (_, i) => (
              <div key={i} className={i % 3 === filled ? 'binder-slot filled' : 'binder-slot'} />
            ))}
      </div>
    </div>
  );
}

type DragState = {
  pointerId: number;
  startX: number;
  width: number;
  direction: 'forward' | 'back';
  moved: boolean;
};

export function FlipBinder({
  onFlipMotionStart,
  pages,
  hint,
  onSpreadChange,
}: {
  onFlipMotionStart?: () => void;
  pages?: DummyPage[];
  hint?: string;
  onSpreadChange?: (spread: number) => void;
}) {
  const leaves = pages ?? undefined;
  const total = pages ? spreadCountFor(pages) : SPREAD_COUNT;
  const [spread, setSpread] = useState(0);
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');
  const forwardRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLDivElement>(null);
  const bookRef = useRef<HTMLDivElement>(null);
  const spreadRef = useRef(0);
  const animatingRef = useRef(false);
  const dragRef = useRef<DragState | null>(null);

  const activeRef = useCallback(
    (dir: 'forward' | 'back') => (dir === 'forward' ? forwardRef.current : backRef.current),
    [],
  );

  const setFlipVar = useCallback((dir: 'forward' | 'back', value: number) => {
    activeRef(dir)?.style.setProperty('--flip', String(value));
  }, [activeRef]);

  const current = spreadPages(spread, leaves);
  const upcoming = spreadPages(Math.min(spread + 1, total - 1), leaves);
  const previous = spreadPages(Math.max(spread - 1, 0), leaves);

  const animateTo = useCallback(
    (dir: 'forward' | 'back', target: number, onDone: () => void) => {
      const node = activeRef(dir);
      if (!node) return;
      animatingRef.current = true;
      onFlipMotionStart?.();
      node.classList.remove('is-dragging');
      node.classList.add('is-animated');
      setFlipVar(dir, target);
      const finish = (event: TransitionEvent) => {
        if (event.propertyName !== 'transform') return;
        node.removeEventListener('transitionend', finish);
        node.classList.remove('is-animated');
        animatingRef.current = false;
        onDone();
      };
      node.addEventListener('transitionend', finish);
    },
    [activeRef, onFlipMotionStart, setFlipVar],
  );

  const resetFlipper = useCallback(
    (dir: 'forward' | 'back') => {
      const node = activeRef(dir);
      if (!node) return;
      node.classList.remove('is-animated', 'is-dragging');
      setFlipVar(dir, 0);
    },
    [activeRef, setFlipVar],
  );

  const goForward = useCallback(() => {
    if (animatingRef.current || dragRef.current) return;
    if (spreadRef.current >= total - 1) return;
    setDirection('forward');
    setFlipVar('forward', 0);
    animateTo('forward', 180, () => {
      spreadRef.current += 1;
      setSpread(spreadRef.current);
      onSpreadChange?.(spreadRef.current);
      resetFlipper('forward');
    });
  }, [animateTo, onSpreadChange, resetFlipper, setFlipVar, total]);

  const goBack = useCallback(() => {
    if (animatingRef.current || dragRef.current) return;
    if (spreadRef.current <= 0) return;
    setDirection('back');
    setFlipVar('back', 0);
    animateTo('back', 180, () => {
      spreadRef.current -= 1;
      setSpread(spreadRef.current);
      onSpreadChange?.(spreadRef.current);
      resetFlipper('back');
    });
  }, [animateTo, onSpreadChange, resetFlipper, setFlipVar]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        goForward();
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        goBack();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goBack, goForward]);

  const onPointerDown = (event: React.PointerEvent, dir: 'forward' | 'back') => {
    if (animatingRef.current) return;
    if (dir === 'forward' && spreadRef.current >= total - 1) return;
    if (dir === 'back' && spreadRef.current <= 0) return;
    const node = activeRef(dir);
    const book = bookRef.current;
    if (!node || !book) return;
    event.preventDefault();
    setDirection(dir);
    node.classList.add('is-dragging');
    node.classList.remove('is-animated');
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      width: Math.max(book.getBoundingClientRect().width / 2, 1),
      direction: dir,
      moved: false,
    };
  };

  const onPointerMove = (event: React.PointerEvent, dir: 'forward' | 'back') => {
    const drag = dragRef.current;
    if (!drag || event.pointerId !== drag.pointerId || drag.direction !== dir) return;
    const dx = event.clientX - drag.startX;
    if (Math.abs(dx) > 6) drag.moved = true;
    const progress =
      dir === 'forward'
        ? Math.min(1, Math.max(0, -dx / drag.width))
        : Math.min(1, Math.max(0, dx / drag.width));
    setFlipVar(dir, progress * 180);
  };

  const endDrag = (event: React.PointerEvent, dir: 'forward' | 'back') => {
    const drag = dragRef.current;
    if (!drag || event.pointerId !== drag.pointerId || drag.direction !== dir) return;
    const node = activeRef(dir);
    dragRef.current = null;
    if (!node) return;
    const raw = Number.parseFloat(node.style.getPropertyValue('--flip') || '0');
    const shouldComplete = !drag.moved || raw >= 54;
    if (shouldComplete) {
      animateTo(dir, 180, () => {
        spreadRef.current += dir === 'forward' ? 1 : -1;
        setSpread(spreadRef.current);
        onSpreadChange?.(spreadRef.current);
        resetFlipper(dir);
      });
    } else {
      animateTo(dir, 0, () => {
        resetFlipper(dir);
      });
    }
  };

  return (
    <div className="binder-desk">
      <p className="binder-hint">
        {hint ??
          'Click a page edge, drag the leaf, or use the arrow keys. Six dummy pages — page 1 sits alone on the right, just like a real binder.'}
      </p>
      <div className="binder-stage">
        <div className="binder-book" ref={bookRef}>
          <div className="binder-leaf-slot">
            <div className="binder-static left">
              <DummySheet page={direction === 'back' ? previous.left : current.left} />
            </div>
            <div
              ref={backRef}
              className="binder-flipper is-back"
              style={{
                ['--flip' as string]: 0,
                zIndex: direction === 'back' ? 6 : 1,
                pointerEvents: direction === 'back' ? 'auto' : 'none',
              }}
              onPointerMove={(e) => onPointerMove(e, 'back')}
              onPointerUp={(e) => endDrag(e, 'back')}
              onPointerCancel={(e) => endDrag(e, 'back')}
            >
              <div className="binder-shadow" />
              <div className="binder-face binder-face-front">
                <DummySheet page={current.left} />
              </div>
              <div className="binder-face binder-face-back">
                <DummySheet page={previous.right} />
              </div>
              <div className="binder-curl" />
            </div>
            <button
              type="button"
              className="binder-hit-left"
              aria-label="Flip back"
              onPointerDown={(e) => onPointerDown(e, 'back')}
              onPointerMove={(e) => onPointerMove(e, 'back')}
              onPointerUp={(e) => endDrag(e, 'back')}
              onPointerCancel={(e) => endDrag(e, 'back')}
            />
          </div>
          <div className="binder-spine" aria-hidden="true">
            <div className="binder-rings">
              <span />
              <span />
              <span />
            </div>
          </div>
          <div className="binder-leaf-slot">
            <div className="binder-static right">
              <DummySheet page={direction === 'forward' ? upcoming.right : current.right} />
            </div>
            <div
              ref={forwardRef}
              className="binder-flipper"
              style={{
                ['--flip' as string]: 0,
                zIndex: direction === 'forward' ? 6 : 1,
                pointerEvents: direction === 'forward' ? 'auto' : 'none',
              }}
              onPointerMove={(e) => onPointerMove(e, 'forward')}
              onPointerUp={(e) => endDrag(e, 'forward')}
              onPointerCancel={(e) => endDrag(e, 'forward')}
            >
              <div className="binder-shadow" />
              <div className="binder-face binder-face-front">
                <DummySheet page={current.right} />
              </div>
              <div className="binder-face binder-face-back">
                <DummySheet page={upcoming.left} />
              </div>
              <div className="binder-curl" />
            </div>
            <button
              type="button"
              className="binder-hit-right"
              aria-label="Flip forward"
              onPointerDown={(e) => onPointerDown(e, 'forward')}
              onPointerMove={(e) => onPointerMove(e, 'forward')}
              onPointerUp={(e) => endDrag(e, 'forward')}
              onPointerCancel={(e) => endDrag(e, 'forward')}
            />
          </div>
        </div>
      </div>
      <div className="binder-controls">
        <button type="button" onClick={goBack} disabled={spread <= 0}>
          Previous
        </button>
        <span>
          Spread {spread + 1} of {total}
        </span>
        <button type="button" onClick={goForward} disabled={spread >= total - 1}>
          Next
        </button>
      </div>
    </div>
  );
}
