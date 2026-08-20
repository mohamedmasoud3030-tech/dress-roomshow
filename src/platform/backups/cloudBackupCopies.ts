import { getSupabaseClient, isSupabaseConfigured } from '../../lib/supabaseClient';

/**
 * Cloud backup copies: point-in-time recovery for the single showroom.
 *
 * The central `showroom_state` row only ever holds the LATEST snapshot. The
 * private `backups` storage bucket (migration 0011, active-user RLS) exists so
 * the showroom can go BACK to a known good point after a wrong import, a bad
 * reset, or a lost device. Everything here is best-effort: a failed copy must
 * never break an export, a daily close, or any other operational journey.
 *
 * The storage seam is injected so the naming/retention policy is testable in
 * Node without a network; the default binding talks to Supabase Storage and
 * follows the precedent set by platform/images/supabaseImageUpload.ts.
 */

export const BACKUP_COPIES_BUCKET = 'backups';
export const BACKUP_COPY_RETENTION = 20;
export const BACKUP_COPY_NAME_PATTERN =
  /^lena-backup-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z\.json$/;

export type CloudBackupCopyStatus = 'saved' | 'skipped' | 'failed';

export type CloudBackupCopy = {
  name: string;
  createdAt: string | null;
  bytes: number | null;
};

export type StorageFileRow = {
  name?: string | null;
  created_at?: string | null;
  metadata?: { size?: number | null } | null;
};

/** Minimal storage seam: the real adapter wraps Supabase; tests inject a fake. */
export interface BackupCopyStorage {
  upload(name: string, body: Blob): Promise<void>;
  list(): Promise<StorageFileRow[]>;
  download(name: string): Promise<Blob>;
  remove(names: string[]): Promise<void>;
}

/**
 * Deterministic, storage-safe, time-ordered copy name. The name is built from
 * the backup's own `exportedAt`, so re-exporting the same backup reproduces the
 * same copy name instead of duplicating objects.
 *
 * '2026-08-20T12:34:56.789Z' -> 'lena-backup-2026-08-20T12-34-56-789Z.json'
 */
export function buildBackupCopyName(exportedAt: string): string {
  const parsed = new Date(exportedAt);
  if (Number.isNaN(parsed.getTime())) {
    throw new TypeError('Backup copy name requires a valid ISO timestamp.');
  }
  const sanitized = parsed.toISOString().replace(/[:.]/g, '-');
  return `lena-backup-${sanitized}.json`;
}

export function isBackupCopyName(name: string): boolean {
  return BACKUP_COPY_NAME_PATTERN.test(name);
}

function toCloudBackupCopy(row: StorageFileRow): CloudBackupCopy | null {
  const name = typeof row?.name === 'string' ? row.name : '';
  if (!isBackupCopyName(name)) return null;
  const bytes = typeof row?.metadata?.size === 'number' && Number.isFinite(row.metadata.size)
    ? row.metadata.size
    : null;
  return {
    name,
    createdAt: typeof row?.created_at === 'string' ? row.created_at : null,
    bytes,
  };
}

/**
 * Newest first, and never anything the app did not create: foreign objects in
 * the bucket are invisible to the UI and untouchable by retention pruning.
 */
export function normalizeBackupCopyList(rows: StorageFileRow[]): CloudBackupCopy[] {
  return rows
    .map(toCloudBackupCopy)
    .filter((copy): copy is CloudBackupCopy => copy !== null)
    .sort((a, b) => b.name.localeCompare(a.name));
}

/** Pure retention: keep the newest `keep` copies, return the names to remove. */
export function selectBackupCopiesToPrune(
  copies: CloudBackupCopy[],
  keep: number = BACKUP_COPY_RETENTION,
): string[] {
  const safeKeep = Math.max(1, Math.floor(keep));
  return copies
    .slice()
    .sort((a, b) => b.name.localeCompare(a.name))
    .slice(safeKeep)
    .map((copy) => copy.name);
}

/**
 * Resolves the real Supabase-backed storage, or null when the app is
 * unconfigured, offline-shell, or unauthenticated. Any configuration error
 * resolves to null: copying is an enhancement, not a gate.
 */
