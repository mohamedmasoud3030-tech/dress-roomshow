import { getTodayISO } from '../../shared/utils/date';
import { mockReservations } from './reservation.mock';
import type { AvailabilityCheck, Reservation, ReservationFilters, ReservationSummary } from './reservation.types';

const activeStatuses = new Set(['pending', 'confirmed', 'delivered', 'overdue']);

export function getReservations(): Reservation[] {
  return mockReservations;
}

export function filterReservations(reservations: Reservation[], filters: ReservationFilters): Reservation[] {
  const search = filters.search.trim().toLowerCase();
  const today = getTodayISO();

  return reservations.filter((reservation) => {
    const matchesSearch =
      !search ||
      reservation.reservationNumber.toLowerCase().includes(search) ||
      reservation.customerName.toLowerCase().includes(search) ||
      reservation.customerPhone.toLowerCase().includes(search) ||
      reservation.dressCode.toLowerCase().includes(search) ||
      reservation.dressName.toLowerCase().includes(search);

    const matchesStatus = filters.status === 'all' || reservation.status === filters.status;
    const matchesTiming =
      filters.timing === 'all' ||
      (filters.timing === 'today' && (reservation.pickupDate === today || reservation.returnDate === today)) ||
      (filters.timing === 'upcoming' && reservation.pickupDate > today) ||
      (filters.timing === 'overdue' && reservation.status === 'overdue');

    return matchesSearch && matchesStatus && matchesTiming;
  });
}

export function summarizeReservations(reservations: Reservation[]): ReservationSummary {
  const today = getTodayISO();

  return {
    total: reservations.length,
    active: reservations.filter((reservation) => activeStatuses.has(reservation.status)).length,
    today: reservations.filter((reservation) => reservation.pickupDate === today || reservation.returnDate === today).length,
    overdue: reservations.filter((reservation) => reservation.status === 'overdue').length,
  };
}

export function hasReservationOverlap(check: AvailabilityCheck, reservations: Reservation[]): boolean {
  return reservations.some((reservation) => {
    if (reservation.dressCode !== check.dressCode) return false;
    if (!activeStatuses.has(reservation.status)) return false;

    return reservation.pickupDate <= check.returnDate && check.pickupDate <= reservation.returnDate;
  });
}
