import { describe, expect, it } from 'vitest';
import { addMerge, placeIntoCell, placeOnMerge } from '@/domain/slots';
import type { Placement, Transform } from '@/domain/types';
import { sha256Hex } from '@/media/checksum';
import { MemorySupabase } from './memorySupabase';
import { migratePlayground } from './migratePlayground';
import { PlaygroundAdapter } from './playground';
import { PLAYGROUND_BINDER_ID, anonymousMayAddPage, ensurePlaygroundBinder } from './playgroundBinder';
import { SupabaseAdapter } from './supabaseAdapter';
import { MemoryBlobs, MemoryKv } from './types';

const crop: Transform = {
  version: 1,
  crop: { x: 0.15, y: 0.1, w: 0.7, h: 0.8 },
  rotation: 90,
};

describe('anonymous page gate', () => {
  it('forbids a second page', () => {
    expect(anonymousMayAddPage(0)).toBe(true);
    expect(anonymousMayAddPage(1)).toBe(false);
    expect(anonymousMayAddPage(2)).toBe(false);
  });
});

describe('AT-10 playground migration', () => {
  it('moves merge, owned card, cropped upload, and storage original; clears local only after confirm', async () => {
    const playground = new PlaygroundAdapter(new MemoryKv(), new MemoryBlobs());
    let binder = await ensurePlaygroundBinder(playground);
    const pageId = binder.pages[0].id;
    binder = addMerge(binder, { pageId, row: 0, col: 0, rowSpan: 2, colSpan: 2 }, 'm');
    const card: Placement = {
      id: 'card-1',
      pageId,
      mergeId: 'm',
      row: null,
      col: null,
      kind: 'card',
      cardId: 'base1-25',
      assetKind: null,
      uploadAssetId: null,
      packItemId: null,
      transform: {},
      ownership: 'owned',
    };
    binder = placeOnMerge(binder, card);
    const bytes = new Uint8Array([1, 2, 3, 4, 5]).buffer;
    await playground.putMedia({
      id: 'upload-1',
      bytes,
      mime: 'image/png',
      fileName: 'art.png',
      widthPx: 10,
      heightPx: 10,
      sha256: await sha256Hex(bytes),
    });
    binder = placeIntoCell(binder, pageId, 2, 2, {
      id: 'art-1',
      pageId,
      mergeId: null,
      row: 2,
      col: 2,
      kind: 'art',
      cardId: null,
      assetKind: 'upload',
      uploadAssetId: 'upload-1',
      packItemId: null,
      transform: crop,
      ownership: null,
    });
    await playground.saveBinder(binder);

    const remote = new SupabaseAdapter(new MemorySupabase(), 'user-1');
    const result = await migratePlayground({ playground, remote });
    expect(result).toEqual({ ok: true });

    const migrated = await remote.getBinder(PLAYGROUND_BINDER_ID);
    expect(migrated).toEqual(binder);
    const art = migrated!.placements.find((p) => p.id === 'art-1');
    expect(art?.transform).toEqual(crop);
    expect(migrated!.placements.find((p) => p.id === 'card-1')?.ownership).toBe('owned');
    const stored = await remote.getMedia('upload-1');
    expect(stored).not.toBeNull();
    expect(new Uint8Array(stored!.bytes)).toEqual(new Uint8Array([1, 2, 3, 4, 5]));
    expect(await playground.getBinder(PLAYGROUND_BINDER_ID)).toBeNull();
    expect(await playground.listMedia()).toEqual([]);
  });

  it('does not clear local if the remote write fails', async () => {
    const playground = new PlaygroundAdapter(new MemoryKv(), new MemoryBlobs());
    const binder = await ensurePlaygroundBinder(playground);
    const remote = {
      async saveBinder() {
        throw new Error('offline');
      },
      async getBinder() {
        return null;
      },
      async putMedia() {
        return;
      },
      async getMedia() {
        return null;
      },
      async listBinders() {
        return [];
      },
      async deleteBinder() {
        return;
      },
      async listMedia() {
        return [];
      },
      async deleteMedia() {
        return;
      },
    };
    const result = await migratePlayground({ playground, remote });
    expect(result.ok).toBe(false);
    expect(await playground.getBinder(PLAYGROUND_BINDER_ID)).toEqual(binder);
  });
});
