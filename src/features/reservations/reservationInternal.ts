/**
 * Internals shared by the reservation modules.
 *
 * `reservation.service.ts` had grown past a thousand lines because every stage
 * of a contract's life lived in one file: creating it, moving its lines, and
 * moving its money. What those stages all need lives here — the rental balance
 * actually outstanding, the single place a reservation is written back
 * through, the date and money guards, and the item states a contract may
 * touch. Extracted, not copied: the balance has one definition.
 *
 * Nothing outside `src/features/reservations/` should import this module.
 */

import { isValidTime } from '../../shared/utils/date';
import { writeCollection } from '../../services/localDatabase';
import {
  calculateReservationRemainingAmount,
  calculateRentalOutstanding,
} from '../../shared/utils/financialCalculations.js';
import { calculateLinesRentalPrice } from './contractLineHelpers';
import type { Reservation } from './reservation.types';

export const RESERVATIONS_COLLECTION = 'reservations';

/** Item states a contract may still reserve, and the states a return may leave. */
export const reservableDressStatuses = new Set(['available', 'reserved', 'rented']);
export const allowedReturnItemStatuses = new Set(['inspection', 'laundry', 'maintenance', 'damaged']);

export function remaining(reservation: Reservation): number {
  // Canonical: rental outstanding excludes security deposit
  const hasCanonical = reservation.securityDepositAmount !== undefined || reservation.bookingAdvanceAmount !== undefined;
  if (hasCanonical) {
    const rentalTotal = reservation.lines && reservation.lines.length > 0
      ? calculateLinesRentalPrice(reservation.lines)
      : reservation.rentalPrice;
    // FIX: Do NOT use bookingAdvanceAmount as collected, and do NOT fallback to paidAmount for rentalCollected
    // paidAmount is derived as rentalCollected + bookingAdvanceCollected, not source of truth
    // bookingAdvanceAmount = required/agreed, bookingAdvanceCollectedAmount = actually paid
    return calculateRentalOutstanding({
      rentalTotal,
      assessedFees: reservation.assessedFeesAmount ?? 0,
      bookingAdvanceCollected: reservation.bookingAdvanceCollectedAmount ?? 0,
      rentalCollected: reservation.rentalCollectedAmount ?? 0,
      rentalRefunded: reservation.rentalRefundedAmount ?? 0,
      retainedDeposit: reservation.securityDepositRetainedAmount ?? reservation.retainedDepositAmount ?? 0,
    });
  }
  // Legacy fallback for old backups
  return calculateReservationRemainingAmount({
    totalAmount: reservation.totalAmount,
    assessedFeesAmount: reservation.assessedFeesAmount,
    paidAmount: reservation.paidAmount,
    settledDepositAmount: reservation.settledDepositAmount,
    refundedAmount: reservation.refundedAmount,
  });
}

export function persist(reservations: Reservation[], updated: Reservation): Reservation {
  const next = { ...updated, remainingAmount: remaining(updated) };
  writeCollection(RESERVATIONS_COLLECTION, reservations.map((item) => item.id === next.id ? next : item));
  return next;
}

export function normalizeTimeInput(value: string | undefined, label: string): string | undefined { if (value === undefined || value === '') return undefined; if (!isValidTime(value)) throw new Error(`${label} غير صالح. استخدمي صيغة HH:MM.`); return value; }

export function validateOperationDateTime(value: string, label: string): number {
  const timestamp = new Date(value).getTime();
  if (!value || Number.isNaN(timestamp)) throw new Error(`${label} مطلوبان.`);
  if (timestamp > Date.now()) throw new Error(`${label} لا يمكن أن يكونا في المستقبل.`);
  return timestamp;
}

export function assertNoPostedMoneyForContractValueChange(reservation: Reservation): void {
  const hasPostedMoney = (reservation.paidAmount ?? 0) > 0
    || (reservation.rentalCollectedAmount ?? 0) > 0
    || (reservation.bookingAdvanceCollectedAmount ?? 0) > 0
    || (reservation.securityDepositCollectedAmount ?? 0) > 0
    || (reservation.refundedAmount ?? 0) > 0
    || (reservation.settledDepositAmount ?? 0) > 0
    || (reservation.retainedDepositAmount ?? 0) > 0
    || (reservation.securityDepositRetainedAmount ?? 0) > 0;
  if (hasPostedMoney) {
    throw new Error('لا يمكن تغيير قيمة العقد بعد تسجيل حركة مالية أو مبالغ محصلة عليه.');
  }
}

export function assertLineDeliveryPaymentGate(reservation: Reservation, overrideReason?: string): string | undefined {
  const outstandingAmount = Math.round((reservation.remainingAmount + Number.EPSILON) * 1_000) / 1_000;
  if (outstandingAmount <= 0) return undefined;
  const reason = overrideReason?.trim();
  if (!reason) {
    throw new Error(`لا يمكن تسليم البند قبل سداد الرصيد المتبقي (${outstandingAmount.toFixed(3)} ر.ع)، أو تسجيل سبب واضح للتجاوز.`);
  }
  return reason;
}
