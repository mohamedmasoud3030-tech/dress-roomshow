import {
  db_getPayments,
  db_getReservations,
  db_savePayment,
  db_saveReservation,
  generateId,
  generateNumber,
} from '../../services/localDatabase';
import type {
  PaymentDirection,
  PaymentFilters,
  PaymentMethod,
  PaymentRecord,
  PaymentSummary,
  PaymentType,
} from './payment.types';

export function getPayments(): PaymentRecord[] {
  return db_getPayments();
}

export function filterPayments(payments: PaymentRecord[], filters: PaymentFilters): PaymentRecord[] {
  const search = filters.search.trim().toLowerCase();
  return payments.filter((p) => {
    const matchType = filters.type === 'all' || p.type === filters.type;
    const matchMethod = filters.method === 'all' || p.method === filters.method;
    const matchDir = filters.direction === 'all' || p.direction === filters.direction;
    if (!search) return matchType && matchMethod && matchDir;
    const matchSearch =
      p.paymentNumber.toLowerCase().includes(search) ||
      p.reservationNumber.toLowerCase().includes(search) ||
      p.customerName.toLowerCase().includes(search) ||
      p.dressCode.toLowerCase().includes(search) ||
      p.dressName.toLowerCase().includes(search);
    return matchType && matchMethod && matchDir && matchSearch;
  });
}

export function summarizePayments(payments: PaymentRecord[]): PaymentSummary {
  const reservationTotals = new Map<string, number>();
  const netByReservation = new Map<string, number>();

  const summary = payments.reduce<PaymentSummary>(
    (acc, p) => {
      if (!reservationTotals.has(p.reservationNumber)) {
        reservationTotals.set(p.reservationNumber, p.reservationTotal);
      }
      const signed = p.direction === 'income' ? p.amount : -p.amount;
      netByReservation.set(p.reservationNumber, (netByReservation.get(p.reservationNumber) ?? 0) + signed);
      if (p.direction === 'income') acc.totalCollected += p.amount;
      if (p.direction === 'refund') acc.totalRefunded += p.amount;
      if (p.direction === 'income' && p.type === 'deposit') acc.deposits += p.amount;
      if (p.direction === 'income' && p.type === 'penalty') acc.penalties += p.amount;
      return acc;
    },
    { totalCollected: 0, deposits: 0, penalties: 0, totalRefunded: 0, remainingBalance: 0 },
  );

  summary.remainingBalance = Array.from(reservationTotals.entries()).reduce((total, [num, tot]) => {
    const paid = netByReservation.get(num) ?? 0;
    return total + Math.max(tot - paid, 0);
  }, 0);

  return summary;
}

type AddPaymentInput = {
  reservationId: string;
  reservationNumber: string;
  customerName: string;
  dressCode: string;
  dressName: string;
  type: PaymentType;
  method: PaymentMethod;
  direction: PaymentDirection;
  amount: number;
  notes?: string;
};

export function addPayment(input: AddPaymentInput): PaymentRecord {
  const reservations = db_getReservations();
  const reservation = reservations.find((r) => r.id === input.reservationId);
  if (!reservation) throw new Error('الحجز غير موجود');

  const payment: PaymentRecord = {
    id: generateId(),
    paymentNumber: generateNumber('PAY'),
    reservationId: input.reservationId,
    reservationNumber: input.reservationNumber,
    customerName: input.customerName,
    dressCode: input.dressCode,
    dressName: input.dressName,
    paymentDate: new Date().toISOString().split('T')[0],
    type: input.type,
    method: input.method,
    direction: input.direction,
    amount: input.amount,
    reservationTotal: reservation.totalAmount,
    notes: input.notes,
  };
  db_savePayment(payment);

  const delta = input.direction === 'income' ? input.amount : -input.amount;
  const newPaid = Math.max(0, reservation.paidAmount + delta);
  const newRemaining = Math.max(0, reservation.totalAmount - newPaid);
  db_saveReservation({ ...reservation, paidAmount: newPaid, remainingAmount: newRemaining });

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
  const labels: Record<PaymentDirection, string> = { income: 'تحصيل', refund: 'استرجاع' };
  return labels[direction];
}
