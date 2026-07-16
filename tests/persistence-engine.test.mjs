import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CURRENT_STORAGE_SCHEMA_VERSION,
  DATABASE_APPLICATION_ID,
  REGISTERED_COLLECTIONS,
  exportDatabaseBackup,
  generateId,
  generateNumber,
  getCollectionKey,
  importDatabaseBackup,
  initializeLocalDatabase,
  isRegisteredCollection,
  listCollectionNames,
  readCollection,
  resetDatabase,
  writeCollection,
} from '../src/engines/persistence/index.ts';

test('persistence engine exposes canonical collection registry and metadata', () => {
  const metadata = initializeLocalDatabase();
  assert.equal(metadata.applicationId, 'dress-roomshow');
  assert.equal(metadata.schemaVersion, 1);
  assert.equal(typeof metadata.updatedAt, 'string');
  assert.equal(DATABASE_APPLICATION_ID, 'dress-roomshow');
  assert.equal(CURRENT_STORAGE_SCHEMA_VERSION, 1);
  assert.equal(isRegisteredCollection('customers'), true);
  assert.equal(isRegisteredCollection('invalid-collection'), false);
  assert.equal(getCollectionKey('customers'), 'dress-roomshow:customers');
  assert.equal(REGISTERED_COLLECTIONS.includes('customers'), true);
  assert.equal(REGISTERED_COLLECTIONS.includes('dresses'), true);
  assert.equal(REGISTERED_COLLECTIONS.includes('reservations'), true);
  assert.equal(REGISTERED_COLLECTIONS.includes('appointments'), true);
  assert.equal(REGISTERED_COLLECTIONS.includes('sales-invoices'), true);
  assert.equal(REGISTERED_COLLECTIONS.includes('sale-returns'), true);
  assert.equal(REGISTERED_COLLECTIONS.includes('service-tasks'), true);
  assert.equal(REGISTERED_COLLECTIONS.includes('audit'), true);
  assert.equal(REGISTERED_COLLECTIONS.includes('images'), true);
});

test('persistence engine read and write collections preserve data and metadata through StoragePort', () => {
  const store = new Map();
  globalThis.window = {
    localStorage: {
      get length() {
        return store.size;
      },
      getItem(key) {
        return store.has(key) ? store.get(key) : null;
      },
      setItem(key, value) {
        store.set(key, String(value));
      },
      removeItem(key) {
        store.delete(key);
      },
      key(index) {
        return Array.from(store.keys())[index] ?? null;
      },
    },
  };

  try {
    writeCollection('customers', [{ id: 'c1', name: 'Soha' }]);
    const items = readCollection('customers');
    assert.deepEqual(items, [{ id: 'c1', name: 'Soha' }]);
    assert.equal(isRegisteredCollection('customers'), true);
    assert.equal(listCollectionNames().includes('customers'), true);

    const backup = exportDatabaseBackup();
    assert.equal(backup.applicationId, 'dress-roomshow');
    assert.equal(backup.schemaVersion, 1);
    assert.deepEqual(backup.collections.customers, [{ id: 'c1', name: 'Soha' }]);

    resetDatabase();
    assert.deepEqual(readCollection('customers'), []);

    importDatabaseBackup(backup);
    assert.deepEqual(readCollection('customers'), [{ id: 'c1', name: 'Soha' }]);

    const id = generateId();
    assert.equal(typeof id, 'string');
    assert.equal(id.length > 0, true);

    const numberStr = generateNumber('INV');
    assert.match(numberStr, /^INV-\d{8}-\d{6}-\d{3}$/);
  } finally {
    delete globalThis.window;
  }
});
