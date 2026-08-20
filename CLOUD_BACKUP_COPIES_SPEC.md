# Implementation Spec — Cloud Backup Copies (Server Point-in-Time Recovery)

> Date: 2026-08-20 · Branch: `arena/01a01f12-lenadress` · Strategy reference: `FEATURE_GAP_STRATEGY.md` (item T1)
> Status: implementation-ready; first vertical slice implemented in the same session.
> Skills applied: `local-data-safety`, `frontend-mobile-rtl`, `release-readiness`.

## 1. Goal

Every backup the operator produces (manual export or post-daily-close) also leaves a dated
copy in the existing private Supabase Storage bucket `backups`. The admin can see the
server copies, download one, and restore one through the existing validated import path.
The showroom gains point-in-time recovery without any new infrastructure.

## 2. Evidence and context

- `supabase/migrations/0011_sale_ready_auth_hardening.sql` creates bucket `backups`
  (private, 100 MiB file limit, `application/json` + `application/gzip`) and active-user
  RLS policies for select/insert/update/delete (`private.is_active_lena_user()`).
- No `src` code references that bucket today (`grep -rn "backups" src` shows only
  legacy-data comments). The server holds only the current `showroom_state` snapshot
  (`src/features/sync/showroomCloudState.ts`), so there is no point-in-time history.
- `PROJECT_STATUS.md` §8 ranks central data continuity the #1 risk.
- Precedent for all mechanics: `src/platform/images/supabaseImageUpload.ts`
  (lazy client, session check, best-effort nulls, safe path segments).

## 3. Scope

### In scope (this slice)

1. `src/platform/backups/cloudBackupCopies.ts` — storage seam + pure helpers.
2. Wire best-effort copy + retention prune into `backupExportForDownload`
   (both `manual` and `daily-close` sources).
3. Preferences server-copies card: list (newest first), download-to-device, restore
   (explicit confirm → existing `importDatabaseBackupCommand`), refresh,
   loading/empty/unavailable states.
4. Daily-close feedback states the server-copy result without changing close semantics.
5. Behavioral tests with a fake storage seam + repository-style source-contract tests;
   new suite wired into the default `npm test` gate.

### Out of scope (recorded, not silently dropped)

- Scheduled/triggerless server-side backups (needs pg_cron/Edge Function — owner/infra
  decision; the deferred `12.09` remainder).
- Migrating condition photos out of the snapshot (separate data decision, T2).
- Compression (`application/gzip`) — the bucket allows it; slicing JSON text is enough now.
- Any change to `showroom_state`, RLS, or migrations.

## 4. Design

### 4.1 Module: `src/platform/backups/cloudBackupCopies.ts`

```ts
export const BACKUP_COPIES_BUCKET = 'backups';
export const BACKUP_COPY_RETENTION = 20;
export const BACKUP_COPY_NAME_PATTERN = /^lena-backup-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z\.json$/;

export type CloudBackupCopy = { name: string; createdAt: string | null; bytes: number | null };

export interface BackupCopyStorage {
  upload(name: string, body: Blob): Promise<void>;   // rejects on failure
  list(): Promise<RawStorageFile[]>;                  // rejects on failure
  download(name: string): Promise<Blob>;              // rejects on failure
  remove(names: string[]): Promise<void>;             // rejects on failure
}
```

