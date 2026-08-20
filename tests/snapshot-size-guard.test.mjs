import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath, URL } from 'node:url';

import {
  classifySnapshotSize,
  isSnapshotWithinServerLimit,
  measureSnapshotBytes,
  readSnapshotSizeReading,
  recordSnapshotSize,
  SHOWROOM_SNAPSHOT_MAX_BYTES,
} from '../src/features/sync/snapshotSizeMetrics.ts';

const repositoryRoot = fileURLToPath(new URL('..', import.meta.url));
const readSource = (path) => readFile(join(repositoryRoot, path), 'utf8');

const MIB = 1024 * 1024;

function createStorageStub() {
  const store = new Map();
  const calls = [];
  return {
    calls,
    get length() { return store.size; },
    getItem(key) { calls.push(['get', key]); return store.has(key) ? store.get(key) : null; },
    setItem(key, value) { calls.push(['set', key]); store.set(key, String(value)); },
    removeItem(key) { calls.push(['remove', key]); store.delete(key); },
    key(index) { return Array.from(store.keys())[index] ?? null; },
  };
}

test('the client cap mirrors the server cap exactly (20 MiB, migration 0016)', async () => {
  assert.equal(SHOWROOM_SNAPSHOT_MAX_BYTES, 20 * MIB);
  const migration = await readSource('supabase/migrations/0016_centralized_showroom_state.sql');
  assert.match(migration, /octet_length\(p_snapshot::text\) > 20971520/, 'server hard limit the client mirrors');
  assert.match(migration, /LENA_SNAPSHOT_TOO_LARGE/);
});

test('snapshot measurement counts real UTF-8 bytes, including Arabic', () => {
  assert.equal(measureSnapshotBytes({ a: 1 }), JSON.stringify({ a: 1 }).length);
  assert.ok(measureSnapshotBytes({ name: 'فستان' }) > JSON.stringify({ name: 'فستان' }).length, 'Arabic is multi-byte; a naive string length would undercount');
});

test('size classification: unknown / normal / warning at 50% / critical at 80%', () => {
  assert.equal(classifySnapshotSize(null), 'unknown');
  assert.equal(classifySnapshotSize(Number.NaN), 'unknown');
  assert.equal(classifySnapshotSize(5 * MIB), 'normal');
  assert.equal(classifySnapshotSize(10 * MIB), 'warning');
  assert.equal(classifySnapshotSize(16 * MIB), 'critical');
  assert.equal(classifySnapshotSize(25 * MIB), 'critical');

  assert.equal(isSnapshotWithinServerLimit(SHOWROOM_SNAPSHOT_MAX_BYTES - 1), true);
  assert.equal(isSnapshotWithinServerLimit(SHOWROOM_SNAPSHOT_MAX_BYTES), false);
});

test('size readings round-trip through platform storage and reject corrupt payloads', () => {
  const storage = createStorageStub();
  const reading = recordSnapshotSize(7 * MIB, 'commit', storage);
  assert.equal(reading.bytes, 7 * MIB);
  assert.equal(reading.source, 'commit');

  const restored = readSnapshotSizeReading(storage);
  assert.deepEqual(restored, reading);

  storage.setItem('dress-roomshow:snapshot-size-metrics', '{broken json');
  assert.equal(readSnapshotSizeReading(storage), null);

  storage.setItem('dress-roomshow:snapshot-size-metrics', JSON.stringify({ bytes: 'big', measuredAt: 5, source: 'elsewhere' }));
  assert.equal(readSnapshotSizeReading(storage), null);

  assert.equal(readSnapshotSizeReading(null), null, 'no storage means a calm unknown, not a crash');
});

test('a critical reading raises telemetry at most once per day and never throws', () => {
  const storage = createStorageStub();
  assert.doesNotThrow(() => recordSnapshotSize(17 * MIB, 'hydration', storage));
  const today = new Date().toISOString().slice(0, 10);
  assert.equal(storage.getItem('dress-roomshow:snapshot-size-telemetry-day'), today, 'first critical reading of the day is flagged');

  const keyWriteCount = storage.calls.filter(([op, key]) => op === 'set' && key === 'dress-roomshow:snapshot-size-telemetry-day').length;
  recordSnapshotSize(18 * MIB, 'commit', storage);
  const keyWriteCountAfter = storage.calls.filter(([op, key]) => op === 'set' && key === 'dress-roomshow:snapshot-size-telemetry-day').length;
  assert.equal(keyWriteCountAfter, keyWriteCount, 'same-day repeats do not spam telemetry');

  assert.doesNotThrow(() => recordSnapshotSize(3 * MIB, 'hydration', storage), 'normal readings stay quiet');
  assert.equal(storage.getItem('dress-roomshow:snapshot-size-telemetry-day'), today);
});

test('the commit path pre-checks size and maps the server rejection to the same operator-safe message', async () => {
  const cloudState = await readSource('src/features/sync/showroomCloudState.ts');

  assert.match(cloudState, /measureSnapshotBytes\(prepared\)[\s\S]*?isSnapshotWithinServerLimit[\s\S]*?rpc\(/, 'the guard runs before the RPC round-trip');
  assert.match(cloudState, /SNAPSHOT_TOO_LARGE_MESSAGE[\s\S]*?'LENA_SNAPSHOT_TOO_LARGE'/, 'the pre-check throws the same code the server would raise');
  assert.match(cloudState, /error\.message\.includes\('LENA_SNAPSHOT_TOO_LARGE'\)/, 'a server-side rejection maps to the readable message, not the generic one');
  assert.match(cloudState, /recordSnapshotSize\(snapshotBytes, 'commit'\)/, 'an accepted commit refreshes the gauge');
  assert.match(cloudState, /recordSnapshotSize\(measureSnapshotBytes\(row\.snapshot\), 'hydration'\)/, 'hydration refreshes the gauge too');
  assert.match(cloudState, /import \{[\s\S]*?SNAPSHOT_TOO_LARGE_MESSAGE[\s\S]*?\} from '\.\/snapshotSizeMetrics'/, 'shared wording import present');
});

test('the model file keeps the warning/critical thresholds explicit and the admin page surfaces them', async () => {
  const metrics = await readSource('src/features/sync/snapshotSizeMetrics.ts');
  assert.match(metrics, /SNAPSHOT_SIZE_WARNING_RATIO = 0\.5/);
  assert.match(metrics, /SNAPSHOT_SIZE_CRITICAL_RATIO = 0\.8/);

  const page = await readSource('src/features/preferences/PreferencesPage.tsx');
  assert.match(page, /حجم قاعدة البيانات المركزية/);
  assert.match(page, /readSnapshotSizeReading\(\)/);
  assert.match(page, /classifySnapshotSize/);
  assert.match(page, /SHOWROOM_SNAPSHOT_MAX_BYTES/);
  assert.match(page, /role="alert"/, 'the critical state must announce itself to assistive tech');
  assert.match(page, /سيتوقف حفظ أي عملية جديدة/, 'the operator learns the consequence before it happens');
});
