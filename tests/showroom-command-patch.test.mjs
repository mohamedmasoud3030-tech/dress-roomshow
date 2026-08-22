import assert from 'node:assert/strict';
import test from 'node:test';
import { buildShowroomCommandPatch, patchHasChanges } from '../src/features/sync/showroomCommandPatch.ts';

function snapshot(collections) {
  return {
    applicationId: 'dress-roomshow',
    schemaVersion: 3,
    backupVersion: 4,
    exportedAt: '2026-08-22T00:00:00.000Z',
    metadata: { applicationId: 'dress-roomshow', schemaVersion: 3, updatedAt: '2026-08-22T00:00:00.000Z' },
    collections,
  };
}

test('command patch sends only changed entities and never client-authored audit/history', () => {
  const before = snapshot({
    dresses: [{ id: 'dress-1', code: 'DR-001', status: 'available' }],
    reservations: [{ id: 'reservation-1', remainingAmount: 50 }],
    'audit-log': [{ id: 'audit-old', summary: 'old' }],
    'command-log': [{ id: 'local-command-old' }],
  });
  const after = snapshot({
    dresses: [{ id: 'dress-1', code: 'DR-001', status: 'rented' }],
    reservations: [{ id: 'reservation-1', remainingAmount: 0 }],
    'audit-log': [
      { id: 'audit-client-forged', summary: 'forged' },
      { id: 'audit-old', summary: 'old' },
    ],
    'command-log': [{ id: 'local-command-new' }],
  });

  const patch = buildShowroomCommandPatch(before, after);

  assert.deepEqual(patch.upserts?.dresses, [{ id: 'dress-1', code: 'DR-001', status: 'rented' }]);
  assert.deepEqual(patch.upserts?.reservations, [{ id: 'reservation-1', remainingAmount: 0 }]);
  assert.equal(patch.upserts?.['audit-log'], undefined);
  assert.equal(patch.upserts?.['command-log'], undefined);
  assert.equal(patch.deletes?.['audit-log'], undefined);
  assert.equal(patchHasChanges(patch), true);
});

test('command patch represents entity deletion explicitly instead of replacing a whole snapshot', () => {
  const before = snapshot({ accessories: [{ id: 'accessory-1', code: 'AC-001' }] });
  const after = snapshot({ accessories: [] });
  const patch = buildShowroomCommandPatch(before, after);

  assert.deepEqual(patch.deletes, { accessories: ['accessory-1'] });
  assert.equal(patch.replacements, undefined);
});

test('owner-only singleton settings use a narrow collection replacement', () => {
  const before = snapshot({ preferences: [{ showroomName: 'LENA', reservationBufferDays: 1 }] });
  const after = snapshot({ preferences: [{ showroomName: 'LENA', reservationBufferDays: 2 }] });
  const patch = buildShowroomCommandPatch(before, after);

  assert.deepEqual(patch.replacements, {
    preferences: [{ showroomName: 'LENA', reservationBufferDays: 2 }],
  });
  assert.equal(patch.upserts, undefined);
});

test('unchanged snapshots produce an empty patch', () => {
  const state = snapshot({ customers: [{ id: 'customer-1', name: 'A' }] });
  const patch = buildShowroomCommandPatch(state, JSON.parse(JSON.stringify(state)));
  assert.deepEqual(patch, {});
  assert.equal(patchHasChanges(patch), false);
});
