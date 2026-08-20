import test from 'node:test';
import assert from 'node:assert/strict';
import { Blob } from 'node:buffer';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath, URL } from 'node:url';

import {
  BACKUP_COPY_NAME_PATTERN,
  buildBackupCopyName,
  downloadCloudBackupCopy,
  listCloudBackupCopies,
  normalizeBackupCopyList,
  pruneBackupCopies,
  selectBackupCopiesToPrune,
  storeBackupCopySafely,
  uploadBackupCopy,
} from '../src/platform/backups/cloudBackupCopies.ts';

const repositoryRoot = fileURLToPath(new URL('..', import.meta.url));
const readSource = (path) => readFile(join(repositoryRoot, path), 'utf8');

function createFakeStorage(failures = {}) {
  const rows = [];
  const calls = { uploads: [], removes: [], downloads: [] };
  return {
    rows,
    calls,
    async upload(name, body) {
      if (failures.upload) throw new Error('upload denied');
      calls.uploads.push({ name, body });
      rows.push({ name, created_at: '2026-08-20T10:00:00.000Z', metadata: { size: body.size } });
    },
    async list() {
      if (failures.list) throw new Error('list denied');
      return rows.slice();
    },
    async download(name) {
      if (failures.download) throw new Error('download denied');
      calls.downloads.push(name);
      const found = calls.uploads.find((upload) => upload.name === name);
      if (!found) throw new Error('not found');
      return found.body;
    },
    async remove(names) {
      if (failures.remove) throw new Error('remove denied');
      calls.removes.push(names.slice());
      for (const name of names) {
        const index = rows.findIndex((row) => row.name === name);
        if (index >= 0) rows.splice(index, 1);
      }
    },
  };
}

test('backup copy names are deterministic, storage-safe, and sort as time', () => {
  const name = buildBackupCopyName('2026-08-20T08:15:30.500Z');
  assert.equal(name, 'lena-backup-2026-08-20T08-15-30-500Z.json');
  assert.match(name, BACKUP_COPY_NAME_PATTERN);
  assert.throws(() => buildBackupCopyName('not-a-date'), TypeError);

  const morning = buildBackupCopyName('2026-08-20T00:00:00.000Z');
  const night = buildBackupCopyName('2026-08-20T23:59:59.999Z');
  const nextDay = buildBackupCopyName('2026-08-21T00:00:00.000Z');
  assert.ok(morning < night && night < nextDay, 'lexicographic order must match chronological order');
});

test('upload writes the exact backup payload under a recognized copy name', async () => {
  const storage = createFakeStorage();
  const json = JSON.stringify({ applicationId: 'lena', collections: { customers: [] } });

  const status = await uploadBackupCopy({ json, exportedAt: '2026-08-20T10:00:00.000Z' }, storage);

  assert.equal(status, 'saved');
  assert.equal(storage.calls.uploads.length, 1);
  assert.match(storage.calls.uploads[0].name, BACKUP_COPY_NAME_PATTERN);
  assert.equal(storage.calls.uploads[0].body.type, 'application/json');
  assert.equal(await storage.calls.uploads[0].body.text(), json, 'the copy must be byte-equal to the exported backup');
});

test('upload failures resolve to a status and never throw; unconfigured environments skip', async () => {
  const failing = await uploadBackupCopy(
    { json: '{}', exportedAt: '2026-08-20T10:00:00.000Z' },
    createFakeStorage({ upload: true }),
  );
  assert.equal(failing, 'failed');

  // Node has no window, so the default binding resolves to "unavailable".
  const skipped = await uploadBackupCopy({ json: '{}', exportedAt: '2026-08-20T10:00:00.000Z' });
  assert.equal(skipped, 'skipped');
});

