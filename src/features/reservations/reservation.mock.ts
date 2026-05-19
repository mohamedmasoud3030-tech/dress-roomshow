import type { ReservationRecord } from './reservation.types';

export const reservationMockRecords: ReservationRecord[] = [
  { id: 'res-1', reservationNumber: 'RES-2026-052', customerName: 'ريم خالد', dressCode: 'DR-002', eventDate: '2026-05-24', status: 'confirmed' },
  { id: 'res-2', reservationNumber: 'RES-2026-053', customerName: 'سارة أحمد', dressCode: 'DR-001', eventDate: '2026-05-20', status: 'pickup_today' },
  { id: 'res-3', reservationNumber: 'RES-2026-046', customerName: 'ليان مازن', dressCode: 'DR-003', eventDate: '2026-05-14', status: 'returned' },
];
