export function formatMoneyOMR(value: number, minimumFractionDigits = 3): string {
  return new Intl.NumberFormat('ar-OM', {
    style: 'currency',
    currency: 'OMR',
    minimumFractionDigits,
  }).format(value);
}
