import { describe, expect, it } from 'vitest';
import { LAYOUTS, type LayoutId } from '@/domain/layouts';
import { sha256Hex } from '@/media/checksum';
import { addMerge, createBinder, placeOnMerge } from '@/domain/slots';
import type { Placement, Transform } from '@/domain/types';
import { PlaygroundAdapter } from './playground';
import { MemoryBlobs, MemoryKv } from './types';

const LAYOUT_IDS = Object.keys(LAYOUTS) as LayoutId[];

function shapes(layoutId: LayoutId) {
  const { rows, cols } = LAYOUTS[layoutId];
  const out: { rowSpan: number; colSpan: number }[] = [];
  for (let rowSpan = 1; rowSpan <= rows; rowSpan += 1) {
    for (let colSpan = 1; colSpan <= cols; colSpan += 1) {
      if (rowSpan * colSpan >= 2) out.push({ rowSpan, colSpan });
    }
  }
  return out;
}

const transform: Transform = {
  version: 1,
  crop: { x: 0.2, y: 0.1, w: 0.6, h: 0.8 },
  rotation: 180,
};

describe('AT-3 via PlaygroundAdapter', () => {
  for (const layoutId of LAYOUT_IDS) {
    it(`round-trips every merge shape through the adapter (${layoutId})`, async () => {
      const adapter = new PlaygroundAdapter(new MemoryKv(), new MemoryBlobs());
      for (const shape of shapes(layoutId)) {
        let binder = createBinder({
          id: `${layoutId}-${shape.rowSpan}x${shape.colSpan}`,
          layoutId,
          pageMode: 'double',
          pageCount: 3,
        });
        const pageId = binder.pages[0].id;
        binder = addMerge(binder, { pageId, row: 0, col: 0, ...shape }, 'm');
        const card: Placement = {
          id: 'c',
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
          ownership: 'wanted',
        };
        binder = placeOnMerge(binder, card);
        const artPage = binder.pages[1].id;
        binder = addMerge(
          binder,
          { pageId: artPage, row: 0, col: 0, rowSpan: 1, colSpan: 2 },
          'art',
        );
        binder = placeOnMerge(binder, {
          id: 'a',
          pageId: artPage,
          mergeId: 'art',
          row: null,
          col: null,
          kind: 'art',
          cardId: null,
          assetKind: 'pack',
          uploadAssetId: null,
          packItemId: 'tex-1',
          transform,
          ownership: null,
        });
        await adapter.saveBinder(binder);
        const loaded = await adapter.getBinder(binder.id);
        expect(loaded).toEqual(binder);
      }
    });
  }

  it('stores media bytes unchanged', async () => {
    const adapter = new PlaygroundAdapter(new MemoryKv(), new MemoryBlobs());
    const fileBytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 1, 2, 3]);
    const sha = await sha256Hex(fileBytes.buffer);
    await adapter.putMedia({
      id: 'm1',
      bytes: fileBytes.buffer,
      mime: 'image/png',
      fileName: 'a.png',
      widthPx: 1,
      heightPx: 1,
      sha256: sha,
    });
    fileBytes[0] = 0;
    const got = await adapter.getMedia('m1');
    expect(got).not.toBeNull();
    expect(new Uint8Array(got!.bytes)[0]).toBe(137);
    expect(await sha256Hex(got!.bytes)).toBe(sha);
    expect(got!.sha256).toBe(sha);
    expect((await adapter.listMedia()).map((m) => m.id)).toEqual(['m1']);
  });
});
