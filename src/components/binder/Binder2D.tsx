'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { DummySheet } from './FlipBinder';
import { SPREAD_COUNT, spreadPages } from './dummyPages';

type DragState = {
  pointerId: number;
  startX: number;
  moved: boolean;
};

export function Binder2D({
  onFlipMotionStart,
}: {
  onFlipMotionStart?: () => void;
}) {
  const [spread, setSpread] = useState(0);
  const [phase, setPhase] = useState<'idle' | 'out' | 'in'>('idle');
  const [dir, setDir] = useState<'forward' | 'back'>('forward');
  const pendingRef = useRef<number | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const spreadRef = useRef(0);

  const current = spreadPages(spread);

  const goTo = useCallback(
    (next: number, direction: 'forward' | 'back') => {
      if (phase !== 'idle') return;
      if (next < 0 || next >= SPREAD_COUNT || next === spreadRef.current) return;
      onFlipMotionStart?.();
      setDir(direction);
      pendingRef.current = next;
      setPhase('out');
    },
    [onFlipMotionStart, phase],
  );

  const onTransitionEnd = () => {
    if (phase === 'out' && pendingRef.current != null) {
      spreadRef.current = pendingRef.current;
      setSpread(pendingRef.current);
      pendingRef.current = null;
      setPhase('in');
      return;
    }
    if (phase === 'in') setPhase('idle');
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        goTo(spreadRef.current + 1, 'forward');
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        goTo(spreadRef.current - 1, 'back');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goTo]);

  const onPointerDown = (event: React.PointerEvent) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { pointerId: event.pointerId, startX: event.clientX, moved: false };
  };

  const onPointerMove = (event: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (Math.abs(event.clientX - drag.startX) > 8) drag.moved = true;
  };

  const onPointerUp = (event: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    const dx = event.clientX - drag.startX;
    if (!drag.moved) {
      const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
      const leftHalf = event.clientX < rect.left + rect.width / 2;
      goTo(spreadRef.current + (leftHalf ? -1 : 1), leftHalf ? 'back' : 'forward');
      return;
    }
    if (dx < -40) goTo(spreadRef.current + 1, 'forward');
    else if (dx > 40) goTo(spreadRef.current - 1, 'back');
  };

  const motionClass =
    phase === 'out'
      ? dir === 'forward'
        ? 'is-exit-left'
        : 'is-exit-right'
      : phase === 'in'
        ? dir === 'forward'
          ? 'is-enter-right'
          : 'is-enter-left'
        : '';

  return (
    <div className="binder-desk">
      <p className="binder-hint">
        2D mode — a flat spread with a paper slide/crossfade. Same dummy pages, same
        tokens. Click, drag, or use the arrow keys.
      </p>
      <div
        className="binder-2d"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div className="binder-spine" aria-hidden="true">
          <div className="binder-rings">
            <span />
            <span />
            <span />
          </div>
        </div>
        <div
          className={`binder-2d-spread ${motionClass}`}
          onTransitionEnd={onTransitionEnd}
          onAnimationEnd={onTransitionEnd}
        >
          <div className="binder-static left">
            <DummySheet page={current.left} />
          </div>
          <div className="binder-static right">
            <DummySheet page={current.right} />
          </div>
        </div>
      </div>
      <div className="binder-controls">
        <button type="button" onClick={() => goTo(spread - 1, 'back')} disabled={spread <= 0}>
          Previous
        </button>
        <span>
          Spread {spread + 1} of {SPREAD_COUNT}
        </span>
        <button
          type="button"
          onClick={() => goTo(spread + 1, 'forward')}
          disabled={spread >= SPREAD_COUNT - 1}
        >
          Next
        </button>
      </div>
    </div>
  );
}
