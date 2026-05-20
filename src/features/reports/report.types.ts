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
  status: 'available' | 'reserved' | 'maintenance';
};

export type CustomerBalanceRow = {
  id: string;
  name: string;
  phone: string;
  remainingBalance: number;
};

export type FinancialSummary = {
  totalCollected: number;
  totalRefunded: number;
  totalExpenses: number;
  netAmount: number;
};

export type DateRangeFilter = {
  from: string;
  to: string;
};

export type DateRangeApplied = {
  from?: string;
  to?: string;
};
