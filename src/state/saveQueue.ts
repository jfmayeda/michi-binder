import type { Binder } from '@/domain/types';

export const AUTOSAVE_MS = 1000;

export type SaveStatus = 'saved' | 'saving' | 'offline' | 'error';

type SaveQueueOpts = {
  delayMs?: number;
  write: (binder: Binder) => Promise<void>;
  isOnline?: () => boolean;
  onStatus?: (status: SaveStatus) => void;
  setTimeoutFn?: typeof setTimeout;
  clearTimeoutFn?: typeof clearTimeout;
};

export class SaveQueue {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private pending: Binder | null = null;
  private writing = false;
  status: SaveStatus = 'saved';

  constructor(private readonly opts: SaveQueueOpts) {}

  push(binder: Binder) {
    this.pending = binder;
    this.setStatus(this.opts.isOnline && !this.opts.isOnline() ? 'offline' : 'saving');
    this.arm();
  }

  async flush() {
    if (this.timer) {
      (this.opts.clearTimeoutFn ?? clearTimeout)(this.timer);
      this.timer = null;
    }
    await this.drain();
  }

  async retry() {
    if (!this.pending) return;
    this.setStatus('saving');
    await this.drain();
  }

  private arm() {
    if (this.timer) (this.opts.clearTimeoutFn ?? clearTimeout)(this.timer);
    this.timer = (this.opts.setTimeoutFn ?? setTimeout)(() => {
      this.timer = null;
      void this.drain();
    }, this.opts.delayMs ?? AUTOSAVE_MS);
  }

  private async drain() {
    if (this.writing) return;
    const next = this.pending;
    if (!next) return;
    if (this.opts.isOnline && !this.opts.isOnline()) {
      this.setStatus('offline');
      return;
    }
    this.writing = true;
    this.pending = null;
    try {
      await this.opts.write(next);
      if (this.pending) {
        this.writing = false;
        await this.drain();
        return;
      }
      this.setStatus('saved');
    } catch {
      this.pending = next;
      this.setStatus('error');
    } finally {
      this.writing = false;
    }
  }

  private setStatus(status: SaveStatus) {
    this.status = status;
    this.opts.onStatus?.(status);
  }
}
