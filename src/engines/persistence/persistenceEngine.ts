import {
  getBrowserLocalStorage,
  createStoragePersistenceError,
  type StoragePort,
} from '@platform/storage';
import {
  CURRENT_STORAGE_SCHEMA_VERSION,
  DATABASE_APPLICATION_ID,
  METADATA_KEY,
  REGISTERED_COLLECTIONS,
  STORAGE_PREFIX,
  getCollectionKey,
  listCollectionNames,
} from './collectionRegistry';
import { migrateLegacyInventoryStorage } from './inventoryMigration';
import { migrateLegacyAppointmentStorage } from './appointmentMigration';

export type DatabaseMetadata = {
  applicationId: typeof DATABASE_APPLICATION_ID;
  schemaVersion: number;
  updatedAt: string;
};

export type LocalDatabaseBackup = {
  applicationId: typeof DATABASE_APPLICATION_ID;
  schemaVersion: number;
  exportedAt: string;
  metadata: DatabaseMetadata;
  collections: Record<string, unknown[]>;
};

const memoryCollections = new Map<string, unknown[]>();
let memoryMetadata: DatabaseMetadata | null = null;
let fallbackCounter = 0;

function getStorage(): StoragePort | null {
  return getBrowserLocalStorage();
}

function cloneValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function cloneItems<T>(items: T[]): T[] {
  return cloneValue(items);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function createMetadata(schemaVersion = CURRENT_STORAGE_SCHEMA_VERSION): DatabaseMetadata {
  return {
    applicationId: DATABASE_APPLICATION_ID,
    schemaVersion,
    updatedAt: new Date().toISOString(),
  };
}

function parseMetadata(raw: string | null): DatabaseMetadata | null {
  if (!raw) return null;

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return null;
    if (parsed.applicationId !== DATABASE_APPLICATION_ID) return null;
    if (!Number.isInteger(parsed.schemaVersion) || Number(parsed.schemaVersion) < 0) return null;
    if (typeof parsed.updatedAt !== 'string') return null;

    return {
      applicationId: DATABASE_APPLICATION_ID,
      schemaVersion: Number(parsed.schemaVersion),
      updatedAt: parsed.updatedAt,
    };
  } catch {
    return null;
  }
}

function saveMetadata(metadata: DatabaseMetadata): void {
  memoryMetadata = cloneValue(metadata);
  const storage = getStorage();
  if (!storage) return;

  try {
    storage.setItem(METADATA_KEY, JSON.stringify(metadata));
  } catch (error) {
    throw createStoragePersistenceError('save-metadata', undefined, error);
  }
}

function runMigrations(metadata: DatabaseMetadata): DatabaseMetadata {
  if (metadata.schemaVersion > CURRENT_STORAGE_SCHEMA_VERSION) {
    throw new Error('إصدار البيانات المحفوظة أحدث من إصدار التطبيق الحالي. حدّث التطبيق أولاً.');
  }

  let nextMetadata = metadata;

  // Version 1 establishes one central schema version without mutating existing collections.
  if (nextMetadata.schemaVersion < 1) {
    nextMetadata = createMetadata(1);
  }

  return nextMetadata;
}

export function initializeLocalDatabase(): DatabaseMetadata {
  const storage = getStorage();
  const storedMetadata = storage ? parseMetadata(storage.getItem(METADATA_KEY)) : memoryMetadata;
  const migratedMetadata = runMigrations(storedMetadata ?? createMetadata(0));
  migrateLegacyInventoryStorage();
  migrateLegacyAppointmentStorage();
  saveMetadata(migratedMetadata);
  return cloneValue(migratedMetadata);
}

