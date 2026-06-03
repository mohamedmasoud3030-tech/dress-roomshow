import type { CustomerBalanceRow, DressPerformanceRow } from './report.types';

type ReportMockDress = Pick<DressPerformanceRow, 'id' | 'code' | 'name' | 'timesRented' | 'status'>;

export const reportMockDresses: ReportMockDress[] = [
  { id: 'dress-1', code: 'DR-025', name: 'فستان مخملي أزرق', timesRented: 14, status: 'reserved' },
  { id: 'dress-2', code: 'DR-011', name: 'فستان دانتيل عاجي', timesRented: 11, status: 'available' },
  { id: 'dress-3', code: 'DR-008', name: 'فستان وردي مطرز', timesRented: 10, status: 'available' },
  { id: 'dress-4', code: 'DR-004', name: 'فستان أحمر ساتان', timesRented: 9, status: 'maintenance' },
  { id: 'dress-5', code: 'DR-019', name: 'فستان سهرة فضي', timesRented: 8, status: 'reserved' },
  { id: 'dress-6', code: 'DR-031', name: 'فستان شيفون زمردي', timesRented: 6, status: 'available' },
];

export const reportMockReservations = [
  { id: 'res-1', status: 'pending', pickupDate: '2026-05-19', returnDate: '2026-05-21' },
  { id: 'res-2', status: 'confirmed', pickupDate: '2026-05-19', returnDate: '2026-05-22' },
  { id: 'res-3', status: 'delivered', pickupDate: '2026-05-18', returnDate: '2026-05-19' },
  { id: 'res-4', status: 'overdue', pickupDate: '2026-05-15', returnDate: '2026-05-19' },
  { id: 'res-5', status: 'returned', pickupDate: '2026-05-16', returnDate: '2026-05-18' },
];

export const reportMockCustomers: CustomerBalanceRow[] = [
  { id: 'cus-1', name: 'ريم خالد', phone: '90123456', remainingBalance: 70 },
  { id: 'cus-2', name: 'نور علي', phone: '92345678', remainingBalance: 45 },
  { id: 'cus-3', name: 'سارة أحمد', phone: '94567890', remainingBalance: 110 },
  { id: 'cus-4', name: 'ليان مازن', phone: '96789012', remainingBalance: 0 },
];
