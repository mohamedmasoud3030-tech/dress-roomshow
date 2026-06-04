import { loadLocalDocuments, saveLocalDocument } from '../../services/localDatabase';
import { getTodayISO } from '../../shared/utils/date';
import type { Dress } from './dress.types';
import type { SaleInvoice, SaleInvoiceItem, SaleReturn, SalesLedgerSummary } from './salesLedger.types';
import { validateInvoiceDraft } from './salesLedger.validation';

const invoicesKey = 'dress-roomshow:sales-invoices';
const returnsKey = 'dress-roomshow:sales-returns';

function readJsonArray<T>(key: string): T[] {
  if (typeof window === 'undefined') return [];
  const raw = window.localStorage.getItem(key);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function writeJsonArray<T>(key: string, rows: T[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(key, JSON.stringify(rows));
}

const makeId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export function getSalesInvoices(): SaleInvoice[] {
  return readJsonArray<SaleInvoice>(invoicesKey);
}

export function getSalesReturns(): SaleReturn[] {
  return readJsonArray<SaleReturn>(returnsKey);
}

export async function getSalesInvoicesFromLocalDb(): Promise<SaleInvoice[] | null> {
  try {
    return await loadLocalDocuments<SaleInvoice>('sales-invoices');
  } catch {
    return null;
  }
}

export async function getSalesReturnsFromLocalDb(): Promise<SaleReturn[] | null> {
  try {
    return await loadLocalDocuments<SaleReturn>('sales-returns');
  } catch {
    return null;
  }
}

export { validateInvoiceDraft } from './salesLedger.validation';

export async function createSaleInvoice(input: {
  customerName: string;
  customerPhone: string;
  invoiceDate: string;
  paymentMethod: SaleInvoice['paymentMethod'];
  items: SaleInvoiceItem[];
  notes?: string;
  dresses: Dress[];
}): Promise<SaleInvoice> {
  const errors = validateInvoiceDraft(input);
  if (errors.length > 0) throw new Error(errors.join('\n'));

  const invoice: SaleInvoice = {
    id: makeId('sale-invoice'),
    invoiceNumber: `SI-${Date.now()}`,
    customerName: input.customerName.trim(),
    customerPhone: input.customerPhone.trim(),
    invoiceDate: input.invoiceDate,
    paymentMethod: input.paymentMethod,
    items: input.items,
    subtotal: input.items.reduce((sum, item) => sum + item.unitPrice, 0),
    notes: input.notes?.trim() || undefined,
    createdAt: new Date().toISOString(),
  };

  const invoices = [invoice, ...getSalesInvoices()];
  writeJsonArray(invoicesKey, invoices);
  await saveLocalDocument('sales-invoices', invoice.id, invoice);
  return invoice;
}

export async function createSaleReturn(input: {
  invoice: SaleInvoice;
  dressCode: string;
  returnDate: string;
  reason: string;
}): Promise<SaleReturn> {
  const today = getTodayISO();
  const item = input.invoice.items.find((candidate) => candidate.dressCode === input.dressCode);
  if (!item) throw new Error('لا يمكن تسجيل مرتجع لبند غير موجود في الفاتورة.');
  if (!input.returnDate || input.returnDate > today || input.returnDate < input.invoice.invoiceDate) {
    throw new Error('تاريخ المرتجع غير صالح.');
  }
  if (getSalesReturns().some((row) => row.invoiceId === input.invoice.id && row.dressCode === input.dressCode)) {
    throw new Error('تم تسجيل مرتجع لهذا البند مسبقاً.');
  }

  const record: SaleReturn = {
    id: makeId('sale-return'),
    returnNumber: `SR-${Date.now()}`,
    invoiceId: input.invoice.id,
    invoiceNumber: input.invoice.invoiceNumber,
    dressCode: item.dressCode,
    dressName: item.dressName,
    amount: item.unitPrice,
    returnDate: input.returnDate,
    reason: input.reason.trim() || 'مرتجع مبيعات',
    createdAt: new Date().toISOString(),
  };

  const returns = [record, ...getSalesReturns()];
  writeJsonArray(returnsKey, returns);
  await saveLocalDocument('sales-returns', record.id, record);
  return record;
}

export function summarizeSalesLedger(invoices: SaleInvoice[], returns: SaleReturn[]): SalesLedgerSummary {
  const grossSales = invoices.reduce((sum, invoice) => sum + invoice.subtotal, 0);
  const returnsTotal = returns.reduce((sum, record) => sum + record.amount, 0);
  return {
    invoicesCount: invoices.length,
    grossSales,
    returnsTotal,
    netSales: grossSales - returnsTotal,
  };
}
