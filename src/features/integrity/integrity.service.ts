import { readCollection } from '../../services/localDatabase';
import { isActiveDayClosing } from '../../shared/utils/dailyClosingCalculations.js';
import { getTodayISO } from '../../shared/utils/date';
import type { DressStatus } from '../dresses/dress.types';
import { mockReservations } from '../reservations/reservation.mock';
import type { Reservation } from '../reservations/reservation.types';
import type { DayCloseRecord } from '../reports/report.types';

const activeReservationStatuses = new Set<Reservation['status']>(['pending', 'confirmed', 'delivered', 'overdue']);

function getStoredReservations(): Reservation[] {
  return readCollection<Reservation>('reservations', mockReservations);
}

export function assertBusinessDateOpen(businessDate: string): void {
  const isClosed = readCollection<DayCloseRecord>('daily-closings', [])
    .some((closing) => closing.businessDate === businessDate && isActiveDayClosing(closing.status));

  if (isClosed) {
    throw new Error(`تم إقفال يومية ${businessDate}. أعيدي فتح اليومية قبل تسجيل أو تعديل أي حركة مالية تخص هذا التاريخ.`);
  }
}

export function getDressArchiveBlockers(dressCode: string, status: DressStatus): string[] {
  const blockers: string[] = [];

  if (status === 'rented') blockers.push('العنصر مؤجر حالياً ولم يتم استرجاعه بعد.');
  if (status === 'sold') blockers.push('العنصر مسجل كمباع ولا يمكن إيقافه من المخزون.');

  const today = getTodayISO();
  const relatedReservation = getStoredReservations().find(
    (reservation) => reservation.dressCode === dressCode
      && activeReservationStatuses.has(reservation.status)
      && reservation.returnDate >= today,
  );

  if (relatedReservation) {
    blockers.push(`يوجد حجز نشط أو قادم مرتبط بالعنصر: ${relatedReservation.reservationNumber}.`);
  }

  return blockers;
}

export function assertDressCanBeArchived(dressCode: string, status: DressStatus): void {
  const blockers = getDressArchiveBlockers(dressCode, status);
  if (blockers.length > 0) throw new Error(blockers.join(' '));
}

export function assertReservationCanBeCancelled(reservation: Reservation): void {
  if (reservation.status === 'delivered' || reservation.status === 'returned' || reservation.status === 'overdue') {
    throw new Error('لا يمكن إلغاء الحجز بعد التسليم أو بعد تجاوز موعد الإرجاع. استخدمي مسار الاسترجاع والتسوية.');
  }

  if (reservation.paidAmount > 0) {
    throw new Error('لا يمكن إلغاء الحجز قبل تسوية المبالغ المحصلة أو تسجيل الاسترجاع المالي.');
  }
}
