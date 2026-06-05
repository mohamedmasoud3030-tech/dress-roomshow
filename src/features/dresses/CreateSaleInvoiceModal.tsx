import { useMemo, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Modal } from '../../components/shared/Modal';
import { getTodayISO } from '../../shared/utils/date';
import { formatMoneyOMR } from '../../shared/utils/format';
import { createSaleInvoice, type SaleInvoice } from './salesLedger.service';
import { getSaleableDresses, type SalePaymentMethod } from './sale.service';

type Props = { open: boolean; onClose: () => void; onCreated: (invoice: SaleInvoice) => void };
type Line = { dressCode: string; amount: string };
const field = 'mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus-visible:border-amber-500 focus-visible:ring-2 focus-visible:ring-amber-500/30';

export function CreateSaleInvoiceModal({ open, onClose, onCreated }: Props) {
  const dresses = useMemo(() => getSaleableDresses(), [open]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [saleDate, setSaleDate] = useState(getTodayISO());
  const [paymentMethod, setPaymentMethod] = useState<SalePaymentMethod>('cash');
  const [discountAmount, setDiscountAmount] = useState('0');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<Line[]>([{ dressCode: '', amount: '' }]);
  const [error, setError] = useState<string | null>(null);
  const subtotal = lines.reduce((sum, line) => sum + (Number(line.amount) || 0), 0);
  const discount = Number(discountAmount) || 0;
  const total = Math.max(subtotal - discount, 0);
  const close = () => { setCustomerName(''); setCustomerPhone(''); setSaleDate(getTodayISO()); setPaymentMethod('cash'); setDiscountAmount('0'); setNotes(''); setLines([{ dressCode: '', amount: '' }]); setError(null); onClose(); };
  const updateLine = (index: number, patch: Partial<Line>) => setLines((current) => current.map((line, lineIndex) => lineIndex === index ? { ...line, ...patch } : line));
  const selectDress = (index: number, dressCode: string) => { const dress = dresses.find((item) => item.code === dressCode); updateLine(index, { dressCode, amount: dress ? String(dress.salePrice) : '' }); };
  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      const invoice = createSaleInvoice({ saleDate, customerName, customerPhone, paymentMethod, discountAmount: discount, notes, lines: lines.map((line) => ({ dressCode: line.dressCode, amount: Number(line.amount) })) });
      onCreated(invoice);
      close();
    } catch (reason: unknown) { setError(reason instanceof Error ? reason.message : 'تعذر تسجيل الفاتورة.'); }
  };

  return <Modal open={open} onClose={close} title="فاتورة مبيعات جديدة" className="max-w-3xl"><form onSubmit={submit} className="space-y-4">
    {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm font-bold text-rose-800">{error}</p>}
    <div className="grid gap-4 md:grid-cols-2"><label className="text-sm font-bold text-slate-700">اسم العميلة<input required value={customerName} onChange={(event) => setCustomerName(event.target.value)} className={field} /></label><label className="text-sm font-bold text-slate-700">الهاتف<input value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} className={field} /></label></div>
    <div className="grid gap-4 md:grid-cols-2"><label className="text-sm font-bold text-slate-700">تاريخ البيع<input required type="date" max={getTodayISO()} value={saleDate} onChange={(event) => setSaleDate(event.target.value)} className={field} /></label><label className="text-sm font-bold text-slate-700">وسيلة الدفع<select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value as SalePaymentMethod)} className={field}><option value="cash">نقداً</option><option value="card">بطاقة</option><option value="bank_transfer">تحويل بنكي</option><option value="other">أخرى</option></select></label></div>
    <div className="space-y-3"><div className="flex items-center justify-between"><h3 className="font-bold">بنود الفاتورة</h3><button type="button" onClick={() => setLines((current) => [...current, { dressCode: '', amount: '' }])} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm font-bold"><Plus className="h-4 w-4" />إضافة بند</button></div>{lines.map((line, index) => <div key={index} className="grid gap-3 rounded-xl border border-slate-200 p-3 md:grid-cols-[1fr_160px_44px]"><label className="text-sm font-bold text-slate-700">الفستان<select required value={line.dressCode} onChange={(event) => selectDress(index, event.target.value)} className={field}><option value="">اختاري الفستان</option>{dresses.map((dress) => <option key={dress.id} value={dress.code}>{dress.code} — {dress.name}</option>)}</select></label><label className="text-sm font-bold text-slate-700">القيمة<input required type="number" min="0.001" step="0.001" value={line.amount} onChange={(event) => updateLine(index, { amount: event.target.value })} className={field} /></label><button type="button" aria-label="حذف البند" disabled={lines.length === 1} onClick={() => setLines((current) => current.filter((_, lineIndex) => lineIndex !== index))} className="mt-6 flex h-11 items-center justify-center rounded-xl border border-rose-200 text-rose-700 disabled:opacity-40"><Trash2 className="h-4 w-4" /></button></div>)}</div>
    <div className="grid gap-4 md:grid-cols-2"><label className="text-sm font-bold text-slate-700">الخصم على الفاتورة<input type="number" min="0" max={subtotal} step="0.001" value={discountAmount} onChange={(event) => setDiscountAmount(event.target.value)} className={field} /></label><label className="text-sm font-bold text-slate-700">ملاحظات<textarea rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} className={field} /></label></div>
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4"><div className="text-sm"><p>الإجمالي قبل الخصم: <b>{formatMoneyOMR(subtotal)}</b></p><p>الخصم: <b>{formatMoneyOMR(discount)}</b></p><p className="mt-1 text-lg">الصافي: <b>{formatMoneyOMR(total)}</b></p></div><div className="flex gap-3"><button type="button" onClick={close} className="min-h-11 rounded-xl border border-slate-300 px-4 text-sm font-bold">إلغاء</button><button type="submit" className="min-h-11 rounded-xl bg-slate-950 px-5 text-sm font-bold text-white">حفظ الفاتورة</button></div></div>
  </form></Modal>;
}
