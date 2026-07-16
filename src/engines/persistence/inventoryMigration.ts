import { getBrowserLocalStorage, type StoragePort } from '@platform/storage';
import { getCollectionKey } from './collectionRegistry';
import { runMigratorWithRollback, getMigrationMarker } from './migrationRunner';

const LEGACY_INVENTORY_KEY = 'lena_dresses';
const INVENTORY_COLLECTION = 'dresses';

function getStorage(): StoragePort | null {
  return getBrowserLocalStorage();
}

type InventoryItem = {
  id?: string;
  code?: string;
  [key: string]: unknown;
};

export function migrateLegacyInventoryStorage(): boolean {
  const storage = getStorage();
  if (!storage) return false;

  const marker = getMigrationMarker('inventory-v1');
  if (marker?.status === 'completed') {
    return false;
  }

  const legacyRaw = storage.getItem(LEGACY_INVENTORY_KEY);
  if (!legacyRaw) return false;

  const result = runMigratorWithRollback('inventory-v1', () => {
    let legacyItems: InventoryItem[] = [];
    try {
      const parsed: unknown = JSON.parse(legacyRaw);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        storage.removeItem(LEGACY_INVENTORY_KEY);
        return false;
      }
      legacyItems = parsed as InventoryItem[];
    } catch {
      storage.removeItem(LEGACY_INVENTORY_KEY);
      return false;
    }

    const canonicalKey = getCollectionKey(INVENTORY_COLLECTION);
    let canonicalItems: InventoryItem[] = [];
    const canonicalRaw = storage.getItem(canonicalKey);
    if (canonicalRaw) {
      try {
        const parsedCanonical: unknown = JSON.parse(canonicalRaw);
        if (Array.isArray(parsedCanonical)) {
          canonicalItems = parsedCanonical as InventoryItem[];
        }
      } catch {
        canonicalItems = [];
      }
    }

    const existingIds = new Set(canonicalItems.map((item) => item.id).filter(Boolean));
    const existingCodes = new Set(canonicalItems.map((item) => item.code).filter(Boolean));

    let itemsAdded = 0;
    for (const legacyItem of legacyItems) {
      if (!legacyItem.id && !legacyItem.code) continue;
      const duplicateId = Boolean(legacyItem.id && existingIds.has(legacyItem.id));
      const duplicateCode = Boolean(legacyItem.code && existingCodes.has(legacyItem.code));

      if (!duplicateId && !duplicateCode) {
        canonicalItems.push(legacyItem);
        if (legacyItem.id) existingIds.add(legacyItem.id);
        if (legacyItem.code) existingCodes.add(legacyItem.code);
        itemsAdded += 1;
      }
    }

    storage.setItem(canonicalKey, JSON.stringify(canonicalItems));
    storage.removeItem(LEGACY_INVENTORY_KEY);
    return itemsAdded > 0;
  });

  return Boolean(result.result);
}
