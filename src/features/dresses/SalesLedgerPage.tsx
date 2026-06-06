import { useMemo, useState } from 'react';
import { Eye, Plus, Printer, RotateCcw, Search } from 'lucide-react';
import { PageHeader } from '../../components/shared/PageHeader';
import { getTodayISO } from '../../shared/utils/date';
import { formatMoneyOMR } from '../../shared/utils/format';
import { CreateSaleInvoiceModal } from './CreateSaleInvoiceModal';
import { printSaleInvoice } from './printSaleInvoice';
import { getSaleInvoices, getSaleReturns, recordSaleReturn, type SaleInvoice } from './salesLedger.service';

type Filters = { search: string; from: string; to: string; paymentMethod: 'all' | SaleInvoice['paymentMethod'] };
const paymentLabels: Record<SaleInvoice['paymentMethod'], string> = { cash: 'نقداً', card: 'بطاقة', bank_transfer: 'تحويل بنكي', other: 'أخرى' };
const field = 'h-12 w-full rounded-xl border border-slate-200 bg-stone-50 px-3 text-sm outline-none transition focus-visible:border-amber-500 focus-visible:ring-2 focus-visible:ring-amber-500/30';

function filterInvoices(invoices: SaleInvoice[], filters: Filters): SaleInvoice[] {
  const search = filters.search.trim().toLowerCase();
  return invoices.filter((invoice) => {
    const matchesSearch = !search || invoice.invoiceNumber.toLowerCase().includes(search) || invoice.customerName.toLowerCase().includes(search) || invoice.customerPhone?.toLowerCase().includes(search) || invoice.lines.some((line) => line.dressCode.toLowerCase().includes(search) || line.dressName.toLowerCase().includes(search));
    const matchesDate = (!filters.from || invoice.saleDate >= filters.from) && (!filters.to || invoice.saleDate <= filters.to);
    const matchesPayment = filters.paymentMethod === 'all' || invoice.paymentMethod === filters.paymentMethod;
    return matchesSearch && matchesDate && matchesPayment;
  });
}

export function SalesLedgerPage() {
  const [invoices, setInvoices] = useState(() => getSaleInvoices());
  const [returns, setReturns] = useState(() => getSaleReturns());
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>({ search: '', from: '', to: '', paymentMethod: 'all' });
  const [feedback, setFeedback] = useState<string | null>(null);
  const filteredInvoices = useMemo(() => filterInvoices(invoices, filters), [invoices, filters]);

  function returnLine(invoice: SaleInvoice, dressCode: string) {
    const reason = window.prompt('سبب المرتجع اختياري:') ?? undefined;
    try {
      const created = recordSaleReturn({ invoiceNumber: invoice.invoiceNumber, dressCode, returnDate: getTodayISO(), reason });
      setReturns(getSaleReturns());
      setInvoices(getSaleInvoices());
      setFeedback(`تم تسجيل المرتجع ${created.returnNumber} وتحويل الفستان للفحص قبل إتاحته.`);
    } catch (error: unknown) {
      setFeedback(error instanceof Error ? error.message : 'تعذر تسجيل المرتجع.');
    }
  }

  return <section className="space-y-6">
    <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between"><PageHeader eyebrow="المبيعات" title="سجل المبيعات والفواتير" description="إنشاء فاتورة متعددة البنود، حفظ snapshots تاريخية، طباعة الفاتورة، وتسجيل مرتجع آمن للفحص." /><button type="button" onClick={() => setOpen(true)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white"><Plus className="h-5 w-5" />فاتورة جديدة</button></div>
    {feedback && <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900">{feedback}</div>}
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="grid gap-3 lg:grid-cols-[1fr_160px_160px_180px]"><label className="relative"><Search className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" /><input type="search" value={filters.search} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} placeholder="رقم الفاتورة، العميلة، الهاتف، أو كود الفستان" className={`${field} pr-11`} /></label><input aria-label="من تاريخ" type="date" value={filters.from} onChange={(event) => setFilters((current) => ({ ...current, from: event.target.value }))} className={field} /><input aria-label="إلى تاريخ" type="date" value={filters.to} onChange={(event) => setFilters((current) => ({ ...current, to: event.target.value }))} className={field} /><select value={filters.paymentMethod} onChange={(event) => setFilters((current) => ({ ...current, paymentMethod: event.target.value as Filters['paymentMethod'] }))} className={field}><option value="all">كل وسائل الدفع</option>{Object.entries(paymentLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div></div>
    {filteredInvoices.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">لا توجد فواتير مبيعات مطابقة للفلاتر الحالية.</div> : <div className="space-y-4">{filteredInvoices.map((invoice) => <article key={invoice.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-bold text-slate-400">{invoice.invoiceNumber}</p><h2 className="mt-1 text-lg font-bold">{invoice.customerName}</h2><p className="mt-1 text-sm text-slate-500">{invoice.saleDate} · {paymentLabels[invoice.paymentMethod]} · {formatMoneyOMR(invoice.totalAmount)}</p><p className="mt-1 text-xs font-bold text-amber-700">{invoice.status === 'completed' ? 'مكتملة' : invoice.status === 'partially_returned' ? 'مرتجع جزئي' : invoice.status === 'returned' ? 'مرتجعة بالكامل' : 'ملغاة'}</p></div><div className="flex flex-wrap gap-2"><button type="button" onClick={() => setExpanded((current) => current === invoice.id ? null : invoice.id)} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-300 px-3 text-sm font-bold"><Eye className="h-4 w-4" />التفاصيل</button><button type="button" onClick={() => printSaleInvoice(invoice)} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-300 px-3 text-sm font-bold"><Printer className="h-4 w-4" />طباعة</button></div></div>{expanded === invoice.id && <div className="mt-4 rounded-2xl bg-stone-50 p-4"><div className="grid gap-2 text-sm sm:grid-cols-3"><p><b>الإجمالي قبل الخصم:</b> {formatMoneyOMR(invoice.subtotal)}</p><p><b>الخصم:</b> {formatMoneyOMR(invoice.discountAmount)}</p><p><b>الصافي:</b> {formatMoneyOMR(invoice.totalAmount)}</p></div></div>}<div className="mt-4 space-y-2">{invoice.lines.map((line) => { const returned = returns.some((item) => item.invoiceNumber === invoice.invoiceNumber && item.dressCode === line.dressCode); return <div key={line.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-stone-50 p-3 text-sm"><div><b dir="ltr">{line.dressCode}</b><span className="mr-2">{line.dressName}</span>{line.dressSize && <span className="mr-2 text-xs text-slate-500">{line.dressSize} · {line.dressColor}</span>}</div><div className="flex items-center gap-3"><b>{formatMoneyOMR(line.amount)}</b>{returned ? <span className="text-xs font-bold text-rose-700">تم المرتجع</span> : <button type="button" onClick={() => returnLine(invoice, line.dressCode)} className="inline-flex items-center gap-1 text-xs font-bold text-rose-700"><RotateCcw className="h-4 w-4" />مرتجع</button>}</div></div>; })}</div></article>)}</div>}
    <CreateSaleInvoiceModal open={open} onClose={() => setOpen(false)} onCreated={(invoice) => { setInvoices((current) => [invoice, ...current]); setFeedback(`تم حفظ الفاتورة ${invoice.invoiceNumber}.`); }} />
  </section>;
}
