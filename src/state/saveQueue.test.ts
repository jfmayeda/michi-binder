import { describe, expect, it, vi } from 'vitest';
import { createBinder } from '@/domain/slots';
import { SaveQueue } from './saveQueue';

function binder(id: string) {
  return createBinder({ id, layoutId: '2x2', pageMode: 'single', pageCount: 1 });
}

describe('SaveQueue', () => {
  it('debounces to a single write of the latest binder', async () => {
    vi.useFakeTimers();
    const writes: string[] = [];
    const queue = new SaveQueue({
      delayMs: 1000,
      write: async (b) => {
        writes.push(b.id);
      },
    });
    queue.push(binder('a'));
    queue.push(binder('b'));
    expect(writes).toEqual([]);
    await vi.advanceTimersByTimeAsync(1000);
    expect(writes).toEqual(['b']);
    vi.useRealTimers();
  });

  it('keeps the binder and surfaces error, then recovers on retry', async () => {
    let fail = true;
    const queue = new SaveQueue({
      delayMs: 0,
      write: async () => {
        if (fail) throw new Error('network');
      },
    });
    queue.push(binder('a'));
    await queue.flush();
    expect(queue.status).toBe('error');
    fail = false;
    await queue.retry();
    expect(queue.status).toBe('saved');
  });

  it('does not write while offline and flushes after retry when online', async () => {
    let online = false;
    const writes: string[] = [];
    const queue = new SaveQueue({
      delayMs: 0,
      isOnline: () => online,
      write: async (b) => {
        writes.push(b.id);
      },
    });
    queue.push(binder('a'));
    await queue.flush();
    expect(writes).toEqual([]);
    expect(queue.status).toBe('offline');
    online = true;
    await queue.retry();
    expect(writes).toEqual(['a']);
    expect(queue.status).toBe('saved');
  });
});
