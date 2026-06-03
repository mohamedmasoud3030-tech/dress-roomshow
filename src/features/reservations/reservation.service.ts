import { generateId, generateNumber, readCollection, writeCollection } from '../../services/localDatabase';
import { getTodayISO } from '../../shared/utils/date';
import { calculateReservationRemainingAmount } from '../../shared/utils/financialCalculations.js';
import { getCustomers } from '../customers/customer.service';
import { getDresses } from '../dresses/dress.service';
import { getAppPreferences } from '../preferences/preferences.service';
import { mockReservations } from './reservation.mock';
import type { AvailabilityCheck, Reservation, ReservationFilters, ReservationSummary } from './reservation.types';

const COLLECTION = 'reservations';
const activeStatuses = new Set<Reservation['status']>(['pending', 'confirmed', 'delivered', 'overdue']);
const reservableDressStatuses = new Set(['available', 'reserved', 'rented']);

type CreateReservationInput = {
  customerId: string;
  dressId: string;
  pickupDate: string;
  returnDate: string;
  depositAmount: number;
  notes?: string;
};

type ReservationPaymentType = 'rental' | 'deposit' | 'penalty' | 'refund' | 'adjustment';
type ReservationPaymentDirection = 'income' | 'refund';

type RecordReservationPaymentInput = {
  reservationNumber: string;
  type: ReservationPaymentType;
  direction: ReservationPaymentDirection;
  amount: number;
};

type SettleReservationReturnInput = {
  reservationNumber: string;
  lateFee: number;
  damageFee: number;
  refundAmount: number;
  settledDepositAmount: number;
  retainedDepositAmount: number;
};

function addDays(dateValue: string, days: number): string {
  const date = new Date(`${dateValue}T00:00:00`);
  date.setDate(date.getDate() + days);
  return getTodayISO(date);
}

function calculateRemainingAmount(reservation: Reservation): number {
  return calculateReservationRemainingAmount({
    totalAmount: reservation.totalAmount,
    assessedFeesAmount: reservation.assessedFeesAmount,
    paidAmount: reservation.paidAmount,
    settledDepositAmount: reservation.settledDepositAmount,
    refundedAmount: reservation.refundedAmount,
  });
}

function writeUpdatedReservation(reservations: Reservation[], updatedReservation: Reservation): Reservation {
  const normalizedReservation = {
    ...updatedReservation,
    remainingAmount: calculateRemainingAmount(updatedReservation),
  };
  writeCollection(
    COLLECTION,
    reservations.map((item) => (item.id === normalizedReservation.id ? normalizedReservation : item)),
  );
  return normalizedReservation;
}

export function getReservationBufferDays(): number {
  return getAppPreferences().reservationBufferDays;
}

function hydrateOverdueStatus(reservation: Reservation): Reservation {
  const shouldMarkOverdue =
    reservation.returnDate < getTodayISO() &&
    ['pending', 'confirmed', 'delivered'].includes(reservation.status);

  return shouldMarkOverdue ? { ...reservation, status: 'overdue' } : reservation;
}

export function getReservations(): Reservation[] {
  return readCollection(COLLECTION, mockReservations).map(hydrateOverdueStatus);
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
  const bufferDays = getReservationBufferDays();

  return reservations.some((reservation) => {
    if (reservation.dressCode !== check.dressCode) return false;
    if (!activeStatuses.has(reservation.status)) return false;

    const blockedStart = addDays(reservation.pickupDate, -bufferDays);
    const blockedEnd = addDays(reservation.returnDate, bufferDays);
    return blockedStart <= check.returnDate && check.pickupDate <= blockedEnd;
  });
}

export function createReservation(input: CreateReservationInput): Reservation {
  const today = getTodayISO();
  const customer = getCustomers().find((item) => item.id === input.customerId);
  const dress = getDresses().find((item) => item.id === input.dressId);

  if (!customer) throw new Error('العميلة المحددة غير موجودة.');
  if (customer.status === 'blocked') throw new Error('لا يمكن إنشاء حجز لعميلة محظورة قبل تسوية حالتها.');
  if (!dress) throw new Error('الفستان المحدد غير موجود.');
  if (!dress.isForRent || !reservableDressStatuses.has(dress.status)) {
    throw new Error('الفستان غير مؤهل للإيجار حالياً.');
  }
  if (!input.pickupDate || !input.returnDate) throw new Error('حددي تاريخ الاستلام والإرجاع.');
  if (input.pickupDate < today) throw new Error('تاريخ الاستلام لا يمكن أن يكون في الماضي.');
  if (input.returnDate <= input.pickupDate) throw new Error('تاريخ الإرجاع يجب أن يكون بعد تاريخ الاستلام.');
  if (!Number.isFinite(input.depositAmount) || input.depositAmount < 0) throw new Error('قيمة العربون غير صالحة.');

  const reservations = getReservations();
  if (
    hasReservationOverlap(
      { dressCode: dress.code, pickupDate: input.pickupDate, returnDate: input.returnDate },
      reservations,
    )
  ) {
    throw new Error('الفستان غير متاح خلال هذه الفترة أو أيام التجهيز قبلها أو بعدها.');
  }

  const totalAmount = dress.rentalPrice + input.depositAmount;
  const reservation: Reservation = {
    id: generateId(),
    reservationNumber: generateNumber('RSV'),
    customerName: customer.name,
    customerPhone: customer.phone,
    dressCode: dress.code,
    dressName: dress.name,
    pickupDate: input.pickupDate,
    returnDate: input.returnDate,
    status: 'confirmed',
    rentalPrice: dress.rentalPrice,
    depositAmount: input.depositAmount,
    totalAmount,
    paidAmount: 0,
    remainingAmount: totalAmount,
    assessedFeesAmount: 0,
    refundedAmount: 0,
    settledDepositAmount: 0,
    retainedDepositAmount: 0,
    notes: input.notes?.trim() || undefined,
  };

  writeCollection(COLLECTION, [reservation, ...reservations]);
  return reservation;
}