function readStoredCollection(collection: string): unknown[] | null {
  const key = getCollectionKey(collection);
  const storage = getStorage();

  if (!storage) {
    const cached = memoryCollections.get(key);
    return cached ? cloneItems(cached) : null;
  }

  try {
    const raw = storage.getItem(key);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function readCollection<T>(collection: string, fallback: T[] = []): T[] {
  initializeLocalDatabase();
  const stored = readStoredCollection(collection);
  if (!stored) return cloneItems(fallback);
  return cloneItems(stored as T[]);
}

export function writeCollection<T>(collection: string, items: T[]): void {
  initializeLocalDatabase();
  const key = getCollectionKey(collection);
  const snapshot = cloneItems(items);

  const storage = getStorage();
  if (!storage) {
    memoryCollections.set(key, snapshot);
    return;
  }

  try {
    storage.setItem(key, JSON.stringify(snapshot));
    memoryCollections.set(key, snapshot);
    saveMetadata(createMetadata());
  } catch (error) {
    throw createStoragePersistenceError('write-collection', collection, error);
  }
}

export function exportDatabaseBackup(): LocalDatabaseBackup {
  const metadata = initializeLocalDatabase();
  const collections = listCollectionNames(getStorage(), memoryCollections.keys()).reduce<Record<string, unknown[]>>(
    (result, collection) => {
      result[collection] = readStoredCollection(collection) ?? [];
      return result;
    },
    {},
  );

  return {
    applicationId: DATABASE_APPLICATION_ID,
    schemaVersion: CURRENT_STORAGE_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    metadata,
    collections,
  };
}

function validateBackup(value: unknown): LocalDatabaseBackup {
  if (!isRecord(value)) throw new Error('ملف النسخة الاحتياطية غير صالح.');
  if (value.applicationId !== DATABASE_APPLICATION_ID) throw new Error('ملف النسخة الاحتياطية لا يخص هذا التطبيق.');
  if (!Number.isInteger(value.schemaVersion) || Number(value.schemaVersion) < 0) throw new Error('إصدار النسخة الاحتياطية غير صالح.');
  if (Number(value.schemaVersion) > CURRENT_STORAGE_SCHEMA_VERSION) {
    throw new Error('النسخة الاحتياطية أُنشئت بواسطة إصدار أحدث من التطبيق.');
  }
  if (typeof value.exportedAt !== 'string') throw new Error('تاريخ تصدير النسخة الاحتياطية غير صالح.');
  if (!isRecord(value.collections)) throw new Error('بيانات النسخة الاحتياطية غير مكتملة.');

  const collections = Object.entries(value.collections).reduce<Record<string, unknown[]>>((result, [collection, items]) => {
    if (!collection.trim() || !Array.isArray(items)) throw new Error('يوجد قسم بيانات غير صالح داخل النسخة الاحتياطية.');
    result[collection] = cloneItems(items);
    return result;
  }, {});

  return {
    applicationId: DATABASE_APPLICATION_ID,
    schemaVersion: Number(value.schemaVersion),
    exportedAt: value.exportedAt,
    metadata: createMetadata(Number(value.schemaVersion)),
    collections,
  };
}

export function clearStoredApplicationData(): void {
  const storage = getStorage();
  if (storage) {
    const keysToRemove: string[] = [];
    const length = storage.length;
    for (let index = 0; index < length; index += 1) {
      const key = storage.key(index);
      if (key?.startsWith(`${STORAGE_PREFIX}:`)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => storage.removeItem(key));
  }

  memoryCollections.clear();
  memoryMetadata = null;
}

export function importDatabaseBackup(value: unknown): LocalDatabaseBackup {
  const backup = validateBackup(value);
  const previousBackup = exportDatabaseBackup();

  try {
    clearStoredApplicationData();
    saveMetadata(createMetadata(backup.schemaVersion));
    Object.entries(backup.collections).forEach(([collection, items]) => writeCollection(collection, items));
    initializeLocalDatabase();
    return exportDatabaseBackup();
  } catch (error) {
    clearStoredApplicationData();
    saveMetadata(previousBackup.metadata);
    Object.entries(previousBackup.collections).forEach(([collection, items]) => writeCollection(collection, items));
    throw error;
  }
}

export function resetDatabase(): void {
  clearStoredApplicationData();
  saveMetadata(createMetadata());
  REGISTERED_COLLECTIONS.forEach((collection) => writeCollection(collection, []));
}

export function generateId(): string {
  const runtimeCrypto = globalThis.crypto;
  if (runtimeCrypto && typeof runtimeCrypto.randomUUID === 'function') {
    try {
      return runtimeCrypto.randomUUID();
    } catch {
      // Fall back to a deterministic local identifier.
    }
  }

  fallbackCounter = (fallbackCounter + 1) % Number.MAX_SAFE_INTEGER;
  return `local-${Date.now().toString(36)}-${fallbackCounter.toString(36)}`;
}

export function generateNumber(prefix: string): string {
  const now = new Date();
  const date = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('');
  const time = [
    String(now.getHours()).padStart(2, '0'),
    String(now.getMinutes()).padStart(2, '0'),
    String(now.getSeconds()).padStart(2, '0'),
  ].join('');

  fallbackCounter = (fallbackCounter + 1) % 1000;
  return `${prefix}-${date}-${time}-${fallbackCounter.toString().padStart(3, '0')}`;
}
