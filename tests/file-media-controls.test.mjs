import test from 'node:test';
import assert from 'node:assert/strict';
import { Blob } from 'node:buffer';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath, URL } from 'node:url';

import {
  ALLOWED_IMAGE_MIME_TYPES,
  sniffImageMimeType,
  UNSUPPORTED_IMAGE_CONTENT_MESSAGE,
  verifyImageFileContent,
} from '../src/platform/images/imageContentGuard.ts';
import {
  deleteCatalogueImageByUrl,
  deriveCatalogueImagePath,
  uploadCompressedImageToSupabase,
} from '../src/platform/images/supabaseImageUpload.ts';
import {
  getConditionPhotoSizeError,
  MAX_CONDITION_PHOTO_BYTES,
} from '../src/features/delivery-return/ConditionPhotoCapture.tsx';
import { compressImageFile } from '../src/platform/images/imageCompression.ts';

const repositoryRoot = fileURLToPath(new URL('..', import.meta.url));
const readSource = (path) => readFile(join(repositoryRoot, path), 'utf8');

const blobFromBytes = (bytes) => new Blob([Uint8Array.from(bytes)]);
const JPEG = blobFromBytes([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);
const PNG = blobFromBytes([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
const WEBP = blobFromBytes([0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50]);
const SVG = blobFromBytes([0x3c, 0x73, 0x76, 0x67, 0x20]); // '<svg '
const EXE = blobFromBytes([0x4d, 0x5a, 0x90, 0x00]); // 'MZ' windows executable
const GIF = blobFromBytes([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]);
const HEIC = blobFromBytes([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70, 0x68, 0x65, 0x69, 0x63]);

test('content verification accepts exactly JPEG/PNG/WebP and rejects active or decoy content', async () => {
  assert.equal(await sniffImageMimeType(JPEG), 'image/jpeg');
  assert.equal(await sniffImageMimeType(PNG), 'image/png');
  assert.equal(await sniffImageMimeType(WEBP), 'image/webp');

  assert.equal(await sniffImageMimeType(SVG), null, 'SVG is active content, not an image for us');
  assert.equal(await sniffImageMimeType(EXE), null, 'renamed executables carry no image signature');
  assert.equal(await sniffImageMimeType(GIF), null, 'GIF is outside the bucket allowlist');
  assert.equal(await sniffImageMimeType(HEIC), null, 'HEIC decodes unreliably on the showroom devices');
  assert.equal(await sniffImageMimeType(blobFromBytes([0xff, 0xd8])), null, 'truncated headers are not images');
  assert.equal(await sniffImageMimeType(new Blob([])), null, 'empty files are not images');

  await assert.rejects(verifyImageFileContent(SVG), new RegExp(UNSUPPORTED_IMAGE_CONTENT_MESSAGE.slice(0, 20)));
  assert.equal(await verifyImageFileContent(PNG), 'image/png');
  assert.deepEqual([...ALLOWED_IMAGE_MIME_TYPES], ['image/jpeg', 'image/png', 'image/webp']);
});

test('the compression pipeline enforces content verification before decoding', async () => {
  await assert.rejects(compressImageFile(EXE), /غير مدعومة/, 'a decoy file must never reach the decoder or a record');

  const compression = await readSource('src/platform/images/imageCompression.ts');
  assert.match(compression, /await verifyImageFileContent\(file\);[\s\S]*?readFileAsDataUrl/, 'verification precedes reading the file');
});

test('capture points keep their type/size/count floors and surface the guard message', async () => {
  const imageUpload = await readSource('src/features/dresses/ImageUpload.tsx');
  assert.match(imageUpload, /MAX_IMAGE_SIZE_BYTES = 12 \* 1024 \* 1024/);
  assert.match(imageUpload, /maxImages = 5/);
  assert.match(imageUpload, /file\.type\.startsWith\('image\/'\)/);
  assert.match(imageUpload, /error instanceof Error && error\.message \? error\.message/, 'the operator sees the specific rejection, not a shrug');

  assert.equal(getConditionPhotoSizeError([{ name: 'ok.jpg', size: 5 * 1024 * 1024 }]), null);
  assert.match(
    getConditionPhotoSizeError([{ name: 'huge.jpg', size: MAX_CONDITION_PHOTO_BYTES + 1 }]),
    /أكبر من الحد المسموح/,
  );

  const capture = await readSource('src/features/delivery-return/ConditionPhotoCapture.tsx');
  assert.match(capture, /const MAX_PHOTOS = 4/);
  assert.match(capture, /capture="environment"/, 'handover evidence comes from the live camera, not the gallery');
});

test('catalogue object path derivation is strict: traversal, decoys, and foreign buckets are refused', () => {
  const base = 'https://project.supabase.co';
  assert.equal(
    deriveCatalogueImagePath(`${base}/storage/v1/object/public/catalogue-images/dress-01/outfit.webp`),
    'dress-01/outfit.webp',
  );
  assert.equal(
    deriveCatalogueImagePath(`${base}/storage/v1/object/public/catalogue-images/dress-01/outfit.webp?download=1`),
    'dress-01/outfit.webp',
    'query strings must not affect the derived path',
  );
  assert.equal(
    deriveCatalogueImagePath(`${base}/storage/v1/object/public/catalogue-images/dress-01/outfit.png`),
    'dress-01/outfit.png',
  );

  assert.equal(deriveCatalogueImagePath(`${base}/storage/v1/object/public/condition-photos/a/b.webp`), null, 'private buckets are never cleaned through the public path');
  assert.equal(deriveCatalogueImagePath(`${base}/storage/v1/object/public/catalogue-images/../../secret`), null, 'traversal attempt');
  assert.equal(deriveCatalogueImagePath(`${base}/storage/v1/object/public/catalogue-images/a/b/c/d.webp`), null, 'unexpected depth');
  assert.equal(deriveCatalogueImagePath(`${base}/storage/v1/object/public/catalogue-images/dress 01/x y.webp`), null, 'unsafe characters');
  assert.equal(deriveCatalogueImagePath('http://project.supabase.co/storage/v1/object/public/catalogue-images/a/b.webp'), null, 'http is not our public URL scheme');
  assert.equal(deriveCatalogueImagePath('data:image/webp;base64,AAAA'), null, 'local data URLs are not remote objects');
});

test('failed or unauthenticated storage operations degrade quietly instead of breaking the counter', async () => {
  // This Node runtime has no window/session: the honest sandbox proof that
  // "user B without a session" can neither upload nor delete anything.
  assert.equal(await uploadCompressedImageToSupabase('dress-01', 'data:image/webp;base64,AAAA'), null);
  assert.equal(await deleteCatalogueImageByUrl('https://project.supabase.co/storage/v1/object/public/catalogue-images/dress-01/a.webp'), false);
});

test('hard-deleting a piece reclaims only its hosted catalogue objects (orphan control)', async () => {
  const service = await readSource('src/features/dresses/dress.service.ts');

  assert.match(service, /getDressHardDeleteBlockers[\s\S]*?void cleanupHostedDressImages\(dress\.images\)/, 'cleanup runs only after blockers pass and the audited delete completes');
  assert.match(service, /cleanupHostedDressImages[\s\S]*?startsWith\('https:\/\/'\)/, 'local data-URL images never touch the bucket');
  assert.match(service, /deleteCatalogueImageByUrl/, 'deletion goes through the strict path derivation');
});

test('replacement uploads write hosted URLs through one audited, dress-scoped command', async () => {
  const service = await readSource('src/features/dresses/dress.service.ts');

  assert.match(service, /runCommand\(\s*\{ name: 'inventory\.images', idempotencyKey: `images:\$\{dress\.id\}` \}/, 'one idempotent images command per piece');
  assert.match(service, /updateDress\(dress\.code, \{ images: publicImageUrls \}\)/, 'the record moves from device data URLs to hosted URLs atomically');
});

test('backup restore intake rejects oversize files before any parsing work', async () => {
  const page = await readSource('src/features/preferences/PreferencesPage.tsx');

  assert.match(page, /MAX_BACKUP_IMPORT_BYTES = 100 \* 1024 \* 1024/);
  assert.match(page, /file\.size > MAX_BACKUP_IMPORT_BYTES[\s\S]*?JSON\.parse/, 'the size floor runs before file.text(); the tab never chokes on a hostile file');
  assert.match(page, /accept="application\/json,\.json"/);
});

test('no expiring signed URLs are minted anywhere: public needs stable URLs, private needs the session', async () => {
  const uploads = await readSource('src/platform/images/supabaseImageUpload.ts');
  const backups = await readSource('src/platform/backups/cloudBackupCopies.ts');
  const catalogueRead = await readSource('src/pages/landing/landingDress.repository.ts');

  assert.doesNotMatch(uploads + backups + catalogueRead, /createSignedUrl/, 'signed URLs are a deliberate non-feature per FILE_MEDIA_SYSTEM_SPEC.md');
  assert.match(backups, /bucket\.download\(name\)/, 'private backups travel through the authenticated session');
  assert.equal(ALLOWED_IMAGE_MIME_TYPES.includes('image/svg+xml'), false, 'SVG stays off every allowlist');
});

test('RLS migration matrix: public catalogue only; condition photos and backups stay active-user only', async () => {
  const migration = await readSource('supabase/migrations/0011_sale_ready_auth_hardening.sql');

  assert.match(migration, /'catalogue-images', 'catalogue-images', true/, 'the catalogue is deliberately public');
  assert.match(migration, /'condition-photos', 'condition-photos', false/, 'evidence photos are private objects');
  assert.match(migration, /'backups', 'backups', false/, 'backup copies are private objects');
  assert.match(migration, /array\['image\/jpeg', 'image\/png', 'image\/webp'\]/, 'server-side allowlist mirrors the client floor');

  assert.match(migration, /create policy lena_catalogue_public_read[\s\S]*?to anon, authenticated[\s\S]*?bucket_id = 'catalogue-images'/, 'anonymous visitors read the public catalogue only');
  assert.match(migration, /create policy lena_storage_active_read[\s\S]*?to authenticated[\s\S]*?bucket_id in \('condition-photos', 'backups'\)[\s\S]*?private\.is_active_lena_user\(\)/, 'unauthorized user B reads nothing private');
  assert.match(migration, /create policy lena_storage_active_insert[\s\S]*?to authenticated[\s\S]*?bucket_id in \('catalogue-images', 'condition-photos', 'backups'\)[\s\S]*?private\.is_active_lena_user\(\)/, 'only active staff write objects');
  assert.doesNotMatch(migration, /to anon[^;]*(condition-photos|backups)/, 'no private bucket may ever gain an anonymous policy');
});
