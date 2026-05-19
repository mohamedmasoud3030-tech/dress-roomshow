import { reservationMockRecords } from './reservation.mock';
import type { ReservationRecord, ReservationStatus } from './reservation.types';

export function getReservations(): ReservationRecord[] {
  return reservationMockRecords;
}

export function formatReservationStatusLabel(status: ReservationStatus): string {
  const labels: Record<ReservationStatus, string> = {
    confirmed: 'مؤكد',
    pickup_today: 'تسليم اليوم',
    returned: 'مسترجع',
  };
  return labels[status];
}
