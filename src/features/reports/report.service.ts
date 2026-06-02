import { generateId, readCollection, writeCollection } from '../../services/localDatabase';
import { getTodayISO } from '../../shared/utils/date';
import { formatMoneyOMR } from '../../shared/utils/format';
import { recordAudit } from '../audit/audit.service';
import { getCustomers } from '../customers/customer.service';
import { getDresses } from '../dresses/dress.service';
import { getSales } from '../dresses/sale.service';
import { getExpenses } from '../expenses/expense.service';
import { getPayments } from '../payments/payment.service';
import { getReservations } from '../reservations/reservation.service';
import type {
  CloseDayInput,
  CustomerBalanceRow,
  DateRangeFilter,
  DayCloseBreakdown,
  DayCloseRecord,
  DressPerformanceRow,
  FinancialSummary,
  ReportSummary,
  TodayReport,
} from './report.types';

const activeReservationStatuses = new Set(['pending', 'confirmed', 'delivered', 'overdue']);
const DORMANT_DRESS_DAYS = 90;
const DAY_CLOSE_COLLECTION = 'daily-closings';

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

export function formatReportMoney(amount: number): string {
  return formatMoneyOMR(amount, 2);
}

export function getFinancialSummary(range?: DateRangeFilter): FinancialSummary {
  const payments = getPayments().filter((payment) => isWithinRange(payment.paymentDate, range));
  const sales = getSales().filter((sale) => isWithinRange(sale.saleDate, range));
  const expenses = getExpenses().filter((expense) => isWithinRange(expense.expenseDate, range));

  const rentalCollected = payments
    .filter((payment) => payment.direction === 'income')
    .reduce((sum, payment) => sum + payment.amount, 0);
  const salesCollected = sales.reduce((sum, sale) => sum + sale.amount, 0);
  const totalCollected = rentalCollected + salesCollected;
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
      const requiresReview =
        (inactivityDays !== null && inactivityDays >= DORMANT_DRESS_DAYS) || relatedExpenses > totalRevenue;

      return {
        id,
        code,
        name,
        timesRented,
        status,
        rentalRevenue,
        salesRevenue,
        relatedExpenses,
        totalRevenue,
        netResult,
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
    .reduce((sum, payment) => sum + (payment.direction === 'income' ? payment.amount : -payment.amount), 0)
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
  return readCollection<DayCloseRecord>(DAY_CLOSE_COLLECTION, []).sort((a, b) => b.businessDate.localeCompare(a.businessDate));
}

export function calculateDayClose(input: CloseDayInput): DayCloseRecord {
  if (!input.businessDate) throw new Error('تاريخ اليومية مطلوب.');
  if (input.businessDate > getTodayISO()) throw new Error('لا يمكن إقفال يومية بتاريخ مستقبلي.');
  if (!Number.isFinite(input.openingCash) || input.openingCash < 0) throw new Error('رصيد البداية غير صالح.');
  if (!Number.isFinite(input.actualCash) || input.actualCash < 0) throw new Error('الرصيد الفعلي غير صالح.');

  const payments = getPayments().filter((payment) => payment.paymentDate === input.businessDate);
  const sales = getSales().filter((sale) => sale.saleDate === input.businessDate);
  const expenses = getExpenses().filter((expense) => expense.expenseDate === input.businessDate);
  const paymentNetFor = (method: 'cash' | 'card' | 'bank_transfer' | 'other') => payments
    .filter((payment) => payment.method === method)
    .reduce((total, payment) => total + (payment.direction === 'income' ? payment.amount : -payment.amount), 0);
  const salesFor = (method: 'cash' | 'card' | 'bank_transfer' | 'other') => sumAmounts(sales.filter((sale) => sale.paymentMethod === method));
  const expensesFor = (method: 'cash' | 'card' | 'bank_transfer' | 'other') => sumAmounts(expenses.filter((expense) => expense.paymentMethod === method));

  const breakdown: DayCloseBreakdown = {
    cashIncome: paymentNetFor('cash') + salesFor('cash'),
    cashRefunds: sumAmounts(payments.filter((payment) => payment.method === 'cash' && payment.direction === 'refund')),
    cashExpenses: expensesFor('cash'),
    cardNet: paymentNetFor('card') + salesFor('card') - expensesFor('card'),
    bankTransferNet: paymentNetFor('bank_transfer') + salesFor('bank_transfer') - expensesFor('bank_transfer'),
    otherNet: paymentNetFor('other') + salesFor('other') - expensesFor('other'),
  };
  const expectedCash = input.openingCash + breakdown.cashIncome - breakdown.cashRefunds - breakdown.cashExpenses;

  return {
    id: generateId(),
    businessDate: input.businessDate,
    openingCash: input.openingCash,
    expectedCash,
    actualCash: input.actualCash,
    difference: input.actualCash - expectedCash,
    breakdown,
    notes: input.notes?.trim() || undefined,
    closedAt: new Date().toISOString(),
  };
}

export function closeDay(input: CloseDayInput): DayCloseRecord {
  const closings = getDayClosings();
  if (closings.some((closing) => closing.businessDate === input.businessDate)) throw new Error('تم إقفال هذه اليومية بالفعل.');
  const closing = calculateDayClose(input);
  writeCollection(DAY_CLOSE_COLLECTION, [closing, ...closings]);
  recordAudit({ action: 'close-day', entityType: 'daily-closing', entityId: closing.id, summary: `تم إقفال يومية ${closing.businessDate}.` });
  return closing;
}

export function reopenDay(id: string): void {
  const closings = getDayClosings();
  const closing = closings.find((item) => item.id === id);
  if (!closing) throw new Error('اليومية المحددة غير موجودة.');
  writeCollection(DAY_CLOSE_COLLECTION, closings.filter((item) => item.id !== id));
  recordAudit({ action: 'reopen-day', entityType: 'daily-closing', entityId: closing.id, summary: `تمت إعادة فتح يومية ${closing.businessDate}.` });
}