test('listing shows only app-created copies, newest first, with sizes; list failures degrade to null', async () => {
  const storage = createFakeStorage();
  storage.rows.push(
    { name: 'lena-backup-2026-08-18T10-00-00-000Z.json', created_at: '2026-08-18T10:00:00.000Z', metadata: { size: 10 } },
    { name: 'lena-backup-2026-08-20T10-00-00-000Z.json', created_at: '2026-08-20T10:00:00.000Z', metadata: { size: 42 } },
    { name: 'foreign-object.txt', created_at: '2026-08-21T10:00:00.000Z', metadata: { size: 999 } },
    { name: 'lena-backup-manual.json', created_at: '2026-08-21T11:00:00.000Z', metadata: { size: 5 } },
  );

  const copies = await listCloudBackupCopies(storage);
  assert.deepEqual(
    copies.map((copy) => copy.name),
    ['lena-backup-2026-08-20T10-00-00-000Z.json', 'lena-backup-2026-08-18T10-00-00-000Z.json'],
    'foreign objects must never appear in the recovery list',
  );
  assert.equal(copies[0].bytes, 42);
  assert.equal(copies[0].createdAt, '2026-08-20T10:00:00.000Z');

  assert.equal(await listCloudBackupCopies(createFakeStorage({ list: true })), null);
});

test('retention keeps the newest copies and removes only the stale ones', async () => {
  const storage = createFakeStorage();
  for (let day = 1; day <= 25; day += 1) {
    storage.rows.push({
      name: `lena-backup-2026-08-${String(day).padStart(2, '0')}T10-00-00-000Z.json`,
      created_at: null,
      metadata: { size: day },
    });
  }

  const removed = await pruneBackupCopies(storage, 20);

  assert.equal(removed, 5);
  assert.deepEqual(
    new Set(storage.calls.removes[0]),
    new Set([
      'lena-backup-2026-08-01T10-00-00-000Z.json',
      'lena-backup-2026-08-02T10-00-00-000Z.json',
      'lena-backup-2026-08-03T10-00-00-000Z.json',
      'lena-backup-2026-08-04T10-00-00-000Z.json',
      'lena-backup-2026-08-05T10-00-00-000Z.json',
    ]),
    'only the five oldest copies may be removed',
  );
  const remaining = await listCloudBackupCopies(storage);
  assert.equal(remaining.length, 20);
  assert.equal(remaining.at(-1).name, 'lena-backup-2026-08-06T10-00-00-000Z.json');
});

test('retention keeps at least one copy even with an extreme keep value, and remove failures are swallowed', async () => {
  const copies = normalizeBackupCopyList([
    { name: 'lena-backup-2026-08-01T10-00-00-000Z.json' },
    { name: 'lena-backup-2026-08-02T10-00-00-000Z.json' },
  ]);
  assert.deepEqual(selectBackupCopiesToPrune(copies, 0), ['lena-backup-2026-08-01T10-00-00-000Z.json']);
  assert.deepEqual(selectBackupCopiesToPrune(copies, 20), []);

  const storage = createFakeStorage({ remove: true });
  storage.rows.push({ name: 'lena-backup-2026-08-01T10-00-00-000Z.json', metadata: { size: 1 } });
  assert.equal(await pruneBackupCopies(storage, 1), 0, 'a failed prune must resolve quietly');
});

test('downloading a copy parses the payload; guards reject foreign names and corrupt JSON', async () => {
  const storage = createFakeStorage();
  const backup = { applicationId: 'lena', collections: { customers: [{ id: 'c1' }] } };
  await uploadBackupCopy({ json: JSON.stringify(backup), exportedAt: '2026-08-20T10:00:00.000Z' }, storage);
  const [uploaded] = storage.calls.uploads;

  const parsed = await downloadCloudBackupCopy(uploaded.name, storage);
  assert.deepEqual(parsed, backup);

  assert.equal(await downloadCloudBackupCopy('..%2fsecrets.json', storage), null);
  assert.equal(storage.calls.downloads.length, 1, 'a non-copy name must never reach storage');

  const corrupt = createFakeStorage();
  corrupt.calls.uploads.push({ name: 'lena-backup-2026-08-20T10-00-00-000Z.json', body: new Blob(['{broken']) });
  assert.equal(await downloadCloudBackupCopy('lena-backup-2026-08-20T10-00-00-000Z.json', corrupt), null);

  assert.equal(await downloadCloudBackupCopy(uploaded.name, createFakeStorage({ download: true })), null);
});

