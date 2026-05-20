export function formatMoneyByLocale(amount: number, locale: string = 'ar-OM'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'OMR',
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatDateByLocale(date: string, locale: string = 'ar-OM'): string {
  return new Date(date).toLocaleDateString(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}
