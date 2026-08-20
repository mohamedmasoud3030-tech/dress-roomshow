import type { RealtimeChannel } from '@supabase/supabase-js';
import { getSupabaseClient } from '../../lib/supabaseClient';
import {
  isSnapshotWithinServerLimit,
  measureSnapshotBytes,
  recordSnapshotSize,
  SNAPSHOT_TOO_LARGE_MESSAGE,
} from './snapshotSizeMetrics';
import {
  CURRENT_BACKUP_SCHEMA_VERSION,
  CURRENT_STORAGE_SCHEMA_VERSION,
  DATABASE_APPLICATION_ID,
  type LocalDatabaseBackup,
} from '@engines/persistence';

type ShowroomStateRow = {
  snapshot: unknown;
  revision: number;
  updated_at: string;
};

export type RemoteShowroomState = {
  snapshot: LocalDatabaseBackup;
  revision: number;
  updatedAt: string;
};

export class ShowroomCloudError extends Error {
  readonly code: string;

  constructor(message: string, code = 'LENA_CLOUD_ERROR', cause?: unknown) {
    super(message, { cause });
    this.name = 'ShowroomCloudError';
    this.code = code;
  }
}

/**
 * Bounded wait for cloud calls (audit 05/D1): a wedged shop Wi-Fi must surface
 * as an actionable Arabic error with the gate's retry affordance — never an
 * infinite «جارٍ التحميل…» spinner. Budget is one shared constant so hydrate
 * and commit cannot drift apart; the landing catalogue keeps its own smaller
 * read-only budget.
 */
export const CLOUD_CALL_TIMEOUT_MS = 15_000;
export const CLOUD_HYDRATE_TIMEOUT_MESSAGE =
  'استغرق تحميل بيانات المعرض وقتًا أطول من المعتاد. تحققي من الشبكة ثم أعيدي المحاولة.';
// Retry wording on commit is deliberately honest: the snapshot RPC carries an
// idempotency key, so re-sending the same operation can never double-apply it.
export const CLOUD_COMMIT_TIMEOUT_MESSAGE =
  'استغرق حفظ العملية وقتًا أطول من المعتاد. أعيدي المحاولة بأمان — لن يتكرر تسجيل العملية نفسها.';

/** Exported for the timeout regression suite; keeps the abort test honest. */
export function isAbortLike(reason: unknown): boolean {
  return reason instanceof Error && (reason.name === 'AbortError' || /aborted/i.test(reason.message));
}

/** Manual AbortController, no static timeout helper — older staff WebKit support. */
export function createCloudCallTimeout(ms: number = CLOUD_CALL_TIMEOUT_MS): {
  signal: AbortSignal;
  done: () => void;
} {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, done: () => clearTimeout(timer) };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeSnapshot(value: unknown): LocalDatabaseBackup {
  if (!isRecord(value) || value.applicationId !== DATABASE_APPLICATION_ID || !isRecord(value.collections)) {
    throw new ShowroomCloudError('تعذر التحقق من بيانات المعرض. تم إيقاف التشغيل لحماية السجلات.', 'LENA_INVALID_REMOTE_STATE');
  }

  const collections = Object.fromEntries(
    Object.entries(value.collections).map(([name, items]) => {
      if (!Array.isArray(items)) {
        throw new ShowroomCloudError(`تعذر قراءة قسم ${name} من بيانات المعرض.`, 'LENA_INVALID_REMOTE_STATE');
      }
      return [name, items];
    }),
  );
  const now = new Date().toISOString();
  return {
    applicationId: DATABASE_APPLICATION_ID,
    schemaVersion: CURRENT_STORAGE_SCHEMA_VERSION,
    backupVersion: CURRENT_BACKUP_SCHEMA_VERSION,
    exportedAt: typeof value.exportedAt === 'string' ? value.exportedAt : now,
    metadata: {
      applicationId: DATABASE_APPLICATION_ID,
      schemaVersion: CURRENT_STORAGE_SCHEMA_VERSION,
      updatedAt: now,
    },
    collections,
    imageBlobs: [],
    migrationMarkers: isRecord(value.migrationMarkers) ? value.migrationMarkers : {},
  };
}

export function prepareSnapshotForCloud(snapshot: LocalDatabaseBackup): LocalDatabaseBackup {
  const clone = structuredClone(snapshot);
  clone.schemaVersion = CURRENT_STORAGE_SCHEMA_VERSION;
  clone.backupVersion = CURRENT_BACKUP_SCHEMA_VERSION;
  clone.imageBlobs = [];
  clone.exportedAt = new Date().toISOString();
  clone.metadata = {
    applicationId: DATABASE_APPLICATION_ID,
    schemaVersion: CURRENT_STORAGE_SCHEMA_VERSION,
    updatedAt: clone.exportedAt,
  };
  return clone;
}

