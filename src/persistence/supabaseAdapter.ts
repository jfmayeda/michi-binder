import { sha256Hex } from '@/media/checksum';
import type { Binder } from '@/domain/types';
import type { MediaBlob, PersistenceAdapter } from './types';

type BinderRow = {
  id: string;
  user_id: string;
  title: string;
  layout_id: Binder['layoutId'];
  page_mode: Binder['pageMode'];
  position: number;
};

export function binderToRows(binder: Binder, userId: string) {
  const binderRow: BinderRow = {
    id: binder.id,
    user_id: userId,
    title: binder.title,
    layout_id: binder.layoutId,
    page_mode: binder.pageMode,
    position: 0,
  };
  const pages = binder.pages.map((p) => ({
    id: p.id,
    user_id: userId,
    binder_id: binder.id,
    position: p.position,
  }));
  const merges = binder.merges.map((m) => ({
    id: m.id,
    user_id: userId,
    page_id: m.pageId,
    row: m.row,
    col: m.col,
    row_span: m.rowSpan,
    col_span: m.colSpan,
    spans_gutter: m.spansGutter,
  }));
  const placements = binder.placements.map((p) => ({
    id: p.id,
    user_id: userId,
    page_id: p.pageId,
    merge_id: p.mergeId,
    row: p.row,
    col: p.col,
    kind: p.kind,
    card_id: p.cardId,
    asset_kind: p.assetKind,
    upload_asset_id: p.uploadAssetId,
    pack_item_id: p.packItemId,
    transform: p.transform,
    ownership: p.ownership,
  }));
  return { binderRow, pages, merges, placements };
}

export function rowsToBinder(
  binderRow: BinderRow,
  pages: { id: string; binder_id: string; position: number }[],
  merges: {
    id: string;
    page_id: string;
    row: number;
    col: number;
    row_span: number;
    col_span: number;
    spans_gutter: boolean;
  }[],
  placements: {
    id: string;
    page_id: string;
    merge_id: string | null;
    row: number | null;
    col: number | null;
    kind: 'card' | 'art';
    card_id: string | null;
    asset_kind: 'upload' | 'pack' | null;
    upload_asset_id: string | null;
    pack_item_id: string | null;
    transform: Binder['placements'][number]['transform'];
    ownership: Binder['placements'][number]['ownership'];
  }[],
): Binder {
  return {
    id: binderRow.id,
    title: binderRow.title,
    layoutId: binderRow.layout_id,
    pageMode: binderRow.page_mode,
    pages: pages
      .filter((p) => p.binder_id === binderRow.id)
      .slice()
      .sort((a, b) => a.position - b.position)
      .map((p) => ({ id: p.id, binderId: binderRow.id, position: p.position })),
    merges: merges.map((m) => ({
      id: m.id,
      pageId: m.page_id,
      row: m.row,
      col: m.col,
      rowSpan: m.row_span,
      colSpan: m.col_span,
      spansGutter: m.spans_gutter,
    })),
    placements: placements.map((p) => ({
      id: p.id,
      pageId: p.page_id,
      mergeId: p.merge_id,
      row: p.row,
      col: p.col,
      kind: p.kind,
      cardId: p.card_id,
      assetKind: p.asset_kind,
      uploadAssetId: p.upload_asset_id,
      packItemId: p.pack_item_id,
      transform: p.transform,
      ownership: p.ownership,
    })),
  };
}

