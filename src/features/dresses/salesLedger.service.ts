import { generateId, generateNumber, readCollection, writeCollection } from '../../services/localDatabase';
import { getTodayISO } from '../../shared/utils/date';
import { recordAudit } from '../audit/audit.service';
import { assertBusinessDateOpen } from '../integrity/integrity.service';
import { updateDressStatus } from './dress.service';
import { getSaleableDresses, getSales, type SalePaymentMethod, type SaleRecord } from './sale.service';

export type SaleInvoiceLine = { id: string; dressCode: string; dressName: string; dressDescription?: string; dressCategory?: string; dressSize?: string; dressColor?: string; amount: number };
export type SaleInvoice = { id: string; invoiceNumber: string; saleDate: string; createdAt: string; customerId?: string; customerName: string; customerPhone?: string; paymentMethod: SalePaymentMethod; lines: SaleInvoiceLine[]; subtotal: number; discountAmount: number; totalAmount: number; status: 'completed' | 'partially_returned' | 'returned' | 'void'; notes?: string; auditTrail: Array<{ timestamp: string; action: string; summary: string }> };
export type SaleReturnRecord = { id: string; returnNumber: string; invoiceNumber: string; returnDate: string; dressCode: string; dressName: string; amount: number; refundAmount: number; paymentMethod: SalePaymentMethod; reason?: string; notes?: string };
type InvoiceInput = { saleDate: string; customerId?: string; customerName: string; customerPhone?: string; paymentMethod: SalePaymentMethod; lines: Array<{ dressCode: string; amount: number }>; discountAmount?: number; notes?: string };
type ReturnInput = { invoiceNumber: string; dressCode: string; returnDate: string; reason?: string; notes?: string };

const INVOICE_COLLECTION = 'sales-invoices';
const RETURN_COLLECTION = 'sales-returns';

function normalizeInvoice(invoice: SaleInvoice): SaleInvoice {
  const subtotal = invoice.subtotal ?? invoice.totalAmount ?? invoice.lines.reduce((sum, line) => sum + line.amount, 0);
  const discountAmount = invoice.discountAmount ?? 0;
  return { ...invoice, createdAt: invoice.createdAt ?? `${invoice.saleDate}T00:00:00.000Z`, subtotal, discountAmount, totalAmount: invoice.totalAmount ?? subtotal - discountAmount, status: invoice.status ?? 'completed', auditTrail: invoice.auditTrail ?? [] };
}

export function getSaleInvoices(): SaleInvoice[] { return readCollection<SaleInvoice>(INVOICE_COLLECTION, []).map(normalizeInvoice); }
export function getSaleReturns(): SaleReturnRecord[] { return readCollection<SaleReturnRecord>(RETURN_COLLECTION, []); }

