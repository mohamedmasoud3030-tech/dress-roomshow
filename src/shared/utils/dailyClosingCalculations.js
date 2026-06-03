function normalizeAmount(value) {
  return Number.isFinite(value) && value >= 0 ? value : 0;
}

export function createDayCloseMethodBreakdown(input) {
  const collections = normalizeAmount(input.collections);
  const refunds = normalizeAmount(input.refunds);
  const expenses = normalizeAmount(input.expenses);

  return {
    collections,
    refunds,
    expenses,
    net: collections - refunds - expenses,
  };
}

export function isActiveDayClosing(status) {
  return status !== 'reopened';
}
