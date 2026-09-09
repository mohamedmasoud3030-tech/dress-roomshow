/**
 * Money movements against a contract.
 *
 * Collecting rent, refunding it, taking the refundable deposit, and settling
 * what is kept of it at return. Every one of these writes the same handful of
 * counters, and one wrong counter is a reconciliation the owner has to explain
 * to a customer face to face. They live together so the guards are read side
 * by side instead of being scattered through a thousand-line file.
 */

import { calculateReservationRemainingAmount } from '../../shared/utils/financialCalculations.js';
import { getReservations } from './reservation.service';
import { persist, remaining } from './reservationInternal';
import type { Reservation } from './reservation.types';

export type RecordReservationPaymentInput = {
  reservationNumber: string;
  type: string;
  direction: 'income' | 'refund' | 'settlement';
  amount: number;
};

export type SettleReservationReturnInput = {
  reservationNumber: string;
  lateFee: number;
  damageFee: number;
  refundAmount: number;
  settledDepositAmount: number;
  retainedDepositAmount: number;
  /** Per-line returns have already posted the assessed fees before the final line closes. */
  feesAlreadyAssessed?: boolean;
  /** Canonical fields for new flow */
  securityDepositAmount?: number;
  securityDepositCollectedAmount?: number;
};

export function recordReservationPayment(input: RecordReservationPaymentInput): Reservation {
  const reservations = getReservations();
  const reservation = reservations.find((item) => item.reservationNumber === input.reservationNumber);
  if (!reservation) throw new Error('الحجز المحدد غير موجود.');
  if (reservation.status === 'cancelled') throw new Error('لا يمكن تسجيل حركة مالية على حجز ملغي.');
  if (!Number.isFinite(input.amount) || input.amount <= 0) throw new Error('قيمة الدفعة يجب أن تكون أكبر من صفر.');

  // Strict type-direction mapping: fixed per blocker #1 and #2
  // refund type = rental refund only, direction must be refund
  // security_deposit_refund = deposit refund only, direction refund
  // security_deposit_retention / retained_deposit = settlement only
  // All other income types = income
  const isRentalRefund = input.type === 'refund';
  const isSecurityDepositRefund = input.type === 'security_deposit_refund';
  const isSecurityDepositRetention = input.type === 'security_deposit_retention' || input.type === 'retained_deposit';
  const isSecurityDepositCollection = input.type === 'security_deposit_collection' || input.type === 'deposit';
  const isBookingAdvance = input.type === 'booking_advance';
  const isRental = input.type === 'rental' || input.type === 'rental_payment';
  const isFee = input.type === 'penalty' || input.type === 'adjustment';

  if (isRentalRefund && input.direction !== 'refund') throw new Error('حركة الاسترجاع غير صالحة.');
  if (isSecurityDepositRefund && input.direction !== 'refund') throw new Error('حركة استرداد التأمين غير صالحة.');
  if (isSecurityDepositRetention && input.direction !== 'settlement') throw new Error('حركة احتجاز التأمين يجب أن تكون settlement.');
  if (!isRentalRefund && !isSecurityDepositRefund && input.direction === 'refund') {
    throw new Error('اختاري نوع حركة مالية مناسب للاسترجاع.');
  }

  // Refund guards - strictly separated per requirement #1
  if (input.direction === 'refund') {
    if (isRentalRefund) {
      // Booking-advance cancellation/refund policy is outside this PR.  Generic
      // rental refunds can reverse only explicit rental collections.
      const rentalCollected = reservation.rentalCollectedAmount ?? 0;
      const rentalRefunded = reservation.rentalRefundedAmount ?? 0;
      if (input.amount > rentalCollected - rentalRefunded + 1e-6) {
        throw new Error('قيمة استرجاع الإيجار تتجاوز المبلغ المحصل فعلياً للإيجار. رد دفعة الحجز عند الإلغاء خارج نطاق هذه النسخة.');
      }
    } else if (isSecurityDepositRefund) {
      const collected = reservation.securityDepositCollectedAmount ?? 0;
      const refunded = reservation.securityDepositRefundedAmount ?? 0;
      const retained = reservation.securityDepositRetainedAmount ?? 0;
      const available = Math.max(collected - refunded - retained, 0);
      if (input.amount > available + 1e-6) {
        throw new Error('قيمة استرداد التأمين المسترد تتجاوز المبلغ المتاح للاسترداد.');
      }
    } else {
      // Any other refund type not allowed as per separation
      throw new Error('نوع الاسترداد غير مدعوم؛ استخدمي refund للإيجار أو security_deposit_refund للتأمين.');
    }
  }

  if (input.direction === 'income' && !isFee && !isSecurityDepositCollection) {
    const rentalRemaining = remaining(reservation);
    if (input.amount > rentalRemaining + 1e-6) {
      const legacyRemaining = calculateReservationRemainingAmount({
        totalAmount: reservation.totalAmount,
        assessedFeesAmount: reservation.assessedFeesAmount,
        paidAmount: reservation.paidAmount,
        settledDepositAmount: reservation.settledDepositAmount,
        refundedAmount: reservation.refundedAmount,
      });
      if (input.amount > rentalRemaining && input.amount > legacyRemaining) {
        throw new Error('قيمة الدفعة تتجاوز الرصيد المتبقي على الحجز.');
      }
    }
  }

  if (input.direction === 'settlement') {
    if (isSecurityDepositRetention) {
      const collected = reservation.securityDepositCollectedAmount ?? 0;
      const refunded = reservation.securityDepositRefundedAmount ?? 0;
      const retained = reservation.securityDepositRetainedAmount ?? 0;
      const available = Math.max(collected - refunded - retained, 0);
      if (input.amount > available + 1e-6) {
        throw new Error('قيمة احتجاز التأمين المسترد تتجاوز المبلغ المتاح.');
      }
    }
  }

  const nextReservation: Reservation = { ...reservation };

  // Unified paidAmount = rentalCollectedAmount + bookingAdvanceCollectedAmount per requirement #4
  if (input.direction === 'income') {
    if (isBookingAdvance) {
      // FIX: bookingAdvanceCollectedAmount must be derived from actually paid, NOT from required bookingAdvanceAmount
      const currentCollected = reservation.bookingAdvanceCollectedAmount ?? 0;
      nextReservation.bookingAdvanceCollectedAmount = currentCollected + input.amount;
      // DO NOT overwrite bookingAdvanceAmount (required/agreed) - keep as is
      const rentalCollected = reservation.rentalCollectedAmount ?? 0;
      nextReservation.rentalCollectedAmount = rentalCollected;
      nextReservation.paidAmount = rentalCollected + nextReservation.bookingAdvanceCollectedAmount;
    } else if (isRental) {
      const currentRentalCollected = reservation.rentalCollectedAmount ?? 0;
      const bookingAdvanceCollected = reservation.bookingAdvanceCollectedAmount ?? 0;
      nextReservation.rentalCollectedAmount = currentRentalCollected + input.amount;
      nextReservation.bookingAdvanceCollectedAmount = bookingAdvanceCollected;
      nextReservation.paidAmount = nextReservation.rentalCollectedAmount + bookingAdvanceCollected;
    } else if (isSecurityDepositCollection) {
      nextReservation.securityDepositCollectedAmount = (reservation.securityDepositCollectedAmount ?? 0) + input.amount;
      // FIX: paidAmount must NOT include security deposit for canonical
      const rentalCollected = reservation.rentalCollectedAmount ?? 0;
      const bookingAdvanceCollected = reservation.bookingAdvanceCollectedAmount ?? 0;
      nextReservation.rentalCollectedAmount = rentalCollected;
      nextReservation.bookingAdvanceCollectedAmount = bookingAdvanceCollected;
      nextReservation.paidAmount = rentalCollected + bookingAdvanceCollected;
      // Legacy fallback: if reservation has no canonical fields, keep old behavior for backward compat
      if (reservation.securityDepositAmount === undefined && reservation.bookingAdvanceAmount === undefined) {
        nextReservation.paidAmount = (reservation.paidAmount ?? 0) + input.amount;
      }
    } else {
      // fee or other
      const rentalCollected = reservation.rentalCollectedAmount ?? 0;
      const bookingAdvanceCollected = reservation.bookingAdvanceCollectedAmount ?? 0;
      nextReservation.rentalCollectedAmount = rentalCollected;
      nextReservation.bookingAdvanceCollectedAmount = bookingAdvanceCollected;
      nextReservation.paidAmount = rentalCollected + bookingAdvanceCollected;
      if (isFee) {
        nextReservation.assessedFeesAmount = (reservation.assessedFeesAmount ?? 0) + input.amount;
      }
    }
  } else if (input.direction === 'refund') {
    if (isRentalRefund) {
      nextReservation.rentalRefundedAmount = (reservation.rentalRefundedAmount ?? 0) + input.amount;
      nextReservation.refundedAmount = (reservation.refundedAmount ?? 0) + input.amount;
      // paidAmount stays as sum of collected, refund increases remaining via rentalRefunded
      const rentalCollected = reservation.rentalCollectedAmount ?? 0;
      const bookingAdvanceCollected = reservation.bookingAdvanceCollectedAmount ?? 0;
      nextReservation.paidAmount = rentalCollected + bookingAdvanceCollected;
    } else if (isSecurityDepositRefund) {
      nextReservation.securityDepositRefundedAmount = (reservation.securityDepositRefundedAmount ?? 0) + input.amount;
      nextReservation.securityDepositCollectedAmount = reservation.securityDepositCollectedAmount ?? 0;
      nextReservation.securityDepositRetainedAmount = reservation.securityDepositRetainedAmount ?? 0;
      // paidAmount must NOT change for security deposit refund
      const rentalCollected = reservation.rentalCollectedAmount ?? 0;
      const bookingAdvanceCollected = reservation.bookingAdvanceCollectedAmount ?? 0;
      nextReservation.rentalCollectedAmount = rentalCollected;
      nextReservation.bookingAdvanceCollectedAmount = bookingAdvanceCollected;
      nextReservation.paidAmount = rentalCollected + bookingAdvanceCollected;
    }
  } else if (input.direction === 'settlement') {
    // Settlement = security deposit retention / fee proof, must NOT affect paidAmount/rentalCollected/bookingAdvanceCollected
    if (isSecurityDepositRetention) {
      nextReservation.securityDepositRetainedAmount = (reservation.securityDepositRetainedAmount ?? 0) + input.amount;
      // Keep other collected amounts unchanged
      const rentalCollected = reservation.rentalCollectedAmount ?? 0;
      const bookingAdvanceCollected = reservation.bookingAdvanceCollectedAmount ?? 0;
      nextReservation.rentalCollectedAmount = rentalCollected;
      nextReservation.bookingAdvanceCollectedAmount = bookingAdvanceCollected;
      nextReservation.paidAmount = rentalCollected + bookingAdvanceCollected;
      // Retained deposit covers fees but does NOT increase paidAmount; it reduces liability only
      // Assessed fees handling is done in settleReservationReturn (adds late/damage)
      // For manual retention, we do NOT automatically add to assessedFees here - retention reason must cover proven fees
    } else {
      // late_fee, damage_fee, deposit_settlement as settlement - do not affect paidAmount
      const rentalCollected = reservation.rentalCollectedAmount ?? 0;
      const bookingAdvanceCollected = reservation.bookingAdvanceCollectedAmount ?? 0;
      nextReservation.rentalCollectedAmount = rentalCollected;
      nextReservation.bookingAdvanceCollectedAmount = bookingAdvanceCollected;
      nextReservation.paidAmount = rentalCollected + bookingAdvanceCollected;
      if (input.type === 'late_fee' || input.type === 'damage_fee') {
        // Settlement fees proof - assessedFees already increased in settleReservationReturn, but for manual keep consistent
        // Do not double count if feesAlreadyAssessed path
      }
    }
  }

  // Final unification: ensure paidAmount = rentalCollected + bookingAdvanceCollected for canonical
  const hasCanonical = nextReservation.securityDepositAmount !== undefined || nextReservation.bookingAdvanceAmount !== undefined;
  if (hasCanonical) {
    const rc = nextReservation.rentalCollectedAmount ?? 0;
    const bac = nextReservation.bookingAdvanceCollectedAmount ?? 0;
    nextReservation.paidAmount = rc + bac;
    if (nextReservation.rentalCollectedAmount === undefined) nextReservation.rentalCollectedAmount = rc;
    if (nextReservation.bookingAdvanceCollectedAmount === undefined) nextReservation.bookingAdvanceCollectedAmount = bac;
    if (nextReservation.rentalRefundedAmount === undefined) nextReservation.rentalRefundedAmount = reservation.rentalRefundedAmount ?? 0;
    if (nextReservation.securityDepositCollectedAmount === undefined) nextReservation.securityDepositCollectedAmount = reservation.securityDepositCollectedAmount ?? 0;
    if (nextReservation.securityDepositRefundedAmount === undefined) nextReservation.securityDepositRefundedAmount = reservation.securityDepositRefundedAmount ?? 0;
    if (nextReservation.securityDepositRetainedAmount === undefined) nextReservation.securityDepositRetainedAmount = reservation.securityDepositRetainedAmount ?? 0;
  }

  return persist(reservations, nextReservation);
}

