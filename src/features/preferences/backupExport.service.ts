import { exportDatabaseBackupAsync } from '@engines/persistence';
import { downloadJson } from '@platform/download';
import { recordBackupExportCommand } from '../workflows';

type BackupExportContext = {
  businessDate?: string;
  source: 'manual' | 'daily-close';
};

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

  return { backup, filename };
}
