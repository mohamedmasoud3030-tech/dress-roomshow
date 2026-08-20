import { getBrowserLocalStorage, type StoragePort } from '@platform/storage';
import { reportClientError } from '../observability/clientObservability';

/**
 * Central snapshot size guard.
 *
 * Every operational command commits the full showroom snapshot to the server,
 * and the server hard-rejects payloads above 20 MiB
 * (`supabase/migrations/0016_centralized_showroom_state.sql`:
 * `octet_length(p_snapshot::text) > 20971520 -> LENA_SNAPSHOT_TOO_LARGE`).
 * Without a gauge the first symptom of a full tank is a write outage in front
 * of a customer. This module measures locally, persists the last reading for
 * the admin indicator, and provides the thresholds used to warn early.
 *
 * Local measurement intentionally approximates the server's count
 * (JSON.stringify UTF-8 bytes vs Postgres `jsonb::text` octet_length);
 * the thresholds below keep a wide safety margin against that difference.
 */

export const SHOWROOM_SNAPSHOT_MAX_BYTES = 20 * 1024 * 1024;
export const SNAPSHOT_SIZE_WARNING_RATIO = 0.5;
export const SNAPSHOT_SIZE_CRITICAL_RATIO = 0.8;

export const SNAPSHOT_TOO_LARGE_MESSAGE =
  'بيانات المعرض تجاوزت الحد الأقصى المسموح على الخادم. لم يُحفظ أي تغيير. راجعي الإدارة أو الدعم لترشيق البيانات قبل المتابعة.';

export type SnapshotSizeSource = 'hydration' | 'commit';

export type SnapshotSizeReading = {
  bytes: number;
  measuredAt: string;
  source: SnapshotSizeSource;
};

export type SnapshotSizeLevel = 'unknown' | 'normal' | 'warning' | 'critical';

const METRICS_KEY = 'dress-roomshow:snapshot-size-metrics';
const TELEMETRY_KEY = 'dress-roomshow:snapshot-size-telemetry-day';

export function measureSnapshotBytes(snapshot: unknown): number {
  return new TextEncoder().encode(JSON.stringify(snapshot)).length;
}

export function classifySnapshotSize(bytes: number | null): SnapshotSizeLevel {
  if (bytes === null || !Number.isFinite(bytes) || bytes < 0) return 'unknown';
  if (bytes >= SHOWROOM_SNAPSHOT_MAX_BYTES * SNAPSHOT_SIZE_CRITICAL_RATIO) return 'critical';
  if (bytes >= SHOWROOM_SNAPSHOT_MAX_BYTES * SNAPSHOT_SIZE_WARNING_RATIO) return 'warning';
  return 'normal';
}

export function isSnapshotWithinServerLimit(bytes: number): boolean {
  return bytes < SHOWROOM_SNAPSHOT_MAX_BYTES;
}

export function readSnapshotSizeReading(
  storage: StoragePort | null = getBrowserLocalStorage(),
): SnapshotSizeReading | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(METRICS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SnapshotSizeReading>;
    if (
      typeof parsed.bytes !== 'number'
      || !Number.isFinite(parsed.bytes)
      || typeof parsed.measuredAt !== 'string'
      || (parsed.source !== 'hydration' && parsed.source !== 'commit')
    ) {
      return null;
    }
    return { bytes: parsed.bytes, measuredAt: parsed.measuredAt, source: parsed.source };
  } catch {
    return null;
  }
}

/**
 * One telemetry row per day while the reading sits in the critical band; the
 * dashboard has no other way to know a showroom is approaching the outage.
 */
function reportCriticalOncePerDay(bytes: number, storage: StoragePort): void {
  try {
    const today = new Date().toISOString().slice(0, 10);
    if (storage.getItem(TELEMETRY_KEY) === today) return;
    storage.setItem(TELEMETRY_KEY, today);
    void reportClientError('snapshot-size-critical', new Error(`snapshot bytes: ${bytes}`));
  } catch {
    // Telemetry must never become a second failure.
  }
}

export function recordSnapshotSize(
  bytes: number,
  source: SnapshotSizeSource,
  storage: StoragePort | null = getBrowserLocalStorage(),
): SnapshotSizeReading {
  const reading: SnapshotSizeReading = { bytes, measuredAt: new Date().toISOString(), source };
  if (storage) {
    try {
      storage.setItem(METRICS_KEY, JSON.stringify(reading));
      if (classifySnapshotSize(bytes) === 'critical') reportCriticalOncePerDay(bytes, storage);
    } catch {
      // A full localStorage must not break the operational command that triggered this measurement.
    }
  }
  return reading;
}
