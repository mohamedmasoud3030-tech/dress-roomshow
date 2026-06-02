import { generateId, generateNumber, readCollection, writeCollection } from '../../services/localDatabase';
import { getTodayISO } from '../../shared/utils/date';
import { calculateReturnSettlement } from '../../shared/utils/financialCalculations.js';
import { recordAudit } from '../audit/audit.service';
import { assertBusinessDateOpen } from '../integrity/integrity.service';
import { getReservations, recordReservationPayment, settleReservationReturn } from '../reservations/reservation.service';
import type { Reservation } from '../reservations/reservation.types';
import { paymentMockRecords } from './payment.mock';
import type {
  ManualPaymentType,
  PaymentDirection,
  PaymentFilters,
  PaymentMethod,
  PaymentRecord,
  PaymentSummary,
  PaymentType,
} from './payment.types';

const COLLECTION = 'payments';

type AddPaymentInput = {
  reservationNumber: string;
  paymentDate: string;
  type: ManualPaymentType;
  method: PaymentMethod;
  amount: number;
  notes?: string;
};

type RecordReturnSettlementInput = {
  reservationNumber: string;
  paymentDate: string;
  refundMethod: PaymentMethod;
  lateFee: number;
  damageFee: number;
};

export type ReturnSettlement = {
  refundAmount: number;
  retainedDepositAmount: number;
  settledDepositAmount: number;
  movements: PaymentRecord[];
};

export function getPayments(): PaymentRecord[] {
  return readCollection(COLLECTION, paymentMockRecords);
}

export function filterPayments(payments: PaymentRecord[], filters: PaymentFilters): PaymentRecord[] {
  const normalizedSearch = filters.search.trim().toLowerCase();

  return payments.filter((payment) => {
    const matchesType = filters.type === 'all' || payment.type === filters.type;
    const matchesMethod = filters.method === 'all' || payment.method === filters.method;
    const matchesDirection = filters.direction === 'all' || payment.direction === filters.direction;

    if (!normalizedSearch) return matchesType && matchesMethod && matchesDirection;

    const matchesSearch =
      payment.paymentNumber.toLowerCase().includes(normalizedSearch)
      || payment.reservationNumber.toLowerCase().includes(normalizedSearch)
      || payment.customerName.toLowerCase().includes(normalizedSearch)
      || payment.dressCode.toLowerCase().includes(normalizedSearch)
      || payment.dressName.toLowerCase().includes(normalizedSearch);

    return matchesType && matchesMethod && matchesDirection && matchesSearch;
  });
}

export function summarizePayments(payments: PaymentRecord[]): PaymentSummary {
  const summary = payments.reduce<PaymentSummary>(
    (acc, payment) => {
      if (payment.direction === 'income') acc.totalCollected += payment.amount;
      if (payment.direction === 'income' && payment.type === 'rental') acc.rentalCollected += payment.amount;
      if (payment.direction === 'refund') acc.totalRefunded += payment.amount;
      if (payment.direction === 'income' && payment.type === 'deposit') acc.deposits += payment.amount;
      if (payment.direction === 'income' && payment.type === 'penalty') acc.penalties += payment.amount;
      if (payment.direction === 'settlement' && payment.type === 'retained_deposit') acc.retainedDeposits += payment.amount;
      if (payment.direction === 'settlement' && payment.type === 'late_fee') acc.lateFees += payment.amount;
      if (payment.direction === 'settlement' && payment.type === 'damage_fee') acc.damageFees += payment.amount;
      return acc;
    },
    {
      totalCollected: 0,
      rentalCollected: 0,
      deposits: 0,
      retainedDeposits: 0,
      penalties: 0,
      lateFees: 0,
      damageFees: 0,
      totalRefunded: 0,
      remainingBalance: 0,
    },
  );

  summary.remainingBalance = getReservations()
    .filter((reservation) => reservation.status !== 'cancelled')
    .reduce((total, reservation) => total + reservation.remainingAmount, 0);

  return summary;
}

