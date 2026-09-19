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

/* ------------------------------------------------------------------------
 * Render mode as an external store.
 *
 * The mode lives in localStorage and the URL, both of which only exist on the
 * client. Reading it in an effect meant the binder painted one mode and then
 * swapped — a visible flash on every load. useSyncExternalStore lets the
 * server render a known placeholder and the client settle on the real value
 * without a cascading render.
 * --------------------------------------------------------------------- */

const listeners = new Set<() => void>();
let snapshot: RenderMode | null = null;
let snapshotRead = false;

function computeSnapshot(): RenderMode {
  if (readForcedLowPerf()) return '2d';
  return readStoredRenderMode() ?? '3d';
}

export function subscribeRenderMode(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getRenderModeSnapshot(): RenderMode {
  if (!snapshotRead) {
    snapshot = computeSnapshot();
    snapshotRead = true;
  }
  return snapshot as RenderMode;
}

/** The server has no storage and no URL, so it renders nothing binder-shaped. */
export function getRenderModeServerSnapshot(): null {
  return null;
}

export function setRenderMode(mode: RenderMode) {
  snapshot = mode;
  snapshotRead = true;
  try {
    persistRenderMode(mode);
  } catch {
    /* private browsing — the choice just does not stick */
  }
  listeners.forEach((l) => l());
}

export function resetRenderModeStoreForTests() {
  snapshot = null;
  snapshotRead = false;
  listeners.clear();
}
