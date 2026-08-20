# File & Media System Spec — LENA

> Date: 2026-08-20 · Branch: `arena/01a01f12-lenadress` · Owner-directed media/storage ownership task.
> Author: Arena single-agent team (plan → implement → independently review), evidence-linked.
> Rule: user-provided files are untrusted input everywhere in this document.

## 1. Resource matrix (complete inventory)

| Resource | Entry point | Storage | Bucket / container | Access | Size/count floors | Content verification |
| --- | --- | --- | --- | --- | --- | --- |
| Catalogue photos (فساتين/قطع) | `src/features/dresses/ImageUpload.tsx` (picker or drag-drop) | on-device record (data URL) + hosted copy via `supabaseImageUpload.ts` | `catalogue-images` (public, anonymous read — the landing page needs it) | write/delete: active staff only (RLS 0011) | ≤ 12 MB picked, ≤ 5 photos/item; stored ≤ ~130 KB after 1280px re-encode | **NEW:** magic-byte sniff (JPEG/PNG/WebP only) in `imageContentGuard`, enforced before decode in `compressImageFile`; server allowlist mirrors it |
| Condition evidence photos | `src/features/delivery-return/ConditionPhotoCapture.tsx` (`capture="environment"`) | inside the operational record → central snapshot → travels in every backup | `condition-photos` bucket exists but is **deliberately unused today** | private (active users) by migration 0011 | ≤ 12 MB picked, exactly ≤ 4 per handover (`getConditionPhotoSizeError`) | same shared guard (same compression entry point) |
| Backup files (export) | Preferences / daily-close export | device download + server copy | `backups` (private, 100 MiB, json/gzip) | active users write; admin restores via the admin-only preferences route | bucket ceiling 100 MiB; retention newest 20; deterministic timestamped names | JSON shape validated by the existing import command before any replace |
| Backup file (import/restore) | `PreferencesPage.tsx` file input, `accept="application/json,.json"` | memory only | — | admin route | **NEW:** ≤ 100 MiB rejected before `file.text()` (prevents tab-freeze on hostile files) | schema/structure validation in `importDatabaseBackupCommand` |
| Catalogue public reads | `landingDress.repository.ts` REST GET | — | `catalogue_items` (narrow anon projection) | anonymous, available-items only | — | 12 s abort timeout (fail-closed Arabic error) |
| Barcode labels / printed docs | generated client-side (jsbarcode) | none persisted | — | — | label stock settings | not user input; out of media scope |
| Avatars / attachments / chat media | **do not exist in this product** — no avatar concept, no messaging attachments (WhatsApp hands off externally) | | | | | |

## 2. Access policy (decided from product need + domain risk)

- **Public by design:** `catalogue-images` only. Justification: anonymous visitors must see
  available pieces on `/landing` without a session. Everything that requires auth to WRITE is
  RLS-enforced (`private.is_active_lena_user()`), verified by policy-matrix tests.
- **Private:** condition evidence (customer-present legal evidence), backups (full business
  data). Both are never public-readable; no code path generates public URLs for them.
- **Signed/expiring URLs: deliberately not used.** Public content uses stable public URLs
  (the product need); private content is fetched through the authenticated Storage client
  (`bucket.download`) so access rides the session and dies with it — there is nothing to
  expire, which removes the "expired link" failure class entirely rather than managing it.
  A test asserts `createSignedUrl` appears nowhere in the media paths.
- **Cross-user access:** single-showroom model — every active account sees the same records;
  the boundary enforced server-side is *active showroom member vs the world*, not
  customer-level partitioning. Multi-tenant isolation is out of product scope (ADR 0001).
- **User B (unauthenticated/unauthorized):** verified by contract tests — anon may read ONLY
  the catalogue projection; the two private buckets require active membership for ALL verbs;
  authenticated-but-inactive profiles fail the same check (function gates on `is_active`).

## 3. Lifecycle

| Stage | Catalogue photos | Condition photos | Backup copies |
| --- | --- | --- | --- |
| Create | pick → sniff → rasterize (1280px WebP q0.82, JPEG fallback, never enlarge) → record | capture → sniff → rasterize → record | export → device download → best-effort server copy |
| Stored as | data URL in record; hosted URL replaces it after best-effort upload (`inventory.images` command, idempotent per piece) | compressed data URL inside the handover record | `lena-backup-<ISO>.json` in `backups` |
| Read | `<img>` from record / landing via public URL | record views + contract evidence | admin list/download/restore in `/preferences` |
| Replace | re-pick → same pipeline; hosted URLs only ever point to current record content | re-capture | new export appends a new dated copy |
| Delete | image removal from the form (record-level); **hard-delete of an unreferenced piece now also reclaims its hosted objects** (best-effort, after the audited delete, strict path derivation) | photo removal from the handover form | retention prunes beyond newest 20; admin may delete from the console |
| Backup coverage | yes (device data URLs; hosted URLs as references) | yes (inside records, by design) | the copies ARE the point-in-time history |

