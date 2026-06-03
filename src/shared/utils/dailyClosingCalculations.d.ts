export type DayCloseMethodBreakdownInput = {
  collections: number;
  refunds: number;
  expenses: number;
};

export type CalculatedDayCloseMethodBreakdown = DayCloseMethodBreakdownInput & {
  net: number;
};

export function createDayCloseMethodBreakdown(
  input: DayCloseMethodBreakdownInput,
): CalculatedDayCloseMethodBreakdown;

export function isActiveDayClosing(status?: 'closed' | 'reopened'): boolean;