export function recordReservationPayment(input: RecordReservationPaymentInput): Reservation {
  const reservations = getReservations();
  const reservation = reservations.find((item) => item.reservationNumber === input.reservationNumber);

  if (!reservation) throw new Error('الحجز المحدد غير موجود.');
  if (reservation.status === 'cancelled') throw new Error('لا يمكن تسجيل حركة مالية على حجز ملغي.');
  if (!Number.isFinite(input.amount) || input.amount <= 0) throw new Error('قيمة الدفعة يجب أن تكون أكبر من صفر.');
  if (input.type === 'refund' && input.direction !== 'refund') throw new Error('حركة الاسترجاع غير صالحة.');
  if (input.type !== 'refund' && input.direction === 'refund') throw new Error('اختاري نوع حركة مالية مناسب للاسترجاع.');

  const netCollectedAmount = reservation.paidAmount - (reservation.refundedAmount ?? 0);
  if (input.direction === 'refund' && input.amount > netCollectedAmount) {
    throw new Error('قيمة الاسترجاع تتجاوز المبلغ المحصل فعلياً على الحجز.');
  }

  const isAdditionalCharge = input.type === 'penalty' || input.type === 'adjustment';
  if (input.direction === 'income' && !isAdditionalCharge && input.amount > reservation.remainingAmount) {
    throw new Error('قيمة الدفعة تتجاوز الرصيد المتبقي على الحجز.');
  }

  const updatedReservation: Reservation = {
    ...reservation,
    paidAmount: input.direction === 'income' ? reservation.paidAmount + input.amount : reservation.paidAmount,
    refundedAmount: (reservation.refundedAmount ?? 0) + (input.direction === 'refund' ? input.amount : 0),
    assessedFeesAmount: (reservation.assessedFeesAmount ?? 0) + (isAdditionalCharge ? input.amount : 0),
  };

  return writeUpdatedReservation(reservations, updatedReservation);
}

export function settleReservationReturn(input: SettleReservationReturnInput): Reservation {
  const reservations = getReservations();
  const reservation = reservations.find((item) => item.reservationNumber === input.reservationNumber);

  if (!reservation) throw new Error('الحجز المحدد غير موجود.');
  if (!['delivered', 'overdue'].includes(reservation.status)) throw new Error('الحجز غير مؤهل لتسوية الاسترجاع حالياً.');
  if ((reservation.settledDepositAmount ?? 0) > 0) throw new Error('تمت تسوية عربون هذا الحجز بالفعل.');
  if (![input.lateFee, input.damageFee, input.refundAmount, input.settledDepositAmount, input.retainedDepositAmount].every((amount) => Number.isFinite(amount) && amount >= 0)) {
    throw new Error('بيانات التسوية المالية غير صالحة.');
  }
  if (input.refundAmount + input.retainedDepositAmount > input.settledDepositAmount) {
    throw new Error('إجمالي رد العربون والعربون المحتجز يتجاوز قيمة العربون المسوّاة.');
  }

  const updatedReservation: Reservation = {
    ...reservation,
    assessedFeesAmount: (reservation.assessedFeesAmount ?? 0) + input.lateFee + input.damageFee,
    refundedAmount: (reservation.refundedAmount ?? 0) + input.refundAmount,
    settledDepositAmount: (reservation.settledDepositAmount ?? 0) + input.settledDepositAmount,
    retainedDepositAmount: (reservation.retainedDepositAmount ?? 0) + input.retainedDepositAmount,
  };

  return writeUpdatedReservation(reservations, updatedReservation);
}

export function cancelReservation(id: string): void {
  const reservations = getReservations();
  const reservation = reservations.find((item) => item.id === id);
  if (!reservation) throw new Error('الحجز غير موجود.');
  if (reservation.status === 'returned') throw new Error('لا يمكن إلغاء حجز تم إرجاعه.');
  if (reservation.status === 'cancelled') return;

  writeCollection(
    COLLECTION,
    reservations.map((item) => (item.id === id ? { ...item, status: 'cancelled' as const } : item)),
  );
}
