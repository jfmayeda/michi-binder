import type { Binder } from '@/domain/types';

export type MediaBlob = {
  id: string;
  bytes: ArrayBuffer;
  mime: string;
  fileName: string;
  widthPx: number;
  heightPx: number;
  sha256: string;
};

export interface PersistenceAdapter {
  listBinders(): Promise<Binder[]>;
  getBinder(id: string): Promise<Binder | null>;
  saveBinder(binder: Binder): Promise<void>;
  deleteBinder(id: string): Promise<void>;
  listMedia(): Promise<MediaBlob[]>;
  putMedia(blob: MediaBlob): Promise<void>;
  getMedia(id: string): Promise<MediaBlob | null>;
  deleteMedia(id: string): Promise<void>;
}

export type KeyValueStore = {
  getItem(key: string): string | null | Promise<string | null>;
  setItem(key: string, value: string): void | Promise<void>;
  removeItem(key: string): void | Promise<void>;
};

export type BlobStore = {
  put(blob: MediaBlob): Promise<void>;
  get(id: string): Promise<MediaBlob | null>;
  delete(id: string): Promise<void>;
  list(): Promise<MediaBlob[]>;
};

export class MemoryKv implements KeyValueStore {
  private map = new Map<string, string>();
  getItem(key: string) {
    return this.map.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.map.set(key, value);
  }
  removeItem(key: string) {
    this.map.delete(key);
  }
}

export class MemoryBlobs implements BlobStore {
  private map = new Map<string, MediaBlob>();
  async put(blob: MediaBlob) {
    this.map.set(blob.id, blob);
  }
  async get(id: string) {
    return this.map.get(id) ?? null;
  }
  async delete(id: string) {
    this.map.delete(id);
  }
  async list() {
    return [...this.map.values()];
  }
}