function createPaymentRecord(
  reservation: Reservation,
  input: {
    paymentDate: string;
    type: PaymentType;
    method: PaymentMethod;
    direction: PaymentDirection;
    amount: number;
    source: 'manual' | 'return';
    notes?: string;
  },
): PaymentRecord {
  return {
    id: generateId(),
    paymentNumber: generateNumber('PAY'),
    reservationNumber: reservation.reservationNumber,
    customerName: reservation.customerName,
    dressCode: reservation.dressCode,
    dressName: reservation.dressName,
    paymentDate: input.paymentDate,
    type: input.type,
    method: input.method,
    direction: input.direction,
    amount: input.amount,
    reservationTotal: reservation.totalAmount,
    source: input.source,
    notes: input.notes?.trim() || undefined,
  };
}

function auditPaymentMovement(payment: PaymentRecord): void {
  recordAudit({
    action: payment.direction === 'refund' ? 'refund' : 'payment',
    entityType: 'payment',
    entityId: payment.id,
    summary: `تم تسجيل الحركة ${payment.paymentNumber} على الحجز ${payment.reservationNumber}.`,
    nextValues: {
      type: payment.type,
      direction: payment.direction,
      amount: payment.amount,
      method: payment.method,
      paymentDate: payment.paymentDate,
      source: payment.source,
    },
  });
}

export function addPayment(input: AddPaymentInput): PaymentRecord {
  const reservation = getReservations().find((item) => item.reservationNumber === input.reservationNumber);
  const direction: PaymentDirection = input.type === 'refund' ? 'refund' : 'income';

  if (!reservation) throw new Error('الحجز المحدد غير موجود.');
  if (!input.paymentDate) throw new Error('تاريخ الدفع مطلوب.');
  if (input.paymentDate > getTodayISO()) throw new Error('تاريخ الدفع لا يمكن أن يكون في المستقبل.');
  if (!Number.isFinite(input.amount) || input.amount <= 0) throw new Error('قيمة الدفعة يجب أن تكون أكبر من صفر.');
  assertBusinessDateOpen(input.paymentDate);

  const updatedReservation = recordReservationPayment({
    reservationNumber: reservation.reservationNumber,
    type: input.type,
    direction: direction === 'refund' ? 'refund' : 'income',
    amount: input.amount,
  });
  const payment = createPaymentRecord(updatedReservation, {
    paymentDate: input.paymentDate,
    type: input.type,
    method: input.method,
    direction,
    amount: input.amount,
    source: 'manual',
    notes: input.notes,
  });

  writeCollection(COLLECTION, [payment, ...getPayments()]);
  auditPaymentMovement(payment);
  return payment;
}

