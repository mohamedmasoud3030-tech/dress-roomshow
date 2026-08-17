import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { fileURLToPath, URL } from 'node:url';
import { join } from 'node:path';
import { createCommitGenerationGuard } from '../src/features/sync/commitGenerationGuard.ts';
import {
  getConditionPhotoSizeError,
  MAX_CONDITION_PHOTO_BYTES,
} from '../src/features/delivery-return/ConditionPhotoCapture.tsx';

const repositoryRoot = fileURLToPath(new URL('..', import.meta.url));
const sourceRoot = join(repositoryRoot, 'src');
const readSource = (relative) => readFile(join(sourceRoot, relative), 'utf8');

test('a rejected cloud commit invalidates every descendant snapshot already in the queue', () => {
  const guard = createCommitGenerationGuard();
  const first = guard.capture();
  const descendant = guard.capture();

  assert.equal(guard.isCurrent(first), true);
  assert.equal(guard.isCurrent(descendant), true);

  guard.invalidate();

  assert.equal(guard.isCurrent(first), false);
  assert.equal(guard.isCurrent(descendant), false);
  assert.equal(guard.isCurrent(guard.capture()), true, 'new work after recovery belongs to a fresh generation');
});

test('condition evidence rejects an oversized phone photo before decoding it', () => {
  assert.equal(
    getConditionPhotoSizeError([{ name: 'safe.webp', size: MAX_CONDITION_PHOTO_BYTES }]),
    null,
  );
  assert.match(
    getConditionPhotoSizeError([{ name: 'huge.jpg', size: MAX_CONDITION_PHOTO_BYTES + 1 }]) ?? '',
    /huge\.jpg.*12 MB/,
  );
});

test('reopening creation dialogs starts with a fresh reservation key and no prior inventory images', async () => {
  const reservation = await readSource('features/reservations/CreateReservationModal.tsx');
  const inventory = await readSource('features/dresses/AddDressModal.tsx');

  assert.match(reservation, /\[submissionKey, setSubmissionKey\]/);
  assert.match(reservation, /if \(!open\) return;[\s\S]*setSubmissionKey\(createSubmissionKey\('rsv'\)\)/);
  assert.ok(
    (inventory.match(/setImages\(\[\]\)/g) ?? []).length >= 2,
    'both opening and closing the inventory form must clear images from the previous item',
  );
});

test('destructive controls match server-enforced administrator permissions', async () => {
  const closing = await readSource('features/reports/DailyClosingPage.tsx');
  const dress = await readSource('features/dresses/DressDetailsPage.tsx');
  const customers = await readSource('features/customers/CustomersPage.tsx');

  assert.match(closing, /closing\.status === 'closed' && isAdmin/);
  assert.match(dress, /isAdmin && \(\s*<button[\s\S]*?handleDelete/);
  assert.match(customers, /canDelete && \(\s*<button[\s\S]*?onDelete/);
});

test('an empty reservation wizard can create its missing customer and inventory without losing context', async () => {
  const modal = await readSource('features/reservations/CreateReservationModal.tsx');
  assert.match(modal, /<AddCustomerModal/);
  assert.match(modal, /إضافة عميلة الآن والعودة للحجز/);
  assert.match(modal, /<AddDressModal/);
  assert.match(modal, /إضافة قطعة مخزون الآن والعودة للحجز/);
  assert.match(modal, /setValue\('customerId', customer\.id/);
});

test('inventory image removal is visible on touch and named for assistive technology', async () => {
  const uploader = await readSource('features/dresses/ImageUpload.tsx');

  assert.match(uploader, /aria-label=\{`حذف صورة العنصر/);
  assert.match(uploader, /opacity-100/);
  assert.match(uploader, /focus-visible:opacity-100/);
  assert.match(uploader, /<X aria-hidden="true"/);
});
