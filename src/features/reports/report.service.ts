import { getExpenses } from '../expenses/expense.service';
import { getPayments } from '../payments/payment.service';
import { reportMockCustomers, reportMockDresses, reportMockReservations } from './report.mock';
import type {
  CustomerBalanceRow,
  DateRangeApplied,
  DressPerformanceRow,
  FinancialSummary,
  ReportSummary,
  TodayReport,
} from './report.types';

const TODAY_DATE = '2026-05-19';
const activeReservationStatuses = new Set(['pending', 'confirmed', 'delivered', 'overdue']);

export function formatReportMoney(amount: number): string {
  return new Intl.NumberFormat('ar-OM', {
    style: 'currency',
    currency: 'OMR',
    minimumFractionDigits: 2,
  }).format(amount);
}

export function getFinancialSummary(): FinancialSummary {
  const payments = getPayments();
  const expenses = getExpenses();

  const totalCollected = payments
    .filter((payment) => payment.direction === 'income')
    .reduce((sum, payment) => sum + payment.amount, 0);

  const totalRefunded = payments
    .filter((payment) => payment.direction === 'refund')
    .reduce((sum, payment) => sum + payment.amount, 0);

  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const netAmount = totalCollected - totalRefunded - totalExpenses;

  return { totalCollected, totalRefunded, totalExpenses, netAmount };
}

export function getCustomerBalances(): CustomerBalanceRow[] {
  return reportMockCustomers.filter((customer) => customer.remainingBalance > 0);
}

function isInRange(date: string, range?: DateRangeApplied): boolean {
  if (!range) {
    return true;
  }

  const hasFrom = Boolean(range.from);
  const hasTo = Boolean(range.to);

  if (hasFrom && range.from && date < range.from) {
    return false;
  }

  if (hasTo && range.to && date > range.to) {
    return false;
  }

  return true;
}

export function getFilteredReservationsCount(range?: DateRangeApplied): number {
  return reportMockReservations.filter((reservation) => isInRange(reservation.pickupDate, range) || isInRange(reservation.returnDate, range)).length;
}

export function getDressPerformance(): DressPerformanceRow[] {
  return [...reportMockDresses].sort((a, b) => b.timesRented - a.timesRented);
}

export function getTodayReport(): TodayReport {
  const payments = getPayments();
  const expenses = getExpenses();

  const pickupsToday = reportMockReservations.filter((reservation) => reservation.pickupDate === TODAY_DATE).length;
  const returnsToday = reportMockReservations.filter((reservation) => reservation.returnDate === TODAY_DATE).length;

  const paymentsToday = payments
    .filter((payment) => payment.paymentDate === TODAY_DATE)
    .reduce((sum, payment) => sum + payment.amount, 0);

  const expensesToday = expenses
    .filter((expense) => expense.expenseDate === TODAY_DATE)
    .reduce((sum, expense) => sum + expense.amount, 0);

  return { date: TODAY_DATE, pickupsToday, returnsToday, paymentsToday, expensesToday };
}

export function getReportSummary(): ReportSummary {
  const financial = getFinancialSummary();

  return {
    totalDresses: reportMockDresses.length,
    activeReservations: reportMockReservations.filter((reservation) => activeReservationStatuses.has(reservation.status)).length,
    totalCollected: financial.totalCollected,
    totalExpenses: financial.totalExpenses,
    netAmount: financial.netAmount,
    customersWithBalance: getCustomerBalances().length,
  };
}
