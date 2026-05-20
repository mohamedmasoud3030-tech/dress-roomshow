import { loadLocalPayments, saveLocalPayment, type LocalPaymentRecord } from '../../services/localDatabase';
import { paymentMockRecords } from './payment.mock';
import type {
  PaymentDirection,
  PaymentFilters,
  PaymentMethod,
  PaymentRecord,
  PaymentSummary,
  PaymentType,
} from './payment.types';

export function getPayments(): PaymentRecord[] {
  return paymentMockRecords;
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
  const reservationTotals = new Map<string, number>();
  const netByReservation = new Map<string, number>();

  const summary = payments.reduce<PaymentSummary>(
    (acc, payment) => {
      if (!reservationTotals.has(payment.reservationNumber)) {
        reservationTotals.set(payment.reservationNumber, payment.reservationTotal);
      }

      const signedAmount = payment.direction === 'income' ? payment.amount : -payment.amount;
      netByReservation.set(
        payment.reservationNumber,
        (netByReservation.get(payment.reservationNumber) ?? 0) + signedAmount,
      );

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

  summary.remainingBalance = Array.from(reservationTotals.entries()).reduce(
    (total, [reservationNumber, reservationTotal]) => {
      const paidNet = netByReservation.get(reservationNumber) ?? 0;
      return total + Math.max(reservationTotal - paidNet, 0);
    },
    0,
  );

  return summary;
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

export async function getPaymentsFromLocalDb(): Promise<PaymentRecord[] | null> {
  try {
    const rows = await loadLocalPayments();
    if (!rows) return null;
    return rows.map((row) => ({
      id: row.id,
      paymentNumber: row.paymentNumber,
      reservationNumber: row.reservationNumber,
      customerName: row.customerName,
      dressCode: row.dressCode,
      dressName: row.dressName,
      paymentDate: row.paymentDate,
      type: row.paymentType as PaymentRecord['type'],
      method: row.method as PaymentRecord['method'],
      direction: row.direction as PaymentRecord['direction'],
      amount: row.amount,
      reservationTotal: row.reservationTotal,
      notes: row.notes,
    }));
  } catch {
    return null;
  }
}

export async function addPaymentToLocalDb(payment: PaymentRecord): Promise<boolean> {
  try { const row: LocalPaymentRecord = { ...payment, paymentType: payment.type, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }; return await saveLocalPayment(row); } catch { return false; }
}
