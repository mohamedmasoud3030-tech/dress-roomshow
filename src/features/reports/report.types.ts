import type { DressStatus } from '../dresses/dress.types';

export type ReportSummary = {
  totalDresses: number;
  activeReservations: number;
  totalCollected: number;
  totalExpenses: number;
  netAmount: number;
  customersWithBalance: number;
};

export type TodayReport = {
  date: string;
  pickupsToday: number;
  returnsToday: number;
  paymentsToday: number;
  expensesToday: number;
};

export type DressPerformanceRow = {
  id: string;
  code: string;
  name: string;
  timesRented: number;
  status: DressStatus;
  rentalRevenue: number;
  salesRevenue: number;
  relatedExpenses: number;
  totalRevenue: number;
  netResult: number;
  inactivityDays: number | null;
  requiresReview: boolean;
};

export type CustomerBalanceRow = {
  id: string;
  name: string;
  phone: string;
  remainingBalance: number;
};

export type FinancialSummary = {
  rentalCollected: number;
  salesCollected: number;
  totalCollected: number;
  totalRefunded: number;
  totalExpenses: number;
  netAmount: number;
};

export type DateRangeFilter = {
  from: string;
  to: string;
};
