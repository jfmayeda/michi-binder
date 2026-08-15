'use client';

import { create } from 'zustand';
import { createBinder } from '@/domain/slots';
import type { LayoutId, PageMode } from '@/domain/layouts';
import type { Binder } from '@/domain/types';
import { createBrowserPlaygroundAdapter, type PersistenceAdapter } from '@/persistence';
import type { MediaBlob } from '@/persistence/types';
import { SaveQueue, type SaveStatus } from '@/state/saveQueue';

function getAdapter(): PersistenceAdapter {
  return createBrowserPlaygroundAdapter();
}

type StudioState = {
  binders: Binder[];
  media: MediaBlob[];
  loaded: boolean;
  saveStatus: SaveStatus;
  refresh: () => Promise<void>;
  refreshMedia: () => Promise<void>;
  create: (opts: { title: string; layoutId: LayoutId; pageMode: PageMode }) => Promise<Binder>;
  rename: (id: string, title: string) => Promise<void>;
  remove: (id: string) => Promise<Binder | null>;
  restore: (binder: Binder) => Promise<void>;
  save: (binder: Binder) => Promise<void>;
  retrySave: () => Promise<void>;
  importMedia: (blob: MediaBlob) => Promise<void>;
  removeMedia: (id: string) => Promise<void>;
  restoreMedia: (blob: MediaBlob) => Promise<void>;
};

export const useStudioStore = create<StudioState>((set, get) => {
  const queue = new SaveQueue({
    write: (binder) => getAdapter().saveBinder(binder),
    isOnline: () => (typeof navigator === 'undefined' ? true : navigator.onLine),
    onStatus: (saveStatus) => set({ saveStatus }),
  });

  return {
    binders: [],
    media: [],
    loaded: false,
    saveStatus: 'saved',
    refresh: async () => {
      const binders = await getAdapter().listBinders();
      set({ binders, loaded: true });
    },
    create: async ({ title, layoutId, pageMode }) => {
      const binder = createBinder({
        id: crypto.randomUUID(),
        layoutId,
        pageMode,
        pageCount: pageMode === 'double' ? 3 : 1,
      });
      binder.title = title;
      await getAdapter().saveBinder(binder);
      await get().refresh();
      set({ saveStatus: 'saved' });
      return binder;
    },
    rename: async (id, title) => {
      const current = (await getAdapter().getBinder(id)) ?? get().binders.find((b) => b.id === id);
      if (!current) return;
      await getAdapter().saveBinder({ ...current, title });
      await get().refresh();
      set({ saveStatus: 'saved' });
    },
    remove: async (id) => {
      const current = await getAdapter().getBinder(id);
      if (!current) return null;
      await getAdapter().deleteBinder(id);
      await get().refresh();
      return current;
    },
    restore: async (binder) => {
      await getAdapter().saveBinder(binder);
      await get().refresh();
      set({ saveStatus: 'saved' });
    },
    save: async (binder) => {
      set((s) => ({
        binders: s.binders.some((b) => b.id === binder.id)
          ? s.binders.map((b) => (b.id === binder.id ? binder : b))
          : [...s.binders, binder],
        saveStatus: 'saving',
      }));
      queue.push(binder);
    },
    retrySave: () => queue.retry(),
    refreshMedia: async () => {
      const media = await getAdapter().listMedia();
      set({ media });
    },
    importMedia: async (blob) => {
      await getAdapter().putMedia(blob);
      await get().refreshMedia();
    },
    removeMedia: async (id) => {
      await getAdapter().deleteMedia(id);
      await get().refreshMedia();
    },
    restoreMedia: async (blob) => {
      await getAdapter().putMedia(blob);
      await get().refreshMedia();
    },
  };
});
