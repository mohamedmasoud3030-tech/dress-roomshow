import { getDresses } from '../features/dresses/dress.service';
import { saveImages, isIndexedDBAvailable, getImageCount } from './imageStorage.service';

const MIGRATION_KEY = 'dress-roomshow:images-migrated';

function isMigrated(): boolean {
  try {
    return localStorage.getItem(MIGRATION_KEY) === 'v1';
  } catch {
    return false;
  }
}

function markMigrated(): void {
  try {
    localStorage.setItem(MIGRATION_KEY, 'v1');
  } catch {
    // Storage unavailable, migration will retry next time
  }
}

export async function migrateImagesToIndexedDB(): Promise<{ migrated: number; skipped: boolean }> {
  if (!isIndexedDBAvailable()) {
    return { migrated: 0, skipped: true };
  }

  if (isMigrated()) {
    return { migrated: 0, skipped: true };
  }

  const dresses = getDresses();
  let totalMigrated = 0;

  for (const dress of dresses) {
    if (!dress.images || dress.images.length === 0) continue;

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
  const dresses = getDresses();
  const localStorageImages = dresses.reduce((count: number, dress: { images?: string[] }) => count + (dress.images?.length ?? 0), 0);
  const indexedDBImages = isIndexedDBAvailable() ? await getImageCount() : 0;

  return {
    localStorageImages,
    indexedDBImages,
    migrated: isMigrated(),
  };
}
