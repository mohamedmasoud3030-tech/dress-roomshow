import { generateId, readCollection, writeCollection } from '../../services/localDatabase';
import { createDayCloseMethodBreakdown, isActiveDayClosing } from '../../shared/utils/dailyClosingCalculations.js';
import { getTodayISO } from '../../shared/utils/date';
import { formatMoneyOMR } from '../../shared/utils/format';
import { recordAudit } from '../audit/audit.service';
import { getCustomers } from '../customers/customer.service';
import { getDresses } from '../dresses/dress.service';
import { getSales } from '../dresses/sale.service';
import { getExpenses } from '../expenses/expense.service';
import { getPayments } from '../payments/payment.service';
import { getAppPreferences } from '../preferences/preferences.service';
import { getReservations } from '../reservations/reservation.service';
import type {
  CloseDayInput,
  CustomerBalanceRow,
  DateRangeFilter,
  DayCloseBreakdown,
  DayCloseMethodBreakdown,
  DayCloseRecord,
  DressPerformanceRow,
  FinancialSummary,
  ReportSummary,
  TodayReport,
} from './report.types';

const activeReservationStatuses = new Set(['pending', 'confirmed', 'delivered', 'overdue']);
const DAY_CLOSE_COLLECTION = 'daily-closings';

type LegacyDayCloseBreakdown = Partial<DayCloseBreakdown> & {
  cashIncome?: number;
  cashRefunds?: number;
  cashExpenses?: number;
  cardNet?: number;
  bankTransferNet?: number;
  otherNet?: number;
};

type StoredDayCloseRecord = Omit<DayCloseRecord, 'breakdown' | 'status'> & {
  breakdown: LegacyDayCloseBreakdown;
  status?: DayCloseRecord['status'];
};

function isWithinRange(date: string, range?: DateRangeFilter): boolean {
  if (!range) return true;
  if (range.from && date < range.from) return false;
  if (range.to && date > range.to) return false;
  return true;
}

function calculateInactivityDays(lastMovementDate: string | null): number | null {
  if (!lastMovementDate) return null;
  const today = new Date(`${getTodayISO()}T00:00:00`).getTime();
  const lastMovement = new Date(`${lastMovementDate}T00:00:00`).getTime();
  return Math.max(Math.floor((today - lastMovement) / 86_400_000), 0);
}

function sumAmounts(items: Array<{ amount: number }>): number {
  return items.reduce((total, item) => total + item.amount, 0);
}

function normalizeLegacyNet(net = 0): DayCloseMethodBreakdown {
  return createDayCloseMethodBreakdown({
    collections: Math.max(net, 0),
    refunds: Math.max(-net, 0),
    expenses: 0,
  });
}

function normalizeMethodBreakdown(
  current: DayCloseMethodBreakdown | undefined,
  legacyCollections = 0,
  legacyRefunds = 0,
  legacyExpenses = 0,
): DayCloseMethodBreakdown {
  return createDayCloseMethodBreakdown(current ?? {
    collections: legacyCollections,
    refunds: legacyRefunds,
    expenses: legacyExpenses,
  });
}

function normalizeDayCloseRecord(record: StoredDayCloseRecord): DayCloseRecord {
  return {
    ...record,
    status: record.status ?? 'closed',
    breakdown: {
      cash: normalizeMethodBreakdown(record.breakdown.cash, record.breakdown.cashIncome, record.breakdown.cashRefunds, record.breakdown.cashExpenses),
      card: record.breakdown.card ? normalizeMethodBreakdown(record.breakdown.card) : normalizeLegacyNet(record.breakdown.cardNet),
      bankTransfer: record.breakdown.bankTransfer ? normalizeMethodBreakdown(record.breakdown.bankTransfer) : normalizeLegacyNet(record.breakdown.bankTransferNet),
      other: record.breakdown.other ? normalizeMethodBreakdown(record.breakdown.other) : normalizeLegacyNet(record.breakdown.otherNet),
    },
  };
}

export function formatReportMoney(amount: number): string {
  return formatMoneyOMR(amount, 2);
}

export function getFinancialSummary(range?: DateRangeFilter): FinancialSummary {
  const payments = getPayments().filter((payment) => isWithinRange(payment.paymentDate, range));
  const sales = getSales().filter((sale) => isWithinRange(sale.saleDate, range));
  const expenses = getExpenses().filter((expense) => isWithinRange(expense.expenseDate, range));

  const rentalCollected = payments
    .filter((payment) => payment.direction === 'income' && payment.type === 'rental')
    .reduce((sum, payment) => sum + payment.amount, 0);
  const paymentCollections = payments
    .filter((payment) => payment.direction === 'income')
    .reduce((sum, payment) => sum + payment.amount, 0);
  const salesCollected = sales.reduce((sum, sale) => sum + sale.amount, 0);
  const totalCollected = paymentCollections + salesCollected;
  const totalRefunded = payments
    .filter((payment) => payment.direction === 'refund')
    .reduce((sum, payment) => sum + payment.amount, 0);
  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const netAmount = totalCollected - totalRefunded - totalExpenses;

  return { rentalCollected, salesCollected, totalCollected, totalRefunded, totalExpenses, netAmount };
}

