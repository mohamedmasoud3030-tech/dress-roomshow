export function formatMoneyOMR(value, minimumFractionDigits = 3) {
  return new Intl.NumberFormat('ar-OM', {
    style: 'currency',
    currency: 'OMR',
    minimumFractionDigits,
  }).format(value);
}
