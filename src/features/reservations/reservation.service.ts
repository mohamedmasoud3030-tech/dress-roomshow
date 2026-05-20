import { loadLocalReservations } from '../../services/localDatabase';
import { getTodayISO } from '../../shared/utils/date';
import { mockReservations } from './reservation.mock';
import type { AvailabilityCheck, Reservation, ReservationFilters, ReservationSummary } from './reservation.types';

const activeStatuses = new Set(['pending', 'confirmed', 'delivered', 'overdue']);
const closedStatuses = new Set(['returned', 'cancelled']);

export function getReservations(): Reservation[] {
  return mockReservations;
}

export function filterReservations(reservations: Reservation[], filters: ReservationFilters): Reservation[] {
  const search = filters.search.trim().toLowerCase();
  const today = getTodayISO();

  return reservations.filter((reservation) => {
    const reservationStatus = getEffectiveReservationStatus(reservation, today);
    const matchesSearch =
      !search ||
      reservation.reservationNumber.toLowerCase().includes(search) ||
      reservation.customerName.toLowerCase().includes(search) ||
      reservation.customerPhone.toLowerCase().includes(search) ||
      reservation.dressCode.toLowerCase().includes(search) ||
      reservation.dressName.toLowerCase().includes(search);

    const matchesStatus = filters.status === 'all' || reservationStatus === filters.status;
    const matchesTiming =
      filters.timing === 'all' ||
      (filters.timing === 'today' && (reservation.pickupDate === today || reservation.returnDate === today)) ||
      (filters.timing === 'upcoming' && reservation.pickupDate > today) ||
      (filters.timing === 'overdue' && reservationStatus === 'overdue');

    return matchesSearch && matchesStatus && matchesTiming;
  });
}

export function summarizeReservations(reservations: Reservation[]): ReservationSummary {
  const today = getTodayISO();

  return {
    total: reservations.length,
    active: reservations.filter((reservation) => activeStatuses.has(getEffectiveReservationStatus(reservation, today))).length,
    today: reservations.filter((reservation) => reservation.pickupDate === today || reservation.returnDate === today).length,
    overdue: reservations.filter((reservation) => getEffectiveReservationStatus(reservation, today) === 'overdue').length,
  };
}

export function hasReservationOverlap(check: AvailabilityCheck, reservations: Reservation[]): boolean {
  const today = getTodayISO();

  return reservations.some((reservation) => {
    if (reservation.dressCode !== check.dressCode) {
      return false;
    }

    if (!activeStatuses.has(getEffectiveReservationStatus(reservation, today))) {
      return false;
    }

    return reservation.pickupDate <= check.returnDate && check.pickupDate <= reservation.returnDate;
  });
}

function getEffectiveReservationStatus(reservation: Reservation, today: string): Reservation['status'] {
  if (closedStatuses.has(reservation.status)) {
    return reservation.status;
  }

  if (reservation.returnDate < today) {
    return 'overdue';
  }

  return reservation.status;
}

export async function getReservationsFromLocalDb(): Promise<Reservation[] | null> {
  try {
    const rows = await loadLocalReservations();
    if (!rows) {
      return null;
    }

    return rows.map((row) => ({
      ...row,
      status: row.status as Reservation['status'],
    }));
  } catch {
    return null;
  }
}
