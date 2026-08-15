'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { markBinderInteractive } from '@/search';
import { Binder2D } from './Binder2D';
import { FlipBinder } from './FlipBinder';
import {
  persistRenderMode,
  probeFrameTimes,
  readForcedLowPerf,
  readStoredRenderMode,
  type RenderMode,
} from './renderMode';

export function BinderPrototype() {
  const [mode, setMode] = useState<RenderMode | null>(null);
  const [reason, setReason] = useState<string>('auto');
  const probed = useRef(false);

  useEffect(() => {
    if (readForcedLowPerf()) {
      setMode('2d');
      setReason('low-perf flag');
      return;
    }
    const stored = readStoredRenderMode();
    if (stored) {
      setMode(stored);
      setReason('saved preference');
      return;
    }
    setMode('3d');
    setReason('auto');
  }, []);

  useEffect(() => {
    if (mode) markBinderInteractive();
  }, [mode]);

  const choose = (next: RenderMode, why: string) => {
    setMode(next);
    setReason(why);
    persistRenderMode(next);
  };

  const onFlipMotionStart = useCallback(() => {
    if (probed.current) return;
    probed.current = true;
    if (readForcedLowPerf() || readStoredRenderMode()) return;
    void probeFrameTimes(700).then((result) => {
      if (result.shouldDegrade) {
        choose('2d', `auto (${result.avg.toFixed(1)}ms avg frame)`);
      }
    });
  }, []);

  if (!mode) {
    return <div className="binder-desk" />;
  }

  return (
    <div>
      <div className="binder-mode-bar">
        <span>Render: {mode === '3d' ? '3D paper flip' : '2D spread'}</span>
        <span className="binder-mode-reason">{reason}</span>
        <button type="button" onClick={() => choose('3d', 'manual')} aria-pressed={mode === '3d'}>
          3D
        </button>
        <button type="button" onClick={() => choose('2d', 'manual')} aria-pressed={mode === '2d'}>
          2D
        </button>
      </div>
      {mode === '3d' ? (
        <FlipBinder onFlipMotionStart={onFlipMotionStart} />
      ) : (
        <Binder2D onFlipMotionStart={onFlipMotionStart} />
      )}
    </div>
  );
}
