import type { Binder } from './types';

export function serializeBinder(binder: Binder): string {
  return JSON.stringify(binder);
}

export function deserializeBinder(json: string): Binder {
  return JSON.parse(json) as Binder;
}