test('storing a copy uploads first and prunes after, so the newest copy always survives', async () => {
  const storage = createFakeStorage();
  for (let day = 1; day <= 22; day += 1) {
    storage.rows.push({ name: `lena-backup-2026-07-${String(day).padStart(2, '0')}T10-00-00-000Z.json`, metadata: { size: 1 } });
  }

  const status = await storeBackupCopySafely({ json: '{"ok":true}', exportedAt: '2026-08-20T10:00:00.000Z' }, storage);

  assert.equal(status, 'saved');
  assert.equal(storage.calls.uploads.length, 1, 'the export produced exactly one server copy');
  assert.equal(storage.calls.removes.length, 1, 'retention ran once after the upload');
  const remaining = await listCloudBackupCopies(storage);
  assert.equal(remaining.length, 20);
  assert.equal(remaining[0].name, 'lena-backup-2026-08-20T10-00-00-000Z.json', 'the fresh copy is never pruned');

  const failingStorage = createFakeStorage({ upload: true });
  const failed = await storeBackupCopySafely({ json: '{}', exportedAt: '2026-08-20T10:00:00.000Z' }, failingStorage);
  assert.equal(failed, 'failed');
  assert.equal(failingStorage.calls.removes.length, 0, 'retention must not run when nothing was stored');
});

test('the export service copies after the audited download, and reports silent failures', async () => {
  const service = await readSource('src/features/preferences/backupExport.service.ts');

  assert.match(service, /recordBackupExportCommand[\s\S]*storeBackupCopySafely/, 'the server copy stays outside the audited command boundary');
  assert.match(service, /return \{ backup, filename, cloudCopy \}/);
  assert.match(service, /reportClientError\('backup-cloud-copy'/, 'silent copy failures remain observable');
  assert.match(service, /describeCloudCopyStatus/, 'callers share one wording for the copy result');
});

test('the preferences page lists, downloads, and restores server copies behind an explicit confirm', async () => {
  const page = await readSource('src/features/preferences/PreferencesPage.tsx');

  assert.match(page, /listCloudBackupCopies/);
  assert.match(page, /downloadCloudBackupCopy/);
  assert.match(page, /نسخ الخادم الاحتياطية/);
  assert.match(page, /status: 'unavailable'/, 'an offline or unconfigured showroom needs a calm unavailable state');
  assert.match(page, /لا توجد نسخ محفوظة على الخادم بعد/, 'the empty state explains when copies appear');
  assert.match(
    page,
    /window\.confirm\('سيتم استبدال بيانات التطبيق الحالية بالكامل بنسخة الخادم المختارة\. هل أنتِ متأكدة؟'\)[\s\S]*?await importDatabaseBackupCommand\(parsed\)/,
    'restore must reuse the validated import path after explicit confirmation',
  );
  assert.match(page, /describeCloudCopyStatus\(cloudCopy\)/);
});

test('the daily close tells the operator what happened to the server copy', async () => {
  const page = await readSource('src/features/reports/DailyClosingPage.tsx');

  assert.match(page, /const \{ cloudCopy \} = await exportBackupForDownload/);
  assert.match(page, /describeCloudCopyStatus\(cloudCopy\)/);
  assert.match(page, /catch \{[\s\S]*?setBackupWarning/, 'a download failure still leaves the closed day intact');
});

test('the provisioned backups bucket and its active-user policies still exist in the migrations', async () => {
  const migration = await readSource('supabase/migrations/0011_sale_ready_auth_hardening.sql');

  assert.match(migration, /'backups', 'backups', false, 104857600/, 'the private backups bucket is the copy target');
  assert.match(migration, /allowed_mime_types[\s\S]*?application\/json/, 'JSON backups fit the bucket contract');
  assert.match(migration, /bucket_id in \('condition-photos', 'backups'\)[\s\S]*?private\.is_active_lena_user\(\)/, 'only active showroom users read copies');
  assert.match(migration, /bucket_id in \('catalogue-images', 'condition-photos', 'backups'\)[\s\S]*?private\.is_active_lena_user\(\)/, 'only active showroom users write copies');
});
