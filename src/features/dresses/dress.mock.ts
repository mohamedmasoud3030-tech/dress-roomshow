import type { DressRecord } from './dress.types';

export const dressMockRecords: DressRecord[] = [
  { id: 'dr-1', code: 'DR-001', name: 'فستان سهرة كحلي', color: 'كحلي', size: 'M', rentalPrice: 180, status: 'available' },
  { id: 'dr-2', code: 'DR-002', name: 'فستان دانتيل عاجي', color: 'عاجي', size: 'S', rentalPrice: 220, status: 'reserved' },
  { id: 'dr-3', code: 'DR-003', name: 'فستان ساتان أحمر', color: 'أحمر', size: 'L', rentalPrice: 200, status: 'rented' },
];
