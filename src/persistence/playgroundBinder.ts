import { createBinder } from '@/domain/slots';
import type { Binder } from '@/domain/types';
import type { PersistenceAdapter } from './types';

export const PLAYGROUND_BINDER_ID = 'michi-playground';

export function anonymousMayAddPage(pageCount: number) {
  return pageCount < 1;
}

export async function ensurePlaygroundBinder(adapter: PersistenceAdapter): Promise<Binder> {
  const existing = await adapter.getBinder(PLAYGROUND_BINDER_ID);
  if (existing) return existing;
  // One page, so single-page mode: a facing pair would leave half the binder
  // permanently blank. The facing-spread story lives on the landing page.
  const binder = createBinder({
    id: PLAYGROUND_BINDER_ID,
    layoutId: '3x3',
    pageMode: 'single',
    pageCount: 1,
  });
  binder.title = 'My page';
  await adapter.saveBinder(binder);
  return binder;
}
