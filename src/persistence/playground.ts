import { deserializeBinder, serializeBinder } from '@/domain/serialize';
import type { Binder } from '@/domain/types';
import type { BlobStore, KeyValueStore, MediaBlob, PersistenceAdapter } from './types';

const KEY = 'michi.playground.v1';

type Snapshot = { binders: Record<string, string> };

export class PlaygroundAdapter implements PersistenceAdapter {
  constructor(
    private readonly kv: KeyValueStore,
    private readonly blobs: BlobStore,
  ) {}

  private async read(): Promise<Snapshot> {
    const raw = await this.kv.getItem(KEY);
    if (!raw) return { binders: {} };
    return JSON.parse(raw) as Snapshot;
  }

  private async write(snapshot: Snapshot) {
    await this.kv.setItem(KEY, JSON.stringify(snapshot));
  }

  async listBinders(): Promise<Binder[]> {
    const snap = await this.read();
    return Object.values(snap.binders)
      .map(deserializeBinder)
      .sort((a, b) => a.title.localeCompare(b.title));
  }

  async getBinder(id: string): Promise<Binder | null> {
    const snap = await this.read();
    const raw = snap.binders[id];
    return raw ? deserializeBinder(raw) : null;
  }

  async saveBinder(binder: Binder): Promise<void> {
    const snap = await this.read();
    snap.binders[binder.id] = serializeBinder(binder);
    await this.write(snap);
  }

  async deleteBinder(id: string): Promise<void> {
    const snap = await this.read();
    delete snap.binders[id];
    await this.write(snap);
  }

  listMedia() {
    return this.blobs.list();
  }

  putMedia(blob: MediaBlob) {
    return this.blobs.put({ ...blob, bytes: blob.bytes.slice(0) });
  }

  getMedia(id: string) {
    return this.blobs.get(id);
  }

  deleteMedia(id: string) {
    return this.blobs.delete(id);
  }
}
