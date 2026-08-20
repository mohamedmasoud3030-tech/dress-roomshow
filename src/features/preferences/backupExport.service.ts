import { exportDatabaseBackupAsync } from '@engines/persistence';
import { downloadJson } from '@platform/download';
import { storeBackupCopySafely, type CloudBackupCopyStatus } from '@platform/backups';
import { reportClientError } from '../observability/clientObservability';
import { recordBackupExportCommand } from '../workflows';

type BackupExportContext = {
  businessDate?: string;
  source: 'manual' | 'daily-close';
};

/**
 * Arabic sentence fragment describing what happened to the server copy.
 * 'skipped' is intentionally silent: unconfigured/offline environments behave
 * exactly as before server copies existed.
 */
export function describeCloudCopyStatus(status: CloudBackupCopyStatus): string {
  if (status === 'saved') return ' وحُفظت نسخة على الخادم.';
  if (status === 'failed') return ' لكن تعذّر حفظ نسخة الخادم (النسخة المحلية نزّلت بنجاح).';
  return '';
}

export async function exportBackupForDownload({ businessDate, source }: BackupExportContext) {
  // The asynchronous export is essential: the synchronous format deliberately
  // has no IndexedDB blobs, while condition and catalogue photos are business
  // records that must survive the same backup as the daily close.
  const backup = await exportDatabaseBackupAsync();
  const date = businessDate ?? backup.exportedAt.slice(0, 10);
  const filename = `lena-backup-${date}${source === 'daily-close' ? '-after-close' : ''}.json`;

  downloadJson(filename, backup);
  recordBackupExportCommand(
    source === 'daily-close' ? businessDate : undefined,
    `backup-export:${backup.exportedAt}`,
  );

  // Best-effort point-in-time copy on the server. It is deliberately outside
  // the audited command above: a storage hiccup must never roll back a
  // completed, correct export or the daily close that triggered it.
  const cloudCopy = await storeBackupCopySafely({
    json: JSON.stringify(backup),
    exportedAt: backup.exportedAt,
  });
  if (cloudCopy === 'failed') {
    void reportClientError('backup-cloud-copy', new Error(`cloud backup copy failed for ${filename}`));
  }

  return { backup, filename, cloudCopy };
}
