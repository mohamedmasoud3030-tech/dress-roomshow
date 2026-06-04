import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '../../components/shared/PageHeader';
import { SimpleModal } from '../../components/shared/SimpleModal';
import { SummaryCard } from '../../components/shared/SummaryCard';
import { getTodayISO } from '../../shared/utils/date';
import { formatMoneyOMR } from '../../shared/utils/format';
import { getDresses, getDressesFromLocalDb } from './dress.service';
import type { Dress } from './dress.types';
import { printSaleInvoice } from './printSaleInvoice';
import {
  createSaleInvoice,
  createSaleReturn,
  getSalesInvoices,
  getSalesInvoicesFromLocalDb,
  getSalesReturns,
  getSalesReturnsFromLocalDb,
  summarizeSalesLedger,
} from './salesLedger.service';
import type { SaleInvoice, SaleInvoiceItem, SaleReturn } from './salesLedger.types';

type Draft = {
  customerName: string;
  customerPhone: string;
  invoiceDate: string;
  paymentMethod: SaleInvoice['paymentMethod'];
  dressCode: string;
  price: string;
  notes: string;
};

const initialDraft = (): Draft => ({
  customerName: '',
  customerPhone: '',
  invoiceDate: getTodayISO(),
  paymentMethod: 'cash',
  dressCode: '',
  price: '',
  notes: '',
});

