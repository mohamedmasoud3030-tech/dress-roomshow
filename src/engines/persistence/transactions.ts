import {
  exportDatabaseBackup,
  writeCollection,
  clearStoredApplicationData,
  type LocalDatabaseBackup,
  type DatabaseMetadata,
} from './persistenceEngine';
import { METADATA_KEY } from './collectionRegistry';
import { getBrowserLocalStorage, type StoragePort } from '@platform/storage';

export type PersistenceSnapshot = LocalDatabaseBackup;

function getStorage(): StoragePort | null {
  return getBrowserLocalStorage();
}

function cloneValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function restoreMetadataDirectly(metadata: DatabaseMetadata): void {
  const storage = getStorage();
  if (storage) {
    try {
      storage.setItem(METADATA_KEY, JSON.stringify(metadata));
    } catch {
      // Best-effort metadata restore during rollback.
    }
  }
}

export function createDatabaseSnapshot(): PersistenceSnapshot {
  return exportDatabaseBackup();
}

export function restoreDatabaseSnapshot(snapshot: PersistenceSnapshot): void {
  const clonedSnapshot = cloneValue(snapshot);
  clearStoredApplicationData();
  restoreMetadataDirectly(clonedSnapshot.metadata);
  Object.entries(clonedSnapshot.collections).forEach(([collection, items]) => {
    writeCollection(collection, items);
  });
}

export function runInTransaction<T>(operation: () => T): T {
  const snapshot = createDatabaseSnapshot();
  try {
    return operation();
  } catch (error) {
    try {
      restoreDatabaseSnapshot(snapshot);
    } catch {
      // If restore itself fails, the original write failure is re-thrown as primary cause.
    }
    throw error;
  }
}

export async function runInTransactionAsync<T>(operation: () => Promise<T>): Promise<T> {
  const snapshot = createDatabaseSnapshot();
  try {
    return await operation();
  } catch (error) {
    try {
      restoreDatabaseSnapshot(snapshot);
    } catch {
      // If restore itself fails, the original write failure is re-thrown as primary cause.
    }
    throw error;
  }
}

export function runCompensatedOperation<T>(
  execute: () => T,
  compensate: (error: unknown, snapshot: PersistenceSnapshot) => void,
): T {
  const snapshot = createDatabaseSnapshot();
  try {
    return execute();
  } catch (error) {
    try {
      compensate(error, snapshot);
    } catch {
      // Fallback to full snapshot restoration if compensation throws.
      restoreDatabaseSnapshot(snapshot);
    }
    throw error;
  }
}
