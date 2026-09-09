/**
 * A percentage reads in the same numerals as the money beside it — a card that
 * says «٥٠ ر.ع.» then «خصم 30%» looks like two different systems arguing.
 */
export function formatPercentOMR(value: number, maximumFractionDigits = 0): string {
  return `${new Intl.NumberFormat('ar-OM', { maximumFractionDigits }).format(value)}٪`;
}

export function formatMoneyOMR(value: number, minimumFractionDigits = 3): string {
  return new Intl.NumberFormat('ar-OM', {
    style: 'currency',
    currency: 'OMR',
    minimumFractionDigits,
  }).format(value);
}