/** Loose client: no generated Database types (supabase gen is not an approved dep). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type UntypedClient = { from: (table: string) => any; storage: { from: (bucket: string) => any } };

export class SupabaseAdapter implements PersistenceAdapter {
  constructor(
    private readonly client: UntypedClient,
    private readonly userId: string,
  ) {}

  async listBinders(): Promise<Binder[]> {
    const { data, error } = await this.client.from('binders').select('*').eq('user_id', this.userId);
    if (error || !data) return [];
    const binders: Binder[] = [];
    for (const row of data as BinderRow[]) {
      const loaded = await this.getBinder(row.id);
      if (loaded) binders.push(loaded);
    }
    return binders;
  }

  async getBinder(id: string): Promise<Binder | null> {
    const { data: binderRow } = await this.client.from('binders').select('*').eq('id', id).maybeSingle();
    if (!binderRow) return null;
    const { data: pages } = await this.client.from('pages').select('*').eq('binder_id', id);
    const pageRows = (pages ?? []) as { id: string; binder_id: string; position: number }[];
    const pageIds = pageRows.map((p) => p.id);
    const { data: merges } = pageIds.length
      ? await this.client.from('merges').select('*').in('page_id', pageIds)
      : { data: [] };
    const { data: placements } = pageIds.length
      ? await this.client.from('placements').select('*').in('page_id', pageIds)
      : { data: [] };
    return rowsToBinder(
      binderRow as BinderRow,
      pageRows,
      (merges ?? []) as Parameters<typeof rowsToBinder>[2],
      (placements ?? []) as Parameters<typeof rowsToBinder>[3],
    );
  }

  async saveBinder(binder: Binder): Promise<void> {
    const { binderRow, pages, merges, placements } = binderToRows(binder, this.userId);
    await this.client.from('binders').upsert(binderRow);

    const { data: existingPages } = await this.client.from('pages').select('id').eq('binder_id', binder.id);
    const keepPageIds = new Set(pages.map((p) => p.id));
    const dropPageIds = ((existingPages ?? []) as { id: string }[])
      .map((p) => p.id)
      .filter((id) => !keepPageIds.has(id));
    const relatedPageIds = [...keepPageIds, ...dropPageIds];

    if (relatedPageIds.length) {
      const { data: existingPlacements } = await this.client
        .from('placements')
        .select('id')
        .in('page_id', relatedPageIds);
      const keepPlacementIds = new Set(placements.map((p) => p.id));
      const dropPlacements = ((existingPlacements ?? []) as { id: string }[])
        .map((p) => p.id)
        .filter((id) => !keepPlacementIds.has(id));
      if (dropPlacements.length) await this.client.from('placements').delete().in('id', dropPlacements);

      const { data: existingMerges } = await this.client.from('merges').select('id').in('page_id', relatedPageIds);
      const keepMergeIds = new Set(merges.map((m) => m.id));
      const dropMerges = ((existingMerges ?? []) as { id: string }[])
        .map((m) => m.id)
        .filter((id) => !keepMergeIds.has(id));
      if (dropMerges.length) await this.client.from('merges').delete().in('id', dropMerges);
    }
    if (dropPageIds.length) await this.client.from('pages').delete().in('id', dropPageIds);

    if (pages.length) await this.client.from('pages').upsert(pages);
    if (merges.length) await this.client.from('merges').upsert(merges);
    if (placements.length) await this.client.from('placements').upsert(placements);
  }

  async deleteBinder(id: string): Promise<void> {
    await this.client.from('binders').delete().eq('id', id);
  }

  async listMedia(): Promise<MediaBlob[]> {
    const { data } = await this.client.from('media_assets').select('id').eq('user_id', this.userId);
    const ids = ((data ?? []) as { id: string }[]).map((r) => r.id);
    const out: MediaBlob[] = [];
    for (const id of ids) {
      const blob = await this.getMedia(id);
      if (blob) out.push(blob);
    }
    return out;
  }

  async putMedia(blob: MediaBlob): Promise<void> {
    const path = `${this.userId}/${blob.id}`;
    await this.client.storage.from('media-originals').upload(path, blob.bytes.slice(0), {
      contentType: blob.mime,
      upsert: true,
    });
    await this.client.from('media_assets').upsert({
      id: blob.id,
      user_id: this.userId,
      storage_path: path,
      file_name: blob.fileName,
      mime: blob.mime,
      width_px: blob.widthPx,
      height_px: blob.heightPx,
      byte_size: blob.bytes.byteLength,
    });
  }

  async getMedia(id: string): Promise<MediaBlob | null> {
    const { data } = await this.client.from('media_assets').select('*').eq('id', id).maybeSingle();
    const row = data as {
      storage_path: string;
      mime: string;
      file_name: string;
      width_px: number;
      height_px: number;
    } | null;
    if (!row) return null;
    const downloaded = await this.client.storage.from('media-originals').download(row.storage_path);
    if (!downloaded.data) return null;
    const bytes = await downloaded.data.arrayBuffer();
    return {
      id,
      bytes,
      mime: row.mime,
      fileName: row.file_name,
      widthPx: row.width_px,
      heightPx: row.height_px,
      sha256: await sha256Hex(bytes),
    };
  }

  async deleteMedia(id: string): Promise<void> {
    const { data } = await this.client.from('media_assets').select('storage_path').eq('id', id).maybeSingle();
    const row = data as { storage_path: string } | null;
    if (row?.storage_path) await this.client.storage.from('media-originals').remove([row.storage_path]);
    await this.client.from('media_assets').delete().eq('id', id);
  }
}
