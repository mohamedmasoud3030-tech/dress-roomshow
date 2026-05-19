import type { CustomerRecord } from './customer.types';

export const customerMockRecords: CustomerRecord[] = [
  { id: 'cu-1', fullName: 'ريم خالد', phone: '91234567', city: 'مسقط', activeReservations: 1 },
  { id: 'cu-2', fullName: 'ليان مازن', phone: '92345678', city: 'السيب', activeReservations: 0 },
  { id: 'cu-3', fullName: 'سارة أحمد', phone: '93456789', city: 'بوشر', activeReservations: 2 },
];
