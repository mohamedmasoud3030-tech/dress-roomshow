import {
  db_getReservations,
  db_saveReservation,
  db_deleteReservation,
  db_updateDressStatus,
  generateId,
  generateNumber,
} from '../../services/localDatabase';
import { getTodayISO } from '../../shared/utils/date';
import type {
  AvailabilityCheck,
  Reservation,
  ReservationFilters,
  ReservationSummary,
} from './reservation.types';

const activeStatuses = new Set(['pending', 'confirmed', 'delivered', 'overdue']);

export function getReservations(): Reservation[] {
  return db_getReservations();
}

export function filterReservations(
  reservations: Reservation[],
  filters: ReservationFilters,
): Reservation[] {
  const search = filters.search.trim().toLowerCase();
  const today = getTodayISO();
  return reservations.filter((r) => {
    const matchSearch =
      !search ||
      r.reservationNumber.toLowerCase().includes(search) ||
      r.customerName.toLowerCase().includes(search) ||
      r.customerPhone.toLowerCase().includes(search) ||
      r.dressCode.toLowerCase().includes(search) ||
      r.dressName.toLowerCase().includes(search);
    const matchStatus = filters.status === 'all' || r.status === filters.status;
    const matchTiming =
      filters.timing === 'all' ||
      (filters.timing === 'today' && (r.pickupDate === today || r.returnDate === today)) ||
      (filters.timing === 'upcoming' && r.pickupDate > today) ||
      (filters.timing === 'overdue' && r.status === 'overdue');
    return matchSearch && matchStatus && matchTiming;
  });
}

export function summarizeReservations(reservations: Reservation[]): ReservationSummary {
  const today = getTodayISO();
  return {
    total: reservations.length,
    active: reservations.filter((r) => activeStatuses.has(r.status)).length,
    today: reservations.filter((r) => r.pickupDate === today || r.returnDate === today).length,
    overdue: reservations.filter((r) => r.status === 'overdue').length,
  };
}

export function hasOverlap(check: AvailabilityCheck, reservations: Reservation[]): boolean {
  return reservations.some((r) => {
    if (r.dressId !== check.dressId) return false;
    if (!activeStatuses.has(r.status)) return false;
    if (check.excludeReservationId && r.id === check.excludeReservationId) return false;
    return r.pickupDate <= check.returnDate && check.pickupDate <= r.returnDate;
  });
}

type CreateReservationInput = {
  customerId: string;
  customerName: string;
  customerPhone: string;
  dressId: string;
  dressCode: string;
  dressName: string;
  pickupDate: string;
  returnDate: string;
  rentalPrice: number;
  depositAmount: number;
  notes?: string;
};

export function createReservation(input: CreateReservationInput): Reservation {
  const existing = db_getReservations();
  const overlap = hasOverlap(
    { dressId: input.dressId, pickupDate: input.pickupDate, returnDate: input.returnDate },
    existing,
  );
  if (overlap) {
    throw new Error('الفستان محجوز خلال هذه الفترة. اختر تاريخاً آخر أو فستاناً مختلفاً.');
  }
  const totalAmount = input.rentalPrice + input.depositAmount;
  const reservation: Reservation = {
    id: generateId(),
    reservationNumber: generateNumber('RSV'),
    customerId: input.customerId,
    customerName: input.customerName,
    customerPhone: input.customerPhone,
    dressId: input.dressId,
    dressCode: input.dressCode,
    dressName: input.dressName,
    pickupDate: input.pickupDate,
    returnDate: input.returnDate,
    status: 'confirmed',
    rentalPrice: input.rentalPrice,
    depositAmount: input.depositAmount,
    totalAmount,
    paidAmount: 0,
    remainingAmount: totalAmount,
    notes: input.notes,
    createdAt: new Date().toISOString(),
  };
  db_saveReservation(reservation);
  db_updateDressStatus(input.dressId, 'reserved');
  return reservation;
}

export function updateReservation(id: string, updates: Partial<Reservation>): Reservation {
  const reservations = db_getReservations();
  const reservation = reservations.find((r) => r.id === id);
  if (!reservation) throw new Error('الحجز غير موجود');
  const updated = { ...reservation, ...updates };
  db_saveReservation(updated);
  return updated;
}

export function cancelReservation(id: string): void {
  const reservations = db_getReservations();
  const reservation = reservations.find((r) => r.id === id);
  if (!reservation) return;
  db_saveReservation({ ...reservation, status: 'cancelled' });
  db_updateDressStatus(reservation.dressId, 'available');
}
