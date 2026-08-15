import type { PersistenceAdapter } from './types';
import { PLAYGROUND_BINDER_ID } from './playgroundBinder';

export async function migratePlayground(opts: {
  playground: PersistenceAdapter;
  remote: PersistenceAdapter;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const source =
    (await opts.playground.getBinder(PLAYGROUND_BINDER_ID)) ?? (await opts.playground.listBinders())[0];
  if (!source) return { ok: false, error: 'empty' };

  const media = await opts.playground.listMedia();
  try {
    for (const blob of media) {
      await opts.remote.putMedia(blob);
    }
    await opts.remote.saveBinder(source);
    const loaded = await opts.remote.getBinder(source.id);
    if (!loaded) return { ok: false, error: 'missing-remote' };
    for (const blob of media) {
      const remoteBlob = await opts.remote.getMedia(blob.id);
      if (!remoteBlob) return { ok: false, error: 'missing-media' };
    }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'remote-write' };
  }

  await opts.playground.deleteBinder(source.id);
  for (const blob of media) {
    await opts.playground.deleteMedia(blob.id);
  }
  return { ok: true };
}
