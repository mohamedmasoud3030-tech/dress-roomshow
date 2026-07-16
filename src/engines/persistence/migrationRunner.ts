import { getBrowserLocalStorage, type StoragePort } from '@platform/storage';
import { createDatabaseSnapshot, restoreDatabaseSnapshot } from './transactions';
import { STORAGE_PREFIX } from './collectionRegistry';

export const MIGRATION_MARKERS_KEY = `${STORAGE_PREFIX}:migration-markers`;

export type MigrationMarker = {
  migrationId: string;
  status: 'completed' | 'failed' | 'pending';
  attemptCount: number;
  lastAttemptAt?: string;
  lastError?: string;
  completedAt?: string;
};

const memoryMarkers = new Map<string, MigrationMarker>();

function getStorage(): StoragePort | null {
  return getBrowserLocalStorage();
}

function cloneValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function getAllMigrationMarkers(): Record<string, MigrationMarker> {
  const storage = getStorage();
  if (!storage) {
    const result: Record<string, MigrationMarker> = {};
    for (const [id, marker] of memoryMarkers.entries()) {
      result[id] = cloneValue(marker);
    }
    return result;
  }

  try {
    const raw = storage.getItem(MIGRATION_MARKERS_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
      ? (parsed as Record<string, MigrationMarker>)
      : {};
  } catch {
    return {};
  }
}

function saveAllMigrationMarkers(markers: Record<string, MigrationMarker>): void {
  for (const [id, marker] of Object.entries(markers)) {
    memoryMarkers.set(id, cloneValue(marker));
  }

  const storage = getStorage();
  if (!storage) return;

  try {
    storage.setItem(MIGRATION_MARKERS_KEY, JSON.stringify(markers));
  } catch {
    // Best-effort save for markers if quota exceeded
  }
}

export function getMigrationMarker(migrationId: string): MigrationMarker | null {
  const markers = getAllMigrationMarkers();
  return markers[migrationId] ? cloneValue(markers[migrationId]) : null;
}

export function markMigrationSuccess(migrationId: string): MigrationMarker {
  const markers = getAllMigrationMarkers();
  const existing = markers[migrationId] ?? { migrationId, attemptCount: 0 };
  const updated: MigrationMarker = {
    ...existing,
    migrationId,
    status: 'completed',
    attemptCount: existing.attemptCount + (existing.status !== 'completed' ? 1 : 0),
    completedAt: new Date().toISOString(),
    lastError: undefined,
  };
  markers[migrationId] = updated;
  saveAllMigrationMarkers(markers);
  return cloneValue(updated);
}

export function markMigrationFailure(migrationId: string, error: unknown): MigrationMarker {
  const markers = getAllMigrationMarkers();
  const existing = markers[migrationId] ?? { migrationId, attemptCount: 0 };
  const updated: MigrationMarker = {
    ...existing,
    migrationId,
    status: 'failed',
    attemptCount: existing.attemptCount + 1,
    lastAttemptAt: new Date().toISOString(),
    lastError: error instanceof Error ? error.message : String(error),
  };
  markers[migrationId] = updated;
  saveAllMigrationMarkers(markers);
  return cloneValue(updated);
}

export function resetMigrationMarkers(): void {
  memoryMarkers.clear();
  const storage = getStorage();
  if (storage) {
    try {
      storage.removeItem(MIGRATION_MARKERS_KEY);
    } catch {
      // Ignore removal errors during reset
    }
  }
}

export function runMigratorWithRollback<T>(
  migrationId: string,
  migrator: () => T,
): { result: T | null; status: 'completed' | 'failed' | 'skipped' } {
  const marker = getMigrationMarker(migrationId);
  if (marker?.status === 'completed') {
    return { result: null, status: 'skipped' };
  }

  const snapshot = createDatabaseSnapshot();
  try {
    const result = migrator();
    markMigrationSuccess(migrationId);
    return { result, status: 'completed' };
  } catch (error) {
    try {
      restoreDatabaseSnapshot(snapshot);
    } catch {
      // Best effort rollback
    }
    markMigrationFailure(migrationId, error);
    throw error;
  }
}

export async function runMigratorWithRollbackAsync<T>(
  migrationId: string,
  migrator: () => Promise<T>,
): Promise<{ result: T | null; status: 'completed' | 'failed' | 'skipped' }> {
  const marker = getMigrationMarker(migrationId);
  if (marker?.status === 'completed') {
    return { result: null, status: 'skipped' };
  }

  const snapshot = createDatabaseSnapshot();
  try {
    const result = await migrator();
    markMigrationSuccess(migrationId);
    return { result, status: 'completed' };
  } catch (error) {
    try {
      restoreDatabaseSnapshot(snapshot);
    } catch {
      // Best effort rollback
    }
    markMigrationFailure(migrationId, error);
    throw error;
  }
}
