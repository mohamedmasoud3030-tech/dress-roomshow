import { getTodayISO } from '../../shared/utils/date';
import { formatMoneyOMR } from '../../shared/utils/format';
import { getCustomers } from '../customers/customer.service';
import { getDresses } from '../dresses/dress.service';
import { getSales } from '../dresses/sale.service';
import { getExpenses } from '../expenses/expense.service';
import { getPayments } from '../payments/payment.service';
import { getReservations } from '../reservations/reservation.service';
import type {
  CustomerBalanceRow,
  DateRangeFilter,
  DressPerformanceRow,
  FinancialSummary,
  ReportSummary,
  TodayReport,
} from './report.types';

const activeReservationStatuses = new Set(['pending', 'confirmed', 'delivered', 'overdue']);

function isWithinRange(date: string, range?: DateRangeFilter): boolean {
  if (!range) return true;
  if (range.from && date < range.from) return false;
  if (range.to && date > range.to) return false;
  return true;
}

export function formatReportMoney(amount: number): string {
  return formatMoneyOMR(amount, 2);
}

export function getFinancialSummary(range?: DateRangeFilter): FinancialSummary {
  const payments = getPayments().filter((payment) => isWithinRange(payment.paymentDate, range));
  const sales = getSales().filter((sale) => isWithinRange(sale.saleDate, range));
  const expenses = getExpenses().filter((expense) => isWithinRange(expense.expenseDate, range));

  const totalCollected = payments
    .filter((payment) => payment.direction === 'income')
    .reduce((sum, payment) => sum + payment.amount, 0)
    + sales.reduce((sum, sale) => sum + sale.amount, 0);

  const totalRefunded = payments
    .filter((payment) => payment.direction === 'refund')
    .reduce((sum, payment) => sum + payment.amount, 0);

  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const netAmount = totalCollected - totalRefunded - totalExpenses;

  return { totalCollected, totalRefunded, totalExpenses, netAmount };
}

export function getCustomerBalances(): CustomerBalanceRow[] {
  return getCustomers()
    .filter((customer) => customer.remainingBalance > 0)
    .map(({ id, name, phone, remainingBalance }) => ({ id, name, phone, remainingBalance }));
}

export function getDressPerformance(): DressPerformanceRow[] {
  return getDresses()
    .map(({ id, code, name, timesRented, status }) => ({ id, code, name, timesRented, status }))
    .sort((a, b) => b.timesRented - a.timesRented);
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
