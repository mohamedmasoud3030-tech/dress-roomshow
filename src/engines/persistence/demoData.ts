import { getBrowserLocalStorage, type StoragePort } from '@platform/storage';
import {
  clearStoredApplicationData,
  writeCollection,
  type LocalDatabaseBackup,
} from './persistenceEngine';
import { createDatabaseSnapshot, restoreDatabaseSnapshot } from './transactions';
import { STORAGE_PREFIX } from './collectionRegistry';
import {
  mockDresses,
  mockCustomers,
  mockReservations,
  paymentMockRecords,
  expenseMockRecords,
  deliveryReturnMockRecords,
} from './demoDataRecords';

export const DEMO_STATUS_KEY = `${STORAGE_PREFIX}:demo-data-status`;
export const PRE_DEMO_SNAPSHOT_KEY = `${STORAGE_PREFIX}:pre-demo-snapshot`;

function getStorage(): StoragePort | null {
  return getBrowserLocalStorage();
}

export function isDemoDataLoaded(): boolean {
  const storage = getStorage();
  if (!storage) return false;
  try {
    return storage.getItem(DEMO_STATUS_KEY) === 'true';
  } catch {
    return false;
  }
}

function setDemoDataStatus(loaded: boolean): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    if (loaded) {
      storage.setItem(DEMO_STATUS_KEY, 'true');
    } else {
      storage.removeItem(DEMO_STATUS_KEY);
    }
  } catch {
    // Best-effort status tracking
  }
}

export function savePreDemoSnapshot(snapshot: LocalDatabaseBackup): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.setItem(PRE_DEMO_SNAPSHOT_KEY, JSON.stringify(snapshot));
  } catch {
    // Best-effort pre-demo snapshot saving
  }
}

export function getPreDemoSnapshot(): LocalDatabaseBackup | null {
  const storage = getStorage();
  if (!storage) return null;
  try {
    const raw = storage.getItem(PRE_DEMO_SNAPSHOT_KEY);
    return raw ? (JSON.parse(raw) as LocalDatabaseBackup) : null;
  } catch {
    return null;
  }
}

export function clearPreDemoSnapshot(): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.removeItem(PRE_DEMO_SNAPSHOT_KEY);
  } catch {
    // Ignore removal errors
  }
}

export function loadConfirmedDemoData(): void {
  const currentSnapshot = createDatabaseSnapshot();

  try {
    clearStoredApplicationData();
    savePreDemoSnapshot(currentSnapshot);
    writeCollection('dresses', mockDresses);
    writeCollection('customers', mockCustomers);
    writeCollection('reservations', mockReservations);
    writeCollection('payments', paymentMockRecords);
    writeCollection('expenses', expenseMockRecords);
    writeCollection('delivery-return', deliveryReturnMockRecords);
    setDemoDataStatus(true);
  } catch (error) {
    try {
      restoreDatabaseSnapshot(currentSnapshot);
    } catch {
      // Rollback best effort
    }
    clearPreDemoSnapshot();
    setDemoDataStatus(false);
    throw error;
  }
}

export function revertDemoDataToPreviousSnapshot(): boolean {
  const previousSnapshot = getPreDemoSnapshot();
  if (previousSnapshot) {
    restoreDatabaseSnapshot(previousSnapshot);
    clearPreDemoSnapshot();
    setDemoDataStatus(false);
    return true;
  }

  clearStoredApplicationData();
  setDemoDataStatus(false);
  return false;
}
