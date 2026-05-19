import { dressMockRecords } from './dress.mock';
import type { DressRecord, DressStatus } from './dress.types';

export function getDresses(): DressRecord[] {
  return dressMockRecords;
}

export function formatDressStatusLabel(status: DressStatus): string {
  const labels: Record<DressStatus, string> = {
    available: 'متاح',
    reserved: 'محجوز',
    rented: 'مؤجَّر',
    maintenance: 'صيانة',
  };

  return labels[status];
}