export function createSaleInvoice(input: InvoiceInput): SaleInvoice {
  const customerName = input.customerName.trim();
  if (!customerName) throw new Error('اسم العميلة مطلوب.');
  if (!input.saleDate || input.saleDate > getTodayISO()) throw new Error('تاريخ البيع غير صالح.');
  if (input.lines.length === 0) throw new Error('أضيفي فستاناً واحداً على الأقل للفاتورة.');
  const discountAmount = Number(input.discountAmount ?? 0);
  if (!Number.isFinite(discountAmount) || discountAmount < 0) throw new Error('قيمة الخصم غير صالحة.');
  assertBusinessDateOpen(input.saleDate);
  const saleable = new Map(getSaleableDresses().map((dress) => [dress.code, dress]));
  const codes = new Set<string>();
  const lines = input.lines.map((line) => {
    const dress = saleable.get(line.dressCode);
    if (!dress || codes.has(line.dressCode)) throw new Error('توجد بنود غير متاحة للبيع أو مكررة.');
    if (!Number.isFinite(line.amount) || line.amount <= 0) throw new Error('قيمة أحد بنود الفاتورة غير صالحة.');
    codes.add(line.dressCode);
    return { id: generateId(), dressCode: dress.code, dressName: dress.name, dressDescription: dress.description, dressCategory: dress.category, dressSize: dress.size, dressColor: dress.color, amount: line.amount };
  });
  const subtotal = lines.reduce((sum, line) => sum + line.amount, 0);
  if (discountAmount > subtotal) throw new Error('قيمة الخصم تتجاوز إجمالي الفاتورة.');
  const invoice: SaleInvoice = { id: generateId(), invoiceNumber: generateNumber('INV'), saleDate: input.saleDate, createdAt: new Date().toISOString(), customerId: input.customerId, customerName, customerPhone: input.customerPhone?.trim() || undefined, paymentMethod: input.paymentMethod, lines, subtotal, discountAmount, totalAmount: subtotal - discountAmount, status: 'completed', notes: input.notes?.trim() || undefined, auditTrail: [{ timestamp: new Date().toISOString(), action: 'create', summary: 'تم إنشاء الفاتورة.' }] };
  const sales: SaleRecord[] = lines.map((line) => ({ id: generateId(), saleNumber: generateNumber('SAL'), invoiceNumber: invoice.invoiceNumber, saleDate: invoice.saleDate, dressCode: line.dressCode, dressName: line.dressName, customerName: invoice.customerName, customerPhone: invoice.customerPhone, amount: line.amount, paymentMethod: invoice.paymentMethod, notes: invoice.notes }));
  writeCollection(INVOICE_COLLECTION, [invoice, ...getSaleInvoices()]);
  writeCollection('sales', [...sales, ...getSales()]);
  lines.forEach((line) => updateDressStatus(line.dressCode, 'sold'));
  recordAudit({ action: 'sale', entityType: 'sale', entityId: invoice.id, summary: `تم تسجيل الفاتورة ${invoice.invoiceNumber} بعدد ${lines.length} بنود.`, nextValues: { totalAmount: invoice.totalAmount, paymentMethod: invoice.paymentMethod } });
  return invoice;
}

export function recordSaleReturn(input: ReturnInput): SaleReturnRecord {
  const invoice = getSaleInvoices().find((item) => item.invoiceNumber === input.invoiceNumber);
  const line = invoice?.lines.find((item) => item.dressCode === input.dressCode);
  if (!invoice || !line) throw new Error('بند الفاتورة المحدد غير موجود.');
  if (!input.returnDate || input.returnDate > getTodayISO() || input.returnDate < invoice.saleDate) throw new Error('تاريخ المرتجع غير صالح.');
  if (getSaleReturns().some((item) => item.invoiceNumber === invoice.invoiceNumber && item.dressCode === line.dressCode)) throw new Error('تم تسجيل مرتجع لهذا البند بالفعل.');
  assertBusinessDateOpen(input.returnDate);
  const saleReturn: SaleReturnRecord = { id: generateId(), returnNumber: generateNumber('RET'), invoiceNumber: invoice.invoiceNumber, returnDate: input.returnDate, dressCode: line.dressCode, dressName: line.dressName, amount: line.amount, refundAmount: line.amount, paymentMethod: invoice.paymentMethod, reason: input.reason?.trim() || undefined, notes: input.notes?.trim() || undefined };
  const nextReturns = [saleReturn, ...getSaleReturns()];
  writeCollection(RETURN_COLLECTION, nextReturns);
  updateDressStatus(line.dressCode, 'maintenance');
  const returnedCodes = new Set(nextReturns.filter((item) => item.invoiceNumber === invoice.invoiceNumber).map((item) => item.dressCode));
  const nextInvoice = { ...invoice, status: invoice.lines.every((item) => returnedCodes.has(item.dressCode)) ? 'returned' as const : 'partially_returned' as const, auditTrail: [...invoice.auditTrail, { timestamp: new Date().toISOString(), action: 'return', summary: `تم تسجيل مرتجع للفستان ${line.dressCode}.` }] };
  writeCollection(INVOICE_COLLECTION, getSaleInvoices().map((item) => item.id === invoice.id ? nextInvoice : item));
  recordAudit({ action: 'refund', entityType: 'sale', entityId: saleReturn.id, summary: `تم تسجيل المرتجع ${saleReturn.returnNumber} للفاتورة ${invoice.invoiceNumber}.`, nextValues: { amount: saleReturn.amount, dressCode: saleReturn.dressCode } });
  return saleReturn;
}
