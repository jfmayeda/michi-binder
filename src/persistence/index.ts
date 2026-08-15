import { PlaygroundAdapter } from './playground';
import { idbBlobs, localStorageKv } from './browserStores';

export type { PersistenceAdapter } from './types';
export { PlaygroundAdapter } from './playground';
export { MemoryBlobs, MemoryKv } from './types';

export function createBrowserPlaygroundAdapter() {
  return new PlaygroundAdapter(localStorageKv, idbBlobs);
}