export function getCustomerBalances(): CustomerBalanceRow[] {
  return getCustomers()
    .filter((customer) => customer.remainingBalance > 0)
    .map(({ id, name, phone, remainingBalance }) => ({ id, name, phone, remainingBalance }));
}

export function getDressPerformance(): DressPerformanceRow[] {
  const reservations = getReservations();
  const sales = getSales();
  const expenses = getExpenses();
  const dormantDressDays = getAppPreferences().dormantDressDays;

  return getDresses()
    .map(({ id, code, name, timesRented, status, purchasePrice }) => {
      const relatedReservations = reservations.filter(
        (reservation) => reservation.dressCode === code && reservation.status !== 'cancelled',
      );
      const relatedSales = sales.filter((sale) => sale.dressCode === code);
      const relatedExpenseRecords = expenses.filter((expense) => expense.relatedDressCode === code);
      const rentalRevenue = relatedReservations.reduce((sum, reservation) => sum + reservation.rentalPrice, 0);
      const salesRevenue = relatedSales.reduce((sum, sale) => sum + sale.amount, 0);
      const relatedExpenses = relatedExpenseRecords.reduce((sum, expense) => sum + expense.amount, 0);
      const totalRevenue = rentalRevenue + salesRevenue;
      const netResult = totalRevenue - purchasePrice - relatedExpenses;
      const movementDates = [
        ...relatedReservations.flatMap((reservation) => [reservation.pickupDate, reservation.returnDate]),
        ...relatedSales.map((sale) => sale.saleDate),
        ...relatedExpenseRecords.map((expense) => expense.expenseDate),
      ];
      const lastMovementDate = movementDates.sort((a, b) => b.localeCompare(a))[0] ?? null;
      const inactivityDays = calculateInactivityDays(lastMovementDate);
      const roiPercent = purchasePrice > 0 ? (netResult / purchasePrice) * 100 : null;
      const recoveredPurchaseCost = totalRevenue >= purchasePrice;
      const maintenanceCostRatio = totalRevenue > 0 ? (relatedExpenses / totalRevenue) * 100 : relatedExpenses > 0 ? 100 : null;
      const requiresReview =
        (inactivityDays !== null && inactivityDays >= dormantDressDays) || relatedExpenses > totalRevenue;

      return {
        id,
        code,
        name,
        timesRented,
        status,
        purchasePrice,
        rentalRevenue,
        salesRevenue,
        relatedExpenses,
        totalRevenue,
        netResult,
        roiPercent,
        recoveredPurchaseCost,
        maintenanceCostRatio,
        lastMovementDate,
        inactivityDays,
        requiresReview,
      };
    })
    .sort((a, b) => b.totalRevenue - a.totalRevenue);
}

export function getTodayReport(): TodayReport {
  const todayDate = getTodayISO();
  const reservations = getReservations();
  const payments = getPayments();
  const sales = getSales();
  const expenses = getExpenses();

  const pickupsToday = reservations.filter((reservation) => reservation.pickupDate === todayDate).length;
  const returnsToday = reservations.filter((reservation) => reservation.returnDate === todayDate).length;
  const paymentsToday = payments
    .filter((payment) => payment.paymentDate === todayDate)
    .reduce((sum, payment) => {
      if (payment.direction === 'income') return sum + payment.amount;
      if (payment.direction === 'refund') return sum - payment.amount;
      return sum;
    }, 0)
    + sales
      .filter((sale) => sale.saleDate === todayDate)
      .reduce((sum, sale) => sum + sale.amount, 0);
  const expensesToday = expenses
    .filter((expense) => expense.expenseDate === todayDate)
    .reduce((sum, expense) => sum + expense.amount, 0);

  return { date: todayDate, pickupsToday, returnsToday, paymentsToday, expensesToday };
}

export function getReportSummary(range?: DateRangeFilter): ReportSummary {
  const reservations = getReservations();
  const financial = getFinancialSummary(range);

  return {
    totalDresses: getDresses().length,
    activeReservations: reservations.filter((reservation) => activeReservationStatuses.has(reservation.status)).length,
    totalCollected: financial.totalCollected,
    totalExpenses: financial.totalExpenses,
    netAmount: financial.netAmount,
    customersWithBalance: getCustomerBalances().length,
  };
}