export function settleReservationReturn(input: SettleReservationReturnInput): Reservation {
  const reservations = getReservations();
  const reservation = reservations.find((item) => item.reservationNumber === input.reservationNumber);
  if (!reservation) throw new Error('الحجز المحدد غير موجود.');
  const eligibleStatuses = input.feesAlreadyAssessed ? ['delivered', 'overdue', 'returned'] : ['delivered', 'overdue'];
  if (!eligibleStatuses.includes(reservation.status)) throw new Error('الحجز غير مؤهل لتسوية الاسترجاع حالياً.');
  if ((reservation.settledDepositAmount ?? 0) > 0 && (reservation.securityDepositAmount === undefined)) {
    throw new Error('تمت تسوية عربون هذا الحجز بالفعل.');
  }
  // For canonical, check if security deposit already fully settled
  if (reservation.securityDepositAmount !== undefined) {
    const collected = reservation.securityDepositCollectedAmount ?? 0;
    const refunded = reservation.securityDepositRefundedAmount ?? 0;
    const retained = reservation.securityDepositRetainedAmount ?? 0;
    const liability = Math.max(collected - refunded - retained, 0);
    if (liability === 0 && collected > 0 && (reservation.settledDepositAmount ?? 0) > 0) {
      throw new Error('تمت تسوية التأمين المسترد لهذا الحجز بالفعل.');
    }
    // Prevent settlement if needs classification
    if (reservation.needsFinancialClassification) {
      throw new Error('هذا الحجز يحتاج مراجعة مالية لتصنيف العربون قبل التسوية.');
    }
  }

  if (![input.lateFee, input.damageFee, input.refundAmount, input.settledDepositAmount, input.retainedDepositAmount].every((amount) => Number.isFinite(amount) && amount >= 0)) throw new Error('بيانات التسوية المالية غير صالحة.');
  if (input.refundAmount + input.retainedDepositAmount > input.settledDepositAmount + 1e-6) {
    // For canonical, also check against liability
    if (reservation.securityDepositAmount !== undefined) {
      const collected = reservation.securityDepositCollectedAmount ?? 0;
      const refunded = reservation.securityDepositRefundedAmount ?? 0;
      const retained = reservation.securityDepositRetainedAmount ?? 0;
      const available = Math.max(collected - refunded - retained, 0);
      if (input.refundAmount + input.retainedDepositAmount > available + 1e-6) {
        throw new Error('إجمالي رد التأمين والتأمين المحتجز يتجاوز المبلغ المتاح.');
      }
    } else {
      throw new Error('إجمالي رد العربون والعربون المحتجز يتجاوز قيمة العربون المسوّاة.');
    }
  }

  return persist(reservations, {
    ...reservation,
    assessedFeesAmount: (reservation.assessedFeesAmount ?? 0)
      + (input.feesAlreadyAssessed ? 0 : input.lateFee + input.damageFee),
    refundedAmount: (reservation.refundedAmount ?? 0) + input.refundAmount,
    settledDepositAmount: (reservation.settledDepositAmount ?? 0) + input.settledDepositAmount,
    retainedDepositAmount: (reservation.retainedDepositAmount ?? 0) + input.retainedDepositAmount,
    // Canonical
    securityDepositRefundedAmount: (reservation.securityDepositRefundedAmount ?? 0) + input.refundAmount,
    securityDepositRetainedAmount: (reservation.securityDepositRetainedAmount ?? 0) + input.retainedDepositAmount,
    securityDepositCollectedAmount: reservation.securityDepositCollectedAmount ?? input.securityDepositCollectedAmount ?? 0,
  });
}
