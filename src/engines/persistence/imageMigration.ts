import { getBrowserLocalStorage, type StoragePort } from '@platform/storage';
import { saveImages, isIndexedDBAvailable, getImageCount } from '@platform/images';
import { readCollection } from './persistenceEngine';

const MIGRATION_KEY = 'dress-roomshow:images-migrated';

function getStorage(): StoragePort | null {
  return getBrowserLocalStorage();
}

function isMigrated(): boolean {
  const storage = getStorage();
  if (!storage) return false;
  try {
    return storage.getItem(MIGRATION_KEY) === 'v1';
  } catch {
    return false;
  }
}

function markMigrated(): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.setItem(MIGRATION_KEY, 'v1');
  } catch {
    // Storage unavailable, migration will retry next time
  }
}

type DressWithImages = {
  id: string;
  images?: string[];
};

export async function migrateImagesToIndexedDB(): Promise<{ migrated: number; skipped: boolean }> {
  if (!isIndexedDBAvailable()) {
    return { migrated: 0, skipped: true };
  }

  if (isMigrated()) {
    return { migrated: 0, skipped: true };
  }

  const dresses = readCollection<DressWithImages>('dresses', []);
  let totalMigrated = 0;

  for (const dress of dresses) {
    if (!dress.id || !dress.images || dress.images.length === 0) continue;

    const hasDataUrl = dress.images.some((img: string) => img.startsWith('data:'));
    if (!hasDataUrl) continue;

    try {
      await saveImages(dress.id, dress.images.filter((img: string) => img.startsWith('data:')));
      totalMigrated += dress.images.length;
    } catch {
      // Continue with next dress even if one fails
    }
  }

  if (totalMigrated > 0) {
    markMigrated();
  }

  return { migrated: totalMigrated, skipped: false };
}

export async function getStorageSummary(): Promise<{
  localStorageImages: number;
  indexedDBImages: number;
  migrated: boolean;
}> {
  const dresses = readCollection<DressWithImages>('dresses', []);
  const localStorageImages = dresses.reduce((count: number, dress: DressWithImages) => count + (dress.images?.length ?? 0), 0);
  const indexedDBImages = isIndexedDBAvailable() ? await getImageCount() : 0;

  return {
    localStorageImages,
    indexedDBImages,
    migrated: isMigrated(),
  };
}
