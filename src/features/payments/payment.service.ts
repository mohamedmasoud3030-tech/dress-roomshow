import { generateId, generateNumber, readCollection, writeCollection } from '../../services/localDatabase';
import { getTodayISO } from '../../shared/utils/date';
import { getReservations, recordReservationPayment } from '../reservations/reservation.service';
import { paymentMockRecords } from './payment.mock';
import type {
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
  type: PaymentType;
  method: PaymentMethod;
  amount: number;
  notes?: string;
};

export function getPayments(): PaymentRecord[] {
  return readCollection(COLLECTION, paymentMockRecords);
}

export function filterPayments(
  payments: PaymentRecord[],
  filters: PaymentFilters,
): PaymentRecord[] {
  const normalizedSearch = filters.search.trim().toLowerCase();

  return payments.filter((payment) => {
    const matchesType = filters.type === 'all' || payment.type === filters.type;
    const matchesMethod = filters.method === 'all' || payment.method === filters.method;
    const matchesDirection =
      filters.direction === 'all' || payment.direction === filters.direction;

    if (!normalizedSearch) {
      return matchesType && matchesMethod && matchesDirection;
    }

    const matchesSearch =
      payment.paymentNumber.toLowerCase().includes(normalizedSearch) ||
      payment.reservationNumber.toLowerCase().includes(normalizedSearch) ||
      payment.customerName.toLowerCase().includes(normalizedSearch) ||
      payment.dressCode.toLowerCase().includes(normalizedSearch) ||
      payment.dressName.toLowerCase().includes(normalizedSearch);

    return matchesType && matchesMethod && matchesDirection && matchesSearch;
  });
}

export function summarizePayments(payments: PaymentRecord[]): PaymentSummary {
  const summary = payments.reduce<PaymentSummary>(
    (acc, payment) => {
      if (payment.direction === 'income') {
        acc.totalCollected += payment.amount;
      }

      if (payment.direction === 'refund') {
        acc.totalRefunded += payment.amount;
      }

      if (payment.direction === 'income' && payment.type === 'deposit') {
        acc.deposits += payment.amount;
      }

      if (payment.direction === 'income' && payment.type === 'penalty') {
        acc.penalties += payment.amount;
      }

      return acc;
    },
    {
      totalCollected: 0,
      deposits: 0,
      penalties: 0,
      totalRefunded: 0,
      remainingBalance: 0,
    },
  );

  summary.remainingBalance = getReservations().reduce(
    (total, reservation) => total + reservation.remainingAmount,
    0,
  );

  return summary;
}

export function addPayment(input: AddPaymentInput): PaymentRecord {
  const reservation = getReservations().find((item) => item.reservationNumber === input.reservationNumber);
  const direction: PaymentDirection = input.type === 'refund' ? 'refund' : 'income';

  if (!reservation) throw new Error('الحجز المحدد غير موجود.');
  if (!input.paymentDate) throw new Error('تاريخ الدفع مطلوب.');
  if (input.paymentDate > getTodayISO()) throw new Error('تاريخ الدفع لا يمكن أن يكون في المستقبل.');
  if (!Number.isFinite(input.amount) || input.amount <= 0) throw new Error('قيمة الدفعة يجب أن تكون أكبر من صفر.');

  recordReservationPayment({
    reservationNumber: reservation.reservationNumber,
    type: input.type,
    direction,
    amount: input.amount,
  });

  const payment: PaymentRecord = {
    id: generateId(),
    paymentNumber: generateNumber('PAY'),
    reservationNumber: reservation.reservationNumber,
    customerName: reservation.customerName,
    dressCode: reservation.dressCode,
    dressName: reservation.dressName,
    paymentDate: input.paymentDate,
    type: input.type,
    method: input.method,
    direction,
    amount: input.amount,
    reservationTotal: reservation.totalAmount,
    notes: input.notes?.trim() || undefined,
  };

  writeCollection(COLLECTION, [payment, ...getPayments()]);
  return payment;
}

export function formatPaymentTypeLabel(type: PaymentType): string {
  const labels: Record<PaymentType, string> = {
    rental: 'إيجار',
    deposit: 'عربون',
    penalty: 'غرامة',
    refund: 'استرجاع',
    adjustment: 'تسوية',
  };

  return labels[type];
}

export function formatPaymentMethodLabel(method: PaymentMethod): string {
  const labels: Record<PaymentMethod, string> = {
    cash: 'نقداً',
    card: 'بطاقة',
    bank_transfer: 'تحويل بنكي',
    other: 'أخرى',
  };

  return labels[method];
}

export function formatPaymentDirectionLabel(direction: PaymentDirection): string {
  const labels: Record<PaymentDirection, string> = {
    income: 'تحصيل',
    refund: 'استرجاع',
  };

  return labels[direction];
}
