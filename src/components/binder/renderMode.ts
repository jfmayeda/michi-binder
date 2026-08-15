export const RENDER_MODE_KEY = 'michi.binder.renderMode';
export const FORCE_LOW_PERF_KEY = 'michi.binder.forceLowPerf';

export type RenderMode = '3d' | '2d';

const LONG_FRAME_MS = 28;
const LONG_FRAME_RATIO = 0.25;
const AVG_FRAME_MS = 22;

export function shouldDegradeFromProbe(
  avg: number,
  longFrames: number,
  samples: number,
): boolean {
  return avg > AVG_FRAME_MS || longFrames / Math.max(samples, 1) > LONG_FRAME_RATIO;
}

export function readForcedLowPerf(): boolean {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  if (params.get('lowperf') === '1' || params.get('mode') === '2d') return true;
  return window.localStorage.getItem(FORCE_LOW_PERF_KEY) === '1';
}

export function readStoredRenderMode(): RenderMode | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  if (params.get('mode') === '3d') return '3d';
  if (params.get('mode') === '2d' || params.get('lowperf') === '1') return '2d';
  const stored = window.localStorage.getItem(RENDER_MODE_KEY);
  if (stored === '2d' || stored === '3d') return stored;
  return null;
}

export function persistRenderMode(mode: RenderMode) {
  window.localStorage.setItem(RENDER_MODE_KEY, mode);
}

export function probeFrameTimes(durationMs: number): Promise<{
  avg: number;
  longFrames: number;
  samples: number;
  shouldDegrade: boolean;
}> {
  return new Promise((resolve) => {
    const times: number[] = [];
    let last = performance.now();
    const start = last;
    const tick = (now: number) => {
      times.push(now - last);
      last = now;
      if (now - start < durationMs) {
        requestAnimationFrame(tick);
        return;
      }
      const samples = Math.max(times.length, 1);
      const avg = times.reduce((a, b) => a + b, 0) / samples;
      const longFrames = times.filter((t) => t > LONG_FRAME_MS).length;
      resolve({
        avg,
        longFrames,
        samples,
        shouldDegrade: shouldDegradeFromProbe(avg, longFrames, samples),
      });
    };
    requestAnimationFrame(tick);
  });
}
