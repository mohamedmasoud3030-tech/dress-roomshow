import test from 'node:test';
import assert from 'node:assert/strict';
import {
  StoragePersistenceError,
  createStoragePersistenceError,
} from '../src/services/storagePersistenceError.ts';
import { writeCollection } from '../src/services/localDatabase.ts';

test('storage persistence errors preserve operation, collection, and cause', () => {
  const cause = new Error('quota exceeded');
  const error = createStoragePersistenceError('write-collection', 'customers', cause);

  assert.equal(error instanceof StoragePersistenceError, true);
  assert.equal(error.name, 'StoragePersistenceError');
  assert.equal(error.operation, 'write-collection');
  assert.equal(error.collection, 'customers');
  assert.equal(error.cause, cause);
  assert.match(error.message, /تعذر حفظ البيانات محلياً/);
  assert.match(error.message, /customers/);
});

test('writeCollection surfaces localStorage persistence failures', () => {
  const cause = new Error('quota exceeded');
  const calls = [];
  globalThis.window = {
    localStorage: {
      length: 0,
      getItem: () => null,
      key: () => null,
      removeItem: () => undefined,
      setItem: (key) => {
        calls.push(key);
        if (key === 'dress-roomshow:customers') throw cause;
      },
    },
  };

  try {
    assert.throws(
      () => writeCollection('customers', [{ id: 'customer-1' }]),
      (error) => {
        assert.equal(error instanceof StoragePersistenceError, true);
        assert.equal(error.operation, 'write-collection');
        assert.equal(error.collection, 'customers');
        assert.equal(error.cause, cause);
        return true;
      },
    );
    assert.deepEqual(calls, ['dress-roomshow:metadata', 'dress-roomshow:customers']);
  } finally {
    delete globalThis.window;
  }
});
