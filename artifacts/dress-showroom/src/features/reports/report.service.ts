import { db_getCustomers, db_getDresses, db_getExpenses, db_getPayments, db_getReservations } from '../../services/localDatabase';
import { getTodayISO } from '../../shared/utils/date';
import type {
  CustomerBalanceRow,
  DressPerformanceRow,
  FinancialSummary,
  ReportSummary,
  TodayReport,
} from './report.types';

const activeStatuses = new Set(['pending', 'confirmed', 'delivered', 'overdue']);

export function formatReportMoney(amount: number): string {
  return new Intl.NumberFormat('ar-OM', {
    style: 'currency',
    currency: 'OMR',
    minimumFractionDigits: 3,
  }).format(amount);
}

export function getFinancialSummary(): FinancialSummary {
  const payments = db_getPayments();
  const expenses = db_getExpenses();
  const totalCollected = payments.filter((p) => p.direction === 'income').reduce((s, p) => s + p.amount, 0);
  const totalRefunded = payments.filter((p) => p.direction === 'refund').reduce((s, p) => s + p.amount, 0);
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  return { totalCollected, totalRefunded, totalExpenses, netAmount: totalCollected - totalRefunded - totalExpenses };
}

export function getCustomerBalances(): CustomerBalanceRow[] {
  return db_getCustomers()
    .filter((c) => c.remainingBalance > 0)
    .map((c) => ({ id: c.id, name: c.name, phone: c.phone, remainingBalance: c.remainingBalance }));
}

export function getDressPerformance(): DressPerformanceRow[] {
  return [...db_getDresses()]
    .sort((a, b) => b.timesRented - a.timesRented)
    .map((d) => ({ id: d.id, code: d.code, name: d.name, timesRented: d.timesRented, status: d.status }));
}

export function getTodayReport(): TodayReport {
  const today = getTodayISO();
  const reservations = db_getReservations();
  const payments = db_getPayments();
  const expenses = db_getExpenses();

  return {
    date: today,
    pickupsToday: reservations.filter((r) => r.pickupDate === today).length,
    returnsToday: reservations.filter((r) => r.returnDate === today).length,
    paymentsToday: payments.filter((p) => p.paymentDate === today).reduce((s, p) => s + p.amount, 0),
    expensesToday: expenses.filter((e) => e.expenseDate === today).reduce((s, e) => s + e.amount, 0),
  };
}

export function getReportSummary(): ReportSummary {
  const dresses = db_getDresses();
  const reservations = db_getReservations();
  const customers = db_getCustomers();
  const financial = getFinancialSummary();
  return {
    totalDresses: dresses.length,
    activeReservations: reservations.filter((r) => activeStatuses.has(r.status)).length,
    totalCollected: financial.totalCollected,
    totalExpenses: financial.totalExpenses,
    netAmount: financial.netAmount,
    customersWithBalance: customers.filter((c) => c.remainingBalance > 0).length,
  };
}