export function recordReturnSettlement(input: RecordReturnSettlementInput): ReturnSettlement {
  const reservation = getReservations().find((item) => item.reservationNumber === input.reservationNumber);
  if (!reservation) throw new Error('الحجز المحدد غير موجود.');
  if (!input.paymentDate) throw new Error('تاريخ تسوية الاسترجاع مطلوب.');
  if (input.paymentDate > getTodayISO()) throw new Error('تاريخ تسوية الاسترجاع لا يمكن أن يكون في المستقبل.');
  if (![input.lateFee, input.damageFee].every((amount) => Number.isFinite(amount) && amount >= 0)) {
    throw new Error('رسوم التأخير أو الضرر غير صالحة.');
  }
  assertBusinessDateOpen(input.paymentDate);

  const payments = getPayments();
  const reservationPayments = payments.filter((payment) => payment.reservationNumber === reservation.reservationNumber);
  const depositCollected = Math.min(
    reservation.depositAmount,
    reservationPayments
      .filter((payment) => payment.type === 'deposit' && payment.direction === 'income')
      .reduce((total, payment) => total + payment.amount, 0),
  );
  const totalCollected = reservationPayments
    .filter((payment) => payment.direction === 'income')
    .reduce((total, payment) => total + payment.amount, 0);
  const previouslyRefundedAmount = reservationPayments
    .filter((payment) => payment.direction === 'refund')
    .reduce((total, payment) => total + payment.amount, 0);
  const previouslyRefundedDepositAmount = reservationPayments
    .filter((payment) => payment.type === 'refund' && payment.direction === 'refund' && payment.source === 'return')
    .reduce((total, payment) => total + payment.amount, 0);
  const settlement = calculateReturnSettlement({
    depositAmount: reservation.depositAmount,
    depositCollected,
    totalCollected,
    previouslyRefundedAmount,
    previouslyRefundedDepositAmount,
    lateFee: input.lateFee,
    damageFee: input.damageFee,
  });
  const { refundAmount, retainedDepositAmount, settledDepositAmount } = settlement;

  const updatedReservation = settleReservationReturn({
    reservationNumber: reservation.reservationNumber,
    lateFee: input.lateFee,
    damageFee: input.damageFee,
    refundAmount,
    settledDepositAmount,
    retainedDepositAmount,
  });

  const movements: PaymentRecord[] = [
    input.lateFee > 0
      ? createPaymentRecord(updatedReservation, {
          paymentDate: input.paymentDate,
          type: 'late_fee',
          method: 'other',
          direction: 'settlement',
          amount: input.lateFee,
          source: 'return',
          notes: 'إثبات رسوم التأخير عند استرجاع الفستان.',
        })
      : null,
    input.damageFee > 0
      ? createPaymentRecord(updatedReservation, {
          paymentDate: input.paymentDate,
          type: 'damage_fee',
          method: 'other',
          direction: 'settlement',
          amount: input.damageFee,
          source: 'return',
          notes: 'إثبات رسوم الضرر عند استرجاع الفستان.',
        })
      : null,
    settledDepositAmount > 0
      ? createPaymentRecord(updatedReservation, {
          paymentDate: input.paymentDate,
          type: 'deposit_settlement',
          method: 'other',
          direction: 'settlement',
          amount: settledDepositAmount,
          source: 'return',
          notes: 'إغلاق وتسوية العربون عند استرجاع الفستان.',
        })
      : null,
    retainedDepositAmount > 0
      ? createPaymentRecord(updatedReservation, {
          paymentDate: input.paymentDate,
          type: 'retained_deposit',
          method: 'other',
          direction: 'settlement',
          amount: retainedDepositAmount,
          source: 'return',
          notes: 'جزء محتجز من العربون لتغطية الرسوم.',
        })
      : null,
    refundAmount > 0
      ? createPaymentRecord(updatedReservation, {
          paymentDate: input.paymentDate,
          type: 'refund',
          method: input.refundMethod,
          direction: 'refund',
          amount: refundAmount,
          source: 'return',
          notes: 'استرجاع تلقائي للجزء المستحق من العربون.',
        })
      : null,
  ].filter((movement): movement is PaymentRecord => movement !== null);

  writeCollection(COLLECTION, [...movements, ...payments]);
  movements.forEach(auditPaymentMovement);
  return { refundAmount, retainedDepositAmount, settledDepositAmount, movements };
}

export function formatPaymentTypeLabel(type: PaymentType): string {
  const labels: Record<PaymentType, string> = {
    rental: 'إيجار',
    deposit: 'عربون محصل',
    late_fee: 'رسوم تأخير',
    damage_fee: 'رسوم ضرر',
    deposit_settlement: 'تسوية عربون',
    retained_deposit: 'عربون محتجز',
    penalty: 'غرامة مسددة',
    refund: 'استرجاع نقدي',
    adjustment: 'تسوية مسددة',
  };
  return labels[type];
}

export function formatPaymentMethodLabel(method: PaymentMethod): string {
  const labels: Record<PaymentMethod, string> = {
    cash: 'نقداً',
    card: 'بطاقة',
    bank_transfer: 'تحويل بنكي',
    other: 'قيد غير نقدي / أخرى',
  };
  return labels[method];
}

export function formatPaymentDirectionLabel(direction: PaymentDirection): string {
  const labels: Record<PaymentDirection, string> = {
    income: 'تحصيل',
    refund: 'استرجاع',
    settlement: 'تسوية غير نقدية',
  };
  return labels[direction];
}