export function getDayClosings(): DayCloseRecord[] {
  return readCollection<StoredDayCloseRecord>(DAY_CLOSE_COLLECTION, [])
    .map(normalizeDayCloseRecord)
    .sort((a, b) => b.closedAt.localeCompare(a.closedAt));
}

export function calculateDayClose(input: CloseDayInput): DayCloseRecord {
  if (!input.businessDate) throw new Error('تاريخ اليومية مطلوب.');
  if (input.businessDate > getTodayISO()) throw new Error('لا يمكن إقفال يومية بتاريخ مستقبلي.');
  if (!Number.isFinite(input.openingCash) || input.openingCash < 0) throw new Error('رصيد البداية غير صالح.');
  if (!Number.isFinite(input.actualCash) || input.actualCash < 0) throw new Error('الرصيد الفعلي غير صالح.');

  const payments = getPayments().filter((payment) => payment.paymentDate === input.businessDate);
  const sales = getSales().filter((sale) => sale.saleDate === input.businessDate);
  const expenses = getExpenses().filter((expense) => expense.expenseDate === input.businessDate);
  const paymentIncomeFor = (method: 'cash' | 'card' | 'bank_transfer' | 'other') => sumAmounts(
    payments.filter((payment) => payment.method === method && payment.direction === 'income'),
  );
  const paymentRefundsFor = (method: 'cash' | 'card' | 'bank_transfer' | 'other') => sumAmounts(
    payments.filter((payment) => payment.method === method && payment.direction === 'refund'),
  );
  const salesFor = (method: 'cash' | 'card' | 'bank_transfer' | 'other') => sumAmounts(
    sales.filter((sale) => sale.paymentMethod === method),
  );
  const expensesFor = (method: 'cash' | 'card' | 'bank_transfer' | 'other') => sumAmounts(
    expenses.filter((expense) => expense.paymentMethod === method),
  );
  const breakdownFor = (method: 'cash' | 'card' | 'bank_transfer' | 'other') => createDayCloseMethodBreakdown({
    collections: paymentIncomeFor(method) + salesFor(method),
    refunds: paymentRefundsFor(method),
    expenses: expensesFor(method),
  });

  const breakdown: DayCloseBreakdown = {
    cash: breakdownFor('cash'),
    card: breakdownFor('card'),
    bankTransfer: breakdownFor('bank_transfer'),
    other: breakdownFor('other'),
  };
  const expectedCash = input.openingCash + breakdown.cash.net;

  return {
    id: generateId(),
    businessDate: input.businessDate,
    openingCash: input.openingCash,
    expectedCash,
    actualCash: input.actualCash,
    difference: input.actualCash - expectedCash,
    breakdown,
    notes: input.notes?.trim() || undefined,
    status: 'closed',
    closedAt: new Date().toISOString(),
  };
}

export function closeDay(input: CloseDayInput): DayCloseRecord {
  const closings = getDayClosings();
  if (closings.some((closing) => closing.businessDate === input.businessDate && isActiveDayClosing(closing.status))) {
    throw new Error('تم إقفال هذه اليومية بالفعل.');
  }
  const closing = calculateDayClose(input);
  writeCollection(DAY_CLOSE_COLLECTION, [closing, ...closings]);
  recordAudit({
    action: 'close-day',
    entityType: 'daily-closing',
    entityId: closing.id,
    summary: `تم إقفال يومية ${closing.businessDate}.`,
    nextValues: { expectedCash: closing.expectedCash, actualCash: closing.actualCash, difference: closing.difference },
  });
  return closing;
}

export function reopenDay(id: string, reason: string): DayCloseRecord {
  const closings = getDayClosings();
  const closing = closings.find((item) => item.id === id);
  const normalizedReason = reason.trim();
  if (!closing) throw new Error('اليومية المحددة غير موجودة.');
  if (!isActiveDayClosing(closing.status)) throw new Error('تمت إعادة فتح هذه اليومية بالفعل.');
  if (!normalizedReason) throw new Error('سبب إعادة فتح اليومية مطلوب لحفظ سجل واضح.');

  const reopened: DayCloseRecord = {
    ...closing,
    status: 'reopened',
    reopenedAt: new Date().toISOString(),
    reopenReason: normalizedReason,
  };
  writeCollection(DAY_CLOSE_COLLECTION, closings.map((item) => (item.id === id ? reopened : item)));
  recordAudit({
    action: 'reopen-day',
    entityType: 'daily-closing',
    entityId: closing.id,
    summary: `تمت إعادة فتح يومية ${closing.businessDate}.`,
    previousValues: { status: closing.status },
    nextValues: { status: reopened.status, reason: normalizedReason },
  });
  return reopened;
}
