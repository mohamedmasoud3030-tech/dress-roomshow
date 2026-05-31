import { getTodayISO } from '../../shared/utils/date';
import { formatMoneyOMR } from '../../shared/utils/format';
import { getExpenses } from '../expenses/expense.service';
import { getPayments } from '../payments/payment.service';
import { reportMockCustomers, reportMockDresses, reportMockReservations } from './report.mock';
import type {
  CustomerBalanceRow,
  DressPerformanceRow,
  FinancialSummary,
  ReportSummary,
  TodayReport,
} from './report.types';

const activeReservationStatuses = new Set(['pending', 'confirmed', 'delivered', 'overdue']);

export function formatReportMoney(amount: number): string {
  return formatMoneyOMR(amount, 2);
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

export function getDressPerformance(): DressPerformanceRow[] {
  return [...reportMockDresses].sort((a, b) => b.timesRented - a.timesRented);
}

export function getTodayReport(): TodayReport {
  const todayDate = getTodayISO();
  const payments = getPayments();
  const expenses = getExpenses();

  const pickupsToday = reportMockReservations.filter((reservation) => reservation.pickupDate === todayDate).length;
  const returnsToday = reportMockReservations.filter((reservation) => reservation.returnDate === todayDate).length;

  const paymentsToday = payments
    .filter((payment) => payment.paymentDate === todayDate)
    .reduce((sum, payment) => sum + payment.amount, 0);

  const expensesToday = expenses
    .filter((expense) => expense.expenseDate === todayDate)
    .reduce((sum, expense) => sum + expense.amount, 0);

  return { date: todayDate, pickupsToday, returnsToday, paymentsToday, expensesToday };
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
