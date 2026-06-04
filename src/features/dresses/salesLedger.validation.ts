import type { Dress } from './dress.types';
import type { SaleInvoiceItem } from './salesLedger.types';

function getTodayISO(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function validateInvoiceDraft(input: {
  customerName: string;
  invoiceDate: string;
  items: SaleInvoiceItem[];
  dresses: Dress[];
}): string[] {
  const errors: string[] = [];
  const today = getTodayISO();
  const seenCodes = new Set<string>();

  if (!input.customerName.trim()) errors.push('اسم العميلة مطلوب.');
  if (!input.invoiceDate) errors.push('تاريخ الفاتورة مطلوب.');
  if (input.invoiceDate > today) errors.push('لا يمكن إنشاء فاتورة بتاريخ مستقبلي.');
  if (input.items.length === 0) errors.push('لا يمكن إنشاء فاتورة بدون بنود.');

  input.items.forEach((item) => {
    const dress = input.dresses.find((candidate) => candidate.code === item.dressCode);
    if (seenCodes.has(item.dressCode)) errors.push(`الفستان ${item.dressCode} مكرر داخل الفاتورة.`);
    seenCodes.add(item.dressCode);
    if (!dress) errors.push(`الفستان ${item.dressCode} غير موجود.`);
    if (dress && (dress.status !== 'available' || !dress.isForSale)) errors.push(`الفستان ${dress.code} غير متاح للبيع.`);
    if (!Number.isFinite(item.unitPrice) || item.unitPrice <= 0) errors.push(`سعر ${item.dressCode} يجب أن يكون أكبر من صفر.`);
  });

  return errors;
}