- `buildBackupCopyName(exportedAt)` — deterministic, URL-safe, lexicographically
  sortable as time: `lena-backup-<ISO ms with [:.] → '-'`>.json`.
- `resolveBackupCopyStorage()` — returns `null` when Supabase is unconfigured, there is
  no `window`, or no live session; otherwise a thin adapter over `storage.from('backups')`.
  This mirrors the best-effort precedent in `supabaseImageUpload.ts`.
- `uploadBackupCopy(backupJson: string, exportedAt: string, storage?)` →
  `'saved' | 'skipped' | 'failed'`; never throws.
- `listCloudBackupCopies(storage?)` → `CloudBackupCopy[] | null` (null = unavailable);
  filters by `BACKUP_COPY_NAME_PATTERN` (foreign objects are never touched), sorts newest first.
- `selectBackupCopiesToPrune(copies, keep = BACKUP_COPY_RETENTION)` — pure; returns names
  beyond the newest `keep`.
- `pruneBackupCopies(storage?, keep?)` → number removed; never throws.
- `downloadCloudBackupCopy(name, storage?)` → parsed `unknown | null`; JSON parse errors
  surface as null (UI falls back to the standard error alert).
- `storeBackupCopySafely(backup, storage?)` — the single composition used by the export
  service: stringify → upload → prune; returns a status string for UI feedback.

### 4.2 Wiring: `backupExport.service.ts`

After `downloadJson` + `recordBackupExportCommand` (the audit path is unchanged and the
copy never joins the command's rollback boundary), await `storeBackupCopySafely(backup)`
and return `{ backup, filename, cloudCopy }`. Callers decide how much to say.

Failure semantics, deliberately ordered:

1. Export/build failure → existing error path (import-safe, nothing new).
2. Download failure → existing daily-close warning path (unchanged).
3. Cloud copy failure → feedback text note only; `console.warn` + `reportClientError('backup-cloud-copy', …)`
  — observability exists in `src/features/observability/clientObservability.ts`.

### 4.3 UI

- `PreferencesPage.tsx` new admin card «نسخ الخادم الاحتياطية»: refresh-on-mount list,
  each row `createdAt` formatted `ar-OM` + human size; actions «استعادة» (confirm text
  mirrors the file-restore confirm) and «تنزيل» (writes the same JSON via `downloadJson`).
  States: loading, empty («لا توجد نسخ محفوظة على الخادم بعد»), unavailable (غير متصل/
  غير مهيأ). All buttons `min-h-11`, Arabic, RTL, per `frontend-mobile-rtl`.
- `DailyClosingPage.tsx`: success feedback appends «وحُفظت نسخة على الخادم» /
  «لكن تعذّر حفظ نسخة الخادم (النسخة المحلية نزّلت بنجاح)».

### 4.4 Security and privacy

- No new credentials, endpoints, buckets, or policies; RLS from migration 0011 already
  scopes the bucket to active LENA users. Restore stays admin-only via the
  `<RequireAdmin>` preferences route; staff can create copies (same trust level as their
  existing snapshot read/write).
- Copies contain the same data class as the existing device export; no new exposure.
- Name pattern validation ensures prune/remove never touches objects the app did not create.

### 4.5 Reversibility

Removing the `storeBackupCopySafely` call restores previous behavior; server copies are
inert files deletable from the card or the Supabase dashboard. No data conversion either way.

## 5. Test plan — `tests/cloud-backup-copies.test.mjs`

Behavioral (fake `BackupCopyStorage`):

1. name builder: deterministic, matches pattern, lexicographic order == chronological.
2. upload: fake resolves → `'saved'`, called with pattern name and byte-equal payload.
3. upload: fake rejects → `'failed'`, no throw; unconfigured env → `'skipped'`.
4. list: filters foreign names, sorts newest first, maps `metadata.size`.
5. prune: keeps newest N, removes the rest; remove failure → swallowed, returns 0.
6. download: parse round-trip; corrupt JSON → null.
7. composition: after 25 uploads with keep=20, remove called with exactly the 5 oldest.

Source-contract (repository convention):

8. `backupExport.service.ts` awaits the copy after `recordBackupExportCommand` and
   returns `cloudCopy`.
9. `PreferencesPage.tsx` renders the card, lists, and restore goes through
   `importDatabaseBackupCommand` behind `window.confirm`.
10. `DailyClosingPage.tsx` surfaces the cloud-copy result text.
11. Migration 0011 still asserts the provisioned `backups` bucket + policies the code
    depends on (cross-check against silent infra drift).

Gate wiring: `test:cloud-backup-copies` script added and chained into `npm test`.
Mandatory checks: `npm test`, `tsc -b`, `eslint`, `vite build` all green.

## 6. Acceptance criteria (the slice is complete when)

- [x] A manual export and a daily-close export each attempt one server copy.
- [x] Copy failure never fails export/close; the operator sees what happened.
- [x] Admin can list, download, and restore server copies; restore uses the validated
  import with explicit confirm and its existing rollback.
- [x] Retention keeps newest 20; foreign objects are never listed or removed.
- [x] `npm test` (incl. new suite), typecheck, lint, build green.
- [x] Live-device / live-Supabase proof recorded honestly as outstanding (sandbox cannot
  reach production; queued onto `docs/RUNTIME_QA.md` device session).

## 7. Metrics after release

- Server-copy coverage: share of closing days with a copy in bucket (target 100%).
- Monthly restore drill recorded in `docs/RUNTIME_QA.md`.
- Zero "only copy was on the lost/broken device" incidents.

## 8. Files touched

- add `src/platform/backups/cloudBackupCopies.ts`, `src/platform/backups/index.ts`
- edit `src/features/preferences/backupExport.service.ts`
- edit `src/features/preferences/PreferencesPage.tsx`
- edit `src/features/reports/DailyClosingPage.tsx`
- add `tests/cloud-backup-copies.test.mjs`; edit `package.json` (script + chain)
- edit `docs/EXECUTION_CHECKLIST.md` (owner-directed entry + evidence); `FEATURE_GAP_STRATEGY.md`