## 4. Limits and cost controls

- Picker floors: 12 MB/file, 5/item (catalogue), 4/handover (evidence), 100 MiB (backup import).
  After re-encode a showroom photo is typically ≈ 50–150 KB → a full year of heavy use stays
  in low single-digit MB of Storage; the entire design fits Supabase free tier (1 GB) with
  orders of magnitude of headroom. **No paid media service is introduced** — current tools
  satisfy the need safely (per policy: no paid provider unless current tools fail).
- Cost abuse: anonymous users cannot upload anything (no anon write policies anywhere);
  the public surface is GET-only on a narrow projection with an app-level timeout.
- Filename/object-key rules: generated (`<dressId>/<uuid4>.<ext>` for uploads;
  `lena-backup-<ISO>.json` for copies) — never raw user filenames → collisions and
  path-traversal are structurally impossible; the derivation helper refuses `..`, wrong
  buckets, unexpected depth, unsafe characters, and non-https URLs (tested).

## 5. UX states (Arabic, enforced by components/tests)

- Processing: «جارٍ ضغط الصور…» (role=status) on both capture points.
- Rejection: specific operator-readable messages — unsupported type («الصيغة غير مدعومة:
  JPG/PNG/WebP»), oversize with the exact limit, count cap with the number.
- Quiet successes: compression savings note; server-copy status sentence on exports.
- Failure/empty/unavailable: upload failures degrade to device-local storage (retryable on
  later save); the cloud-copies card has loading/empty/unavailable states; the snapshot-size
  card narrates warnings at 50/80%.
- Accessibility: `role="alert"` on errors, labelled icon-only buttons, `sr-only` file inputs
  bound to visible labels, 16px touch targets, no zoom-lock.

## 6. Retention & orphan strategy

- Server backup copies: keep newest 20 (client-side prune after each successful copy;
  server scheduling is the separately-documented owner decision).
- Catalogue orphans: prevented at the only consistent points — creation sync replaces data
  URLs with hosted URLs idempotently, and the guarded hard-delete now reclaims hosted
  objects. Residual orphans (failed remote deletes, archived pieces keeping their photos by
  design) are swept manually via the Supabase console storage browser; a sweep entry lives
  in the ops runbook. **Archive ≠ orphan:** archived pieces keep their photos so the
  historical record and any re-listing stay intact.
- Condition photos/archive: retained with the record (legal evidence); reset/import flows
  already cover them through the versioned backup format.
- **Destructive live-bucket cleanups and bucket-policy changes are NOT executed by this
  task** — current policies already enforce the decided matrix; any tightening (e.g.,
  narrowing the public catalogue) is a product decision gated on the owner (see report).

## 7. Test evidence (all in the default gate)

`tests/file-media-controls.test.mjs` (10) + existing suites — mapped to the required matrix:

| Required scenario | Where verified |
| --- | --- |
| Authorized user A vs unauthorized user B | RLS policy-matrix contracts on migration 0011; session-required upload/delete behavior returns safe null/false without a session (Node-verified) |
| Invalid types | sniff vectors: SVG/EXE/GIF/HEIC/truncated/empty rejected; JPEG/PNG/WebP accepted; compression entry enforces before decode |
| Oversized | 12 MB floors (both capture points), 100 MiB backup-import guard before parsing |
| Duplicate names | generated UUID object keys; deterministic backup names (idempotent re-export) |
| Failed upload | best-effort null outcomes; record keeps local copies; upload error surfaced specifically |
| Replacement | single audited `inventory.images` command swaps device data URLs → hosted URLs |
| Deletion | hard-delete → strict-path, best-effort hosted-object reclamation; blockers still force archive for historical records |
| Expired links | non-feature by decision; authenticated-download model asserted (`createSignedUrl` absent) |

Plus the standing suites that guard the neighboring behavior: `condition-evidence`, `storage-capacity`, `cloud-backup-copies` (12), `backup-integrity`, `daily-close-backup`.

## 8. Decisions deferred to the owner (only true product/policy questions)

1. **Keep `catalogue-images` public** — recommended YES (the landing page is the storefront);
   the only alternative is login-gating the storefront, which contradicts the product.
2. Scheduled server-side jobs (nightly backup/retention) remain the production/infra decision
   already queued in `TECHNICAL_REMEDIATION_PLAN.md` (M4/M5) — nothing here requires them.
