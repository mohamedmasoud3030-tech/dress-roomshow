import type { StoragePort } from '@platform/storage';

export const DATABASE_APPLICATION_ID = 'dress-roomshow';
export const CURRENT_STORAGE_SCHEMA_VERSION = 1;
export const STORAGE_PREFIX = 'dress-roomshow';
export const METADATA_KEY = `${STORAGE_PREFIX}:metadata`;

export const REGISTERED_COLLECTIONS = [
  'customers',
  'dresses',
  'reservations',
  'payments',
  'expenses',
  'delivery-return',
  'sales',
  'audit-log',
  'daily-closings',
  'preferences',
  'showroom-profile',
] as const;

export type CollectionName = typeof REGISTERED_COLLECTIONS[number];

export function isRegisteredCollection(collection: string): collection is CollectionName {
  return (REGISTERED_COLLECTIONS as readonly string[]).includes(collection);
}

export function getCollectionKey(collection: string): string {
  return `${STORAGE_PREFIX}:${collection}`;
}

export function listCollectionNames(storage?: StoragePort | null, memoryKeys?: Iterable<string>): string[] {
  const names = new Set<string>(REGISTERED_COLLECTIONS);

  if (storage) {
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (!key || !key.startsWith(`${STORAGE_PREFIX}:`) || key === METADATA_KEY) continue;
      names.add(key.slice(STORAGE_PREFIX.length + 1));
    }
  }

  if (memoryKeys) {
    for (const key of memoryKeys) {
      if (key.startsWith(`${STORAGE_PREFIX}:`)) {
        names.add(key.slice(STORAGE_PREFIX.length + 1));
      }
    }
  }

  return [...names].sort();
}