export function SalesLedgerPage() {
  const [dresses, setDresses] = useState<Dress[]>(getDresses());
  const [invoices, setInvoices] = useState<SaleInvoice[]>(getSalesInvoices());
  const [returns, setReturns] = useState<SaleReturn[]>(getSalesReturns());
  const [draft, setDraft] = useState(initialDraft);
  const [items, setItems] = useState<SaleInvoiceItem[]>([]);
  const [error, setError] = useState('');
  const [returnInvoice, setReturnInvoice] = useState<SaleInvoice | null>(null);
  const [returnCode, setReturnCode] = useState('');

  useEffect(() => {
    void (async () => {
      const [localDresses, localInvoices, localReturns] = await Promise.all([
        getDressesFromLocalDb(),
        getSalesInvoicesFromLocalDb(),
        getSalesReturnsFromLocalDb(),
      ]);
      if (localDresses) setDresses(localDresses);
      if (localInvoices) setInvoices(localInvoices);
      if (localReturns) setReturns(localReturns);
    })();
  }, []);

  const saleableDresses = useMemo(
    () => dresses.filter((dress) => dress.status === 'available' && dress.isForSale),
    [dresses],
  );
  const summary = useMemo(() => summarizeSalesLedger(invoices, returns), [invoices, returns]);
  const selectedDress = saleableDresses.find((dress) => dress.code === draft.dressCode);

  const addItem = () => {
    setError('');
    if (!selectedDress) {
      setError('اختاري فستاناً متاحاً للبيع.');
      return;
    }
    if (items.some((item) => item.dressCode === selectedDress.code)) {
      setError('لا يمكن تكرار نفس الفستان داخل الفاتورة.');
      return;
    }
    const price = Number(draft.price || selectedDress.salePrice);
    if (!Number.isFinite(price) || price <= 0) {
      setError('قيمة البند يجب أن تكون أكبر من صفر.');
      return;
    }
    setItems((current) => [
      ...current,
      { id: `${selectedDress.code}-${Date.now()}`, dressCode: selectedDress.code, dressName: selectedDress.name, unitPrice: price },
    ]);
    setDraft((current) => ({ ...current, dressCode: '', price: '' }));
  };

  const submitInvoice = async () => {
    try {
      setError('');
      const invoice = await createSaleInvoice({ ...draft, items, dresses });
      setInvoices((current) => [invoice, ...current]);
      setItems([]);
      setDraft(initialDraft());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر إنشاء الفاتورة.');
    }
  };

  const submitReturn = async () => {
    if (!returnInvoice || !returnCode) return;
    if (!window.confirm('تأكيد تسجيل مرتجع لهذا البند وربطه بالفاتورة الأصلية؟')) return;
    try {
      const record = await createSaleReturn({
        invoice: returnInvoice,
        dressCode: returnCode,
        returnDate: getTodayISO(),
        reason: 'مرتجع من صفحة المبيعات',
      });
      setReturns((current) => [record, ...current]);
      setReturnInvoice(null);
      setReturnCode('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر تسجيل المرتجع.');
    }
  };

  return (
    <section className="space-y-6">
      <PageHeader eyebrow="المبيعات" title="المبيعات والفواتير" description="إنشاء فواتير بيع متعددة البنود وتسجيل المرتجعات المرتبطة بها." />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="عدد الفواتير" value={summary.invoicesCount} />
        <SummaryCard label="إجمالي المبيعات" value={formatMoneyOMR(summary.grossSales)} valueClassName="text-emerald-700" />
        <SummaryCard label="إجمالي المرتجعات" value={formatMoneyOMR(summary.returnsTotal)} valueClassName="text-rose-700" />
        <SummaryCard label="صافي المبيعات" value={formatMoneyOMR(summary.netSales)} valueClassName="text-[#8B5E3C]" />
      </div>

      <div className="grid gap-5 xl:grid-cols-[420px_1fr]">
        <div className="rounded-2xl border border-[#E8DED2] bg-white p-5 shadow-sm">
          <h3 className="text-lg font-bold">فاتورة جديدة</h3>
          <div className="mt-4 space-y-3">
            <input value={draft.customerName} onChange={(event) => setDraft((current) => ({ ...current, customerName: event.target.value }))} placeholder="اسم العميلة" className="w-full rounded-xl border border-[#E8DED2] bg-[#FAF7F2] px-3 py-2 text-sm" />
            <input value={draft.customerPhone} onChange={(event) => setDraft((current) => ({ ...current, customerPhone: event.target.value }))} placeholder="الهاتف" className="w-full rounded-xl border border-[#E8DED2] bg-[#FAF7F2] px-3 py-2 text-sm" />
            <div className="grid grid-cols-2 gap-2">
              <input type="date" value={draft.invoiceDate} onChange={(event) => setDraft((current) => ({ ...current, invoiceDate: event.target.value }))} className="rounded-xl border border-[#E8DED2] bg-[#FAF7F2] px-3 py-2 text-sm" />
              <select value={draft.paymentMethod} onChange={(event) => setDraft((current) => ({ ...current, paymentMethod: event.target.value as Draft['paymentMethod'] }))} className="rounded-xl border border-[#E8DED2] bg-[#FAF7F2] px-3 py-2 text-sm">
                <option value="cash">نقداً</option>
                <option value="card">بطاقة</option>
                <option value="bank_transfer">تحويل</option>
                <option value="other">أخرى</option>
              </select>
            </div>
            <div className="grid grid-cols-[1fr_120px] gap-2">
              <select value={draft.dressCode} onChange={(event) => setDraft((current) => ({ ...current, dressCode: event.target.value, price: saleableDresses.find((dress) => dress.code === event.target.value)?.salePrice.toString() ?? '' }))} className="rounded-xl border border-[#E8DED2] bg-[#FAF7F2] px-3 py-2 text-sm">
                <option value="">اختيار فستان متاح للبيع</option>
                {saleableDresses.map((dress) => <option key={dress.code} value={dress.code}>{dress.code} - {dress.name}</option>)}
              </select>
              <input type="number" min="0.001" step="0.001" value={draft.price} onChange={(event) => setDraft((current) => ({ ...current, price: event.target.value }))} placeholder="السعر" className="rounded-xl border border-[#E8DED2] bg-[#FAF7F2] px-3 py-2 text-sm" />
            </div>
            <button type="button" onClick={addItem} className="w-full rounded-xl border border-[#8B5E3C] px-4 py-2 text-sm font-semibold text-[#8B5E3C]">إضافة بند</button>
            {items.map((item) => <div key={item.id} className="flex items-center justify-between rounded-xl bg-[#FAF7F2] p-3 text-sm"><span>{item.dressCode} - {item.dressName}</span><button type="button" onClick={() => setItems((current) => current.filter((row) => row.id !== item.id))} className="text-rose-700">حذف</button></div>)}
            <textarea value={draft.notes} onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))} placeholder="ملاحظات" className="h-20 w-full rounded-xl border border-[#E8DED2] bg-[#FAF7F2] px-3 py-2 text-sm" />
            {error ? <p className="whitespace-pre-line rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p> : null}
            <button type="button" onClick={submitInvoice} className="w-full rounded-xl bg-[#8B5E3C] px-4 py-2 text-sm font-semibold text-white">حفظ الفاتورة</button>
          </div>
        </div>

        <div className="space-y-3">
          {invoices.map((invoice) => (
            <article key={invoice.id} className="rounded-2xl border border-[#E8DED2] bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div><p className="text-sm font-semibold text-slate-400">{invoice.invoiceNumber}</p><h3 className="text-lg font-bold">{invoice.customerName}</h3><p className="text-sm text-[#7A7168]">{invoice.invoiceDate} - {formatMoneyOMR(invoice.subtotal)}</p></div>
                <div className="flex gap-2"><button type="button" onClick={() => printSaleInvoice(invoice)} className="rounded-xl bg-[#FAF7F2] px-3 py-2 text-sm font-semibold text-[#8B5E3C]">طباعة</button></div>
              </div>
              <div className="mt-4 space-y-2">
                {invoice.items.map((item) => {
                  const returned = returns.some((record) => record.invoiceId === invoice.id && record.dressCode === item.dressCode);
                  return <div key={item.id} className="flex items-center justify-between rounded-xl bg-[#FAF7F2] p-3 text-sm"><span>{item.dressCode} - {item.dressName} - {formatMoneyOMR(item.unitPrice)}</span><button type="button" disabled={returned} onClick={() => { setReturnInvoice(invoice); setReturnCode(item.dressCode); }} className="rounded-lg px-3 py-1 font-semibold disabled:text-slate-400 enabled:bg-rose-50 enabled:text-rose-700">{returned ? 'مرتجع مسجل' : 'تسجيل مرتجع'}</button></div>;
                })}
              </div>
            </article>
          ))}
        </div>
      </div>

      <SimpleModal open={Boolean(returnInvoice)} onClose={() => setReturnInvoice(null)} title="تأكيد مرتجع مبيعات" footer={<button type="button" onClick={submitReturn} className="rounded-xl bg-rose-700 px-4 py-2 text-sm font-semibold text-white">تأكيد المرتجع</button>}>
        <p className="text-sm text-[#7A7168]">سيتم ربط المرتجع بالفاتورة الأصلية وإدخاله في صافي المبيعات.</p>
        <p className="text-sm font-semibold">{returnInvoice?.invoiceNumber} - {returnCode}</p>
      </SimpleModal>
    </section>
  );
}
