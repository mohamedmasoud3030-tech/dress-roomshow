import { getBrowserLocalStorage, type StoragePort } from '@platform/storage';
import { getCollectionKey } from './collectionRegistry';
import { runMigratorWithRollback, getMigrationMarker } from './migrationRunner';

const LEGACY_APPOINTMENTS_KEY = 'lena_appointments';
const APPOINTMENTS_COLLECTION = 'appointments';

function getStorage(): StoragePort | null {
  return getBrowserLocalStorage();
}

type AppointmentItem = {
  id?: string;
  [key: string]: unknown;
};

export function migrateLegacyAppointmentStorage(): boolean {
  const storage = getStorage();
  if (!storage) return false;

  const marker = getMigrationMarker('appointments-v1');
  if (marker?.status === 'completed') {
    return false;
  }

  const legacyRaw = storage.getItem(LEGACY_APPOINTMENTS_KEY);
  if (!legacyRaw) return false;

  const result = runMigratorWithRollback('appointments-v1', () => {
    let legacyItems: AppointmentItem[] = [];
    try {
      const parsed: unknown = JSON.parse(legacyRaw);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        storage.removeItem(LEGACY_APPOINTMENTS_KEY);
        return false;
      }
      legacyItems = parsed as AppointmentItem[];
    } catch {
      storage.removeItem(LEGACY_APPOINTMENTS_KEY);
      return false;
    }

    const canonicalKey = getCollectionKey(APPOINTMENTS_COLLECTION);
    let canonicalItems: AppointmentItem[] = [];
    const canonicalRaw = storage.getItem(canonicalKey);
    if (canonicalRaw) {
      try {
        const parsedCanonical: unknown = JSON.parse(canonicalRaw);
        if (Array.isArray(parsedCanonical)) {
          canonicalItems = parsedCanonical as AppointmentItem[];
        }
      } catch {
        canonicalItems = [];
      }
    }

    const existingIds = new Set(canonicalItems.map((item) => item.id).filter(Boolean));
    let itemsAdded = 0;

    for (const legacyItem of legacyItems) {
      if (!legacyItem.id) continue;
      if (!existingIds.has(legacyItem.id)) {
        canonicalItems.push(legacyItem);
        existingIds.add(legacyItem.id);
        itemsAdded += 1;
      }
    }

    storage.setItem(canonicalKey, JSON.stringify(canonicalItems));
    storage.removeItem(LEGACY_APPOINTMENTS_KEY);
    return itemsAdded > 0;
  });

  return Boolean(result.result);
}
