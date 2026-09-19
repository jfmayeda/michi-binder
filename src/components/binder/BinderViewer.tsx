'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { LAYOUTS, type LayoutId } from '@/domain/layouts';
import {
  getRenderModeServerSnapshot,
  getRenderModeSnapshot,
  probeFrameTimes,
  readForcedLowPerf,
  readStoredRenderMode,
  setRenderMode,
  subscribeRenderMode,
} from './renderMode';

export type ViewerSpread = { left: ReactNode | null; right: ReactNode | null };

type Phase = 'idle' | 'turning';

/**
 * The binder you read rather than edit.
 *
 * One component covers both render modes so they cannot drift apart. In 3D the
 * leaf rotates around the spine; in 2D the same spread slides. The mode is a
 * visible, persisted control, not a hidden capability — the fallback is a
 * first-class way to use the product, and the editor uses it by default
 * because precision work should never wait for an animation.
 */
export function BinderViewer({
  layoutId,
  spreads,
  index,
  onIndexChange,
  maxWidth = '54rem',
  label = 'Binder',
}: {
  layoutId: LayoutId;
  spreads: ViewerSpread[];
  index: number;
  onIndexChange: (next: number) => void;
  maxWidth?: string;
  label?: string;
}) {
  const mode = useSyncExternalStore(
    subscribeRenderMode,
    getRenderModeSnapshot,
    getRenderModeServerSnapshot,
  );
  const [phase, setPhase] = useState<Phase>('idle');
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');
  const pending = useRef<number | null>(null);
  const probed = useRef(false);
  const layout = LAYOUTS[layoutId];

  const total = spreads.length;
  const current = spreads[Math.min(index, total - 1)] ?? { left: null, right: null };
  const upcoming = spreads[index + 1] ?? { left: null, right: null };
  const previous = spreads[index - 1] ?? { left: null, right: null };

  const go = useCallback(
    (next: number, dir: 'forward' | 'back') => {
      if (phase !== 'idle' || next < 0 || next >= total || next === index) return;
      // First turn doubles as the performance probe: if frames are long, drop
      // to 2D and remember it.
      if (!probed.current && mode === '3d') {
        probed.current = true;
        if (!readForcedLowPerf() && !readStoredRenderMode()) {
          void probeFrameTimes(700).then((result) => {
            if (result.shouldDegrade) setRenderMode('2d');
          });
        }
      }
      setDirection(dir);
      pending.current = next;
      setPhase('turning');
    },
    [index, mode, phase, total],
  );

  const settle = () => {
    if (phase !== 'turning' || pending.current == null) return;
    onIndexChange(pending.current);
    pending.current = null;
    setPhase('idle');
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        go(index + 1, 'forward');
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        go(index - 1, 'back');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, index]);

  if (!mode) {
    // Reserve the exact space the binder will take, so nothing jumps.
    return (
      <div
        className="binder"
        style={
          {
            ['--page-cols']: layout.cols,
            ['--page-rows']: layout.rows,
            ['--binder-max']: maxWidth,
          } as React.CSSProperties
        }
        aria-hidden="true"
      >
        <div className="binder-page binder-page--left" />
        <div className="binder-spine" />
        <div className="binder-page binder-page--right" />
      </div>
    );
  }

  const style = {
    ['--page-cols']: layout.cols,
    ['--page-rows']: layout.rows,
    ['--binder-max']: maxWidth,
  } as React.CSSProperties;

  const turning = phase === 'turning';

  const body =
    mode === '3d' ? (
      <div className="binder-stage">
        <div className="binder" style={style}>
          <div className="binder-page binder-page--left">
            {/* Under the turning leaf: where it is heading, or where it came from. */}
            {turning && direction === 'forward' ? upcoming.left : current.left}
          </div>
          <div className="binder-spine" aria-hidden="true">
            <div className="binder-rings">
              <span />
              <span />
              <span />
            </div>
          </div>
          <div className="binder-leaf-slot">
            <div className="binder-page binder-page--right h-full w-full">
              {turning && direction === 'forward' ? upcoming.right : current.right}
            </div>
            {turning ? (
              <div
                className={`binder-flipper is-animated ${direction === 'back' ? 'is-back' : ''}`}
                style={{ ['--flip']: 180 } as React.CSSProperties}
                onTransitionEnd={settle}
              >
                <div className="binder-face binder-face-front">
                  {direction === 'forward' ? current.right : previous.right}
                </div>
                <div className="binder-face binder-face-back">
                  {direction === 'forward' ? upcoming.left : current.left}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    ) : (
      <div className="binder" style={style}>
        <div
          className={`binder-spread w-full ${
            turning ? (direction === 'forward' ? 'is-exit-left' : 'is-exit-right') : ''
          }`}
          onTransitionEnd={settle}
        >
          <div className="binder-page binder-page--left">{current.left}</div>
          <div className="binder-spine" aria-hidden="true">
            <div className="binder-rings">
              <span />
              <span />
              <span />
            </div>
          </div>
          <div className="binder-page binder-page--right">{current.right}</div>
        </div>
      </div>
    );

  return (
    <div className="flex w-full flex-col items-center gap-3">
      {body}

      <div className="flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          className="gb-icon-btn"
          aria-label="Previous spread"
          disabled={index <= 0 || turning}
          onClick={() => go(index - 1, 'back')}
        >
          <span aria-hidden="true">◀</span>
        </button>
        <span
          className="gb-num rounded-sm border border-ink bg-paper-raised px-2.5 py-1 text-mini"
          aria-live="polite"
        >
          Spread {index + 1} of {total}
        </span>
        <button
          type="button"
          className="gb-icon-btn"
          aria-label="Next spread"
          disabled={index >= total - 1 || turning}
          onClick={() => go(index + 1, 'forward')}
        >
          <span aria-hidden="true">▶</span>
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
        <span className="gb-label">{label} view</span>
        <div className="flex" role="group" aria-label="Binder rendering mode">
          {(['3d', '2d'] as const).map((m) => (
            <button
              key={m}
              type="button"
              className="gb-chip !rounded-none first:rounded-l-sm last:rounded-r-sm"
              aria-pressed={mode === m}
              onClick={() => setRenderMode(m)}
            >
              {m === '3d' ? 'Page turn' : '2D mode'}
            </button>
          ))}
        </div>
      </div>
      <p className="max-w-prose text-center text-mini text-ink-soft">
        {mode === '3d'
          ? 'The leaf turns on the rings. If your device struggles, it drops to 2D mode on its own.'
          : '2D mode — the same spread, same pockets, no 3D. This is what the editor uses.'}
      </p>
    </div>
  );
}