export async function resolveBackupCopyStorage(): Promise<BackupCopyStorage | null> {
  try {
    if (typeof window === 'undefined') return null;
    if (!isSupabaseConfigured()) return null;

    const client = getSupabaseClient();
    const { data: sessionData } = await client.auth.getSession();
    if (!sessionData.session) return null;

    const bucket = client.storage.from(BACKUP_COPIES_BUCKET);
    return {
      async upload(name, body) {
        const { error } = await bucket.upload(name, body, {
          contentType: 'application/json',
          upsert: false,
        });
        if (error) throw new Error(error.message);
      },
      async list() {
        const { data, error } = await bucket.list('', { limit: 1000, sortBy: { column: 'name', order: 'desc' } });
        if (error) throw new Error(error.message);
        return (data ?? []) as StorageFileRow[];
      },
      async download(name) {
        const { data, error } = await bucket.download(name);
        if (error) throw new Error(error.message);
        if (!data) throw new Error('Empty backup copy download.');
        return data;
      },
      async remove(names) {
        const { error } = await bucket.remove(names);
        if (error) throw new Error(error.message);
      },
    };
  } catch {
    return null;
  }
}

async function resolveOrNull(storage?: BackupCopyStorage | null): Promise<BackupCopyStorage | null> {
  return storage ?? resolveBackupCopyStorage();
}

/** Best-effort upload; resolves to a status and never throws. */
export async function uploadBackupCopy(
  input: { json: string; exportedAt: string },
  storage?: BackupCopyStorage | null,
): Promise<CloudBackupCopyStatus> {
  const resolved = await resolveOrNull(storage);
  if (!resolved) return 'skipped';
  try {
    const name = buildBackupCopyName(input.exportedAt);
    const body = new Blob([input.json], { type: 'application/json' });
    await resolved.upload(name, body);
    return 'saved';
  } catch (error) {
    console.warn('Cloud backup copy upload failed', error instanceof Error ? error.message : error);
    return 'failed';
  }
}

/** Lists visible copies newest-first; null means "cannot know right now". */
export async function listCloudBackupCopies(
  storage?: BackupCopyStorage | null,
): Promise<CloudBackupCopy[] | null> {
  const resolved = await resolveOrNull(storage);
  if (!resolved) return null;
  try {
    return normalizeBackupCopyList(await resolved.list());
  } catch (error) {
    console.warn('Cloud backup copy list failed', error instanceof Error ? error.message : error);
    return null;
  }
}

/** Retention pruning: deletes only pattern-matching names beyond the newest keep. */
export async function pruneBackupCopies(
  storage?: BackupCopyStorage | null,
  keep: number = BACKUP_COPY_RETENTION,
): Promise<number> {
  const resolved = await resolveOrNull(storage);
  if (!resolved) return 0;
  try {
    const stale = selectBackupCopiesToPrune(normalizeBackupCopyList(await resolved.list()), keep);
    if (stale.length === 0) return 0;
    await resolved.remove(stale);
    return stale.length;
  } catch (error) {
    console.warn('Cloud backup copy pruning failed', error instanceof Error ? error.message : error);
    return 0;
  }
}

/**
 * Downloads one copy and parses it as JSON. Returns null when storage is
 * unavailable, the name is not an app-created copy, or the payload is not
 * readable JSON (the caller shows the standard error alert).
 */
export async function downloadCloudBackupCopy(
  name: string,
  storage?: BackupCopyStorage | null,
): Promise<unknown | null> {
  if (!isBackupCopyName(name)) return null;
  const resolved = await resolveOrNull(storage);
  if (!resolved) return null;
  try {
    const blob = await resolved.download(name);
    return JSON.parse(await blob.text()) as unknown;
  } catch (error) {
    console.warn('Cloud backup copy download failed', error instanceof Error ? error.message : error);
    return null;
  }
}

/**
 * The single composition the export flow uses: upload this backup, then apply
 * retention. Step order matters — the newest copy must already exist before
 * older ones are pruned, so retention can never erase the only recent copy.
 */
export async function storeBackupCopySafely(
  input: { json: string; exportedAt: string },
  storage?: BackupCopyStorage | null,
): Promise<CloudBackupCopyStatus> {
  const status = await uploadBackupCopy(input, storage);
  if (status !== 'saved') return status;
  await pruneBackupCopies(storage);
  return 'saved';
}
