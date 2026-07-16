import {
  exportDatabaseBackup,
  exportDatabaseBackupAsync,
  writeCollection,
  clearStoredApplicationData,
  type LocalDatabaseBackup,
  type DatabaseMetadata,
} from './persistenceEngine';
import { METADATA_KEY } from './collectionRegistry';
import { getBrowserLocalStorage, type StoragePort } from '@platform/storage';
import { restoreImages } from '@platform/images';

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

export async function createDatabaseSnapshotAsync(): Promise<PersistenceSnapshot> {
  return await exportDatabaseBackupAsync();
}

export function restoreDatabaseSnapshot(snapshot: PersistenceSnapshot): void {
  const clonedSnapshot = cloneValue(snapshot);
  clearStoredApplicationData();
  restoreMetadataDirectly(clonedSnapshot.metadata);
  Object.entries(clonedSnapshot.collections).forEach(([collection, items]) => {
    writeCollection(collection, items);
  });
}

export async function restoreDatabaseSnapshotAsync(snapshot: PersistenceSnapshot): Promise<void> {
  const clonedSnapshot = cloneValue(snapshot);
  clearStoredApplicationData();
  restoreMetadataDirectly(clonedSnapshot.metadata);
  Object.entries(clonedSnapshot.collections).forEach(([collection, items]) => {
    writeCollection(collection, items);
  });
  if (clonedSnapshot.imageBlobs && Array.isArray(clonedSnapshot.imageBlobs)) {
    try {
      await restoreImages(clonedSnapshot.imageBlobs);
    } catch {
      // Best effort image restore on rollback
    }
  }
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
  const snapshot = await createDatabaseSnapshotAsync();
  try {
    return await operation();
  } catch (error) {
    try {
      await restoreDatabaseSnapshotAsync(snapshot);
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
      restoreDatabaseSnapshot(snapshot);
    }
    throw error;
  }
}

export async function runCompensatedOperationAsync<T>(
  execute: () => Promise<T>,
  compensate: (error: unknown, snapshot: PersistenceSnapshot) => Promise<void> | void,
): Promise<T> {
  const snapshot = await createDatabaseSnapshotAsync();
  try {
    return await execute();
  } catch (error) {
    try {
      await compensate(error, snapshot);
    } catch {
      await restoreDatabaseSnapshotAsync(snapshot);
    }
    throw error;
  }
}