export async function fetchShowroomState(): Promise<RemoteShowroomState> {
  const timeout = createCloudCallTimeout();
  let data: unknown;
  let error: { code?: string } | null = null;
  try {
    ({ data, error } = await getSupabaseClient()
      .from('showroom_state')
      .select('snapshot, revision, updated_at')
      .eq('id', 'main')
      .abortSignal(timeout.signal)
      .single());
  } catch (reason) {
    if (isAbortLike(reason) || timeout.signal.aborted) {
      throw new ShowroomCloudError(CLOUD_HYDRATE_TIMEOUT_MESSAGE, 'LENA_CLOUD_TIMEOUT', reason);
    }
    throw reason;
  } finally {
    timeout.done();
  }
  if (error) throw new ShowroomCloudError('تعذر تحميل بيانات المعرض. تحققي من الإنترنت وحاولي مجددًا.', error.code, error);
  const row = data as ShowroomStateRow;
  // Every hydration doubles as a fresh tank gauge for the admin indicator.
  recordSnapshotSize(measureSnapshotBytes(row.snapshot), 'hydration');
  return { snapshot: normalizeSnapshot(row.snapshot), revision: Number(row.revision), updatedAt: row.updated_at };
}

export async function commitShowroomState(input: {
  expectedRevision: number;
  snapshot: LocalDatabaseBackup;
  idempotencyKey: string;
  commandName: string;
}): Promise<number> {
  const prepared = prepareSnapshotForCloud(input.snapshot);
  // Fail before the doomed round-trip with a message the operator can act on.
  // The server enforces the same cap (migration 0016); this guard turns a raw
  // RPC rejection into a clear, safe, nothing-was-written outcome.
  const snapshotBytes = measureSnapshotBytes(prepared);
  if (!isSnapshotWithinServerLimit(snapshotBytes)) {
    throw new ShowroomCloudError(SNAPSHOT_TOO_LARGE_MESSAGE, 'LENA_SNAPSHOT_TOO_LARGE');
  }

  const timeout = createCloudCallTimeout();
  let data: unknown;
  let error: { code?: string; message: string } | null = null;
  try {
    ({ data, error } = await getSupabaseClient().rpc('apply_showroom_snapshot', {
      p_expected_revision: input.expectedRevision,
      p_snapshot: prepared,
      p_idempotency_key: input.idempotencyKey,
      p_command_name: input.commandName,
    }).abortSignal(timeout.signal));
  } catch (reason) {
    if (isAbortLike(reason) || timeout.signal.aborted) {
      throw new ShowroomCloudError(CLOUD_COMMIT_TIMEOUT_MESSAGE, 'LENA_CLOUD_TIMEOUT', reason);
    }
    throw reason;
  } finally {
    timeout.done();
  }
  if (error) {
    if (error.message.includes('LENA_SNAPSHOT_TOO_LARGE')) {
      throw new ShowroomCloudError(SNAPSHOT_TOO_LARGE_MESSAGE, 'LENA_SNAPSHOT_TOO_LARGE', error);
    }
    const code = error.message.includes('LENA_REVISION_CONFLICT') ? 'LENA_REVISION_CONFLICT' : error.code;
    throw new ShowroomCloudError(
      code === 'LENA_REVISION_CONFLICT'
        ? 'تغيّرت البيانات من جهاز آخر. أُعيد تحميل أحدث نسخة لحمايتها من الكتابة فوقها.'
        : 'تعذر حفظ العملية. لم يُسجل أي تغيير.',
      code,
      error,
    );
  }
  const result = Array.isArray(data) ? data[0] : data;
  if (!isRecord(result) || typeof result.revision !== 'number') {
    throw new ShowroomCloudError('لم يكتمل تأكيد حفظ العملية. أعيدي المحاولة.', 'LENA_INVALID_COMMIT_RESPONSE');
  }
  // The accepted size is the freshest possible gauge: record it post-commit.
  recordSnapshotSize(snapshotBytes, 'commit');
  return result.revision;
}

export function subscribeToShowroomChanges(onChange: () => void): RealtimeChannel {
  return getSupabaseClient()
    .channel('showroom-state-main')
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'showroom_state', filter: 'id=eq.main' }, onChange)
    .subscribe();
}

export async function unsubscribeFromShowroomChanges(channel: RealtimeChannel): Promise<void> {
  await getSupabaseClient().removeChannel(channel);
}
