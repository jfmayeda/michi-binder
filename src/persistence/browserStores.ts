import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { BlobStore, KeyValueStore, MediaBlob } from './types';

export const localStorageKv: KeyValueStore = {
  getItem: (key) => (typeof localStorage === 'undefined' ? null : localStorage.getItem(key)),
  setItem: (key, value) => {
    if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
  },
  removeItem: (key) => {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(key);
  },
};

interface MediaDb extends DBSchema {
  originals: {
    key: string;
    value: MediaBlob;
  };
}

let dbPromise: Promise<IDBPDatabase<MediaDb>> | null = null;

function db() {
  if (!dbPromise) {
    dbPromise = openDB<MediaDb>('michi-playground', 1, {
      upgrade(database) {
        database.createObjectStore('originals');
      },
    });
  }
  return dbPromise;
}

export const idbBlobs: BlobStore = {
  async put(blob) {
    await (await db()).put('originals', blob, blob.id);
  },
  async get(id) {
    return (await (await db()).get('originals', id)) ?? null;
  },
  async delete(id) {
    await (await db()).delete('originals', id);
  },
};
