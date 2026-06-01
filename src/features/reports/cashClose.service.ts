import { generateId, readCollection, writeCollection } from '../../services/localDatabase';
import { getTodayISO } from '../../shared/utils/date';
import { getSales } from '../dresses/sale.service';
import { getExpenses } from '../expenses/expense.service';
import { getPayments } from '../payments/payment.service';

export type CashCloseRecord = {
  id: string;
  closeDate: string;
  openingCash: number;
  rentalCash: number;
  salesCash: number;
  refundsCash: number;
  expensesCash: number;
  expectedCash: number;
  actualCash: number;
  difference: number;
  notes?: string;
};

type SaveCashCloseInput = {
  closeDate: string;
  openingCash: number;
  actualCash: number;
  notes?: string;
};

const COLLECTION = 'cash-closes';

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

export function getCashCloses(): CashCloseRecord[] {
  return readCollection<CashCloseRecord>(COLLECTION, []);
}

export function calculateCashClose(input: SaveCashCloseInput): CashCloseRecord {
  if (!input.closeDate) throw new Error('تاريخ الإقفال مطلوب.');
  if (input.closeDate > getTodayISO()) throw new Error('تاريخ الإقفال لا يمكن أن يكون في المستقبل.');
  if (![input.openingCash, input.actualCash].every((value) => Number.isFinite(value) && value >= 0)) {
    throw new Error('رصيد البداية أو الجرد الفعلي غير صالح.');
  }

  const payments = getPayments().filter((payment) => payment.paymentDate === input.closeDate && payment.method === 'cash');
  const rentalCash = sum(payments.filter((payment) => payment.direction === 'income').map((payment) => payment.amount));
  const refundsCash = sum(payments.filter((payment) => payment.direction === 'refund').map((payment) => payment.amount));
  const salesCash = sum(getSales().filter((sale) => sale.saleDate === input.closeDate && sale.paymentMethod === 'cash').map((sale) => sale.amount));
  const expensesCash = sum(getExpenses().filter((expense) => expense.expenseDate === input.closeDate && expense.paymentMethod === 'cash').map((expense) => expense.amount));
  const expectedCash = input.openingCash + rentalCash + salesCash - refundsCash - expensesCash;

  return {
    id: getCashCloses().find((record) => record.closeDate === input.closeDate)?.id ?? generateId(),
    closeDate: input.closeDate,
    openingCash: input.openingCash,
    rentalCash,
    salesCash,
    refundsCash,
    expensesCash,
    expectedCash,
    actualCash: input.actualCash,
    difference: input.actualCash - expectedCash,
    notes: input.notes?.trim() || undefined,
  };
}

export function saveCashClose(input: SaveCashCloseInput): CashCloseRecord {
  const record = calculateCashClose(input);
  const records = getCashCloses();
  writeCollection(COLLECTION, [record, ...records.filter((item) => item.closeDate !== record.closeDate)]);
  return record;
}
