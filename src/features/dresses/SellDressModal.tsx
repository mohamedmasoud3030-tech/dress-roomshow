import { useEffect, useMemo, useState } from 'react';
import { Modal } from '../../components/shared/Modal';
import { getTodayISO } from '../../shared/utils/date';
import { formatMoneyOMR } from '../../shared/utils/format';
import { addSale, getSaleableDresses, type SalePaymentMethod, type SaleRecord } from './sale.service';

type Props = { open: boolean; onClose: () => void; onCreated: (sale: SaleRecord) => void };
type Form = { dressCode: string; saleDate: string; customerName: string; customerPhone: string; amount: string; paymentMethod: SalePaymentMethod; notes: string };
const field = 'mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus-visible:border-amber-500 focus-visible:ring-2 focus-visible:ring-amber-500/30';
function defaults(): Form { return { dressCode: '', saleDate: getTodayISO(), customerName: '', customerPhone: '', amount: '', paymentMethod: 'cash', notes: '' }; }

export function SellDressModal({ open, onClose, onCreated }: Props) {
  const [form, setForm] = useState<Form>(() => defaults());
  const [error, setError] = useState<string | null>(null);
  const dresses = useMemo(() => getSaleableDresses(), [open]);
  const selected = dresses.find((dress) => dress.code === form.dressCode);

  useEffect(() => { if (open) { setForm(defaults()); setError(null); } }, [open]);
  const close = () => { setForm(defaults()); setError(null); onClose(); };
  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError(null);
    try {
      const sale = addSale({ ...form, amount: Number(form.amount), customerPhone: form.customerPhone || undefined });
      onCreated(sale); close();
    } catch (reason: unknown) { setError(reason instanceof Error ? reason.message : 'تعذر تسجيل البيع.'); }
  };

  return <Modal open={open} onClose={close} title="بيع فستان" className="max-w-2xl"><form onSubmit={submit} className="space-y-4">
    {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm font-bold text-rose-800">{error}</p>}
    <label className="block text-sm font-bold text-slate-700">الفستان<select required value={form.dressCode} onChange={(e)=>setForm({...form,dressCode:e.target.value,amount:dresses.find((dress)=>dress.code===e.target.value)?.salePrice.toString() ?? ''})} className={field}><option value="">اختاري الفستان</option>{dresses.map((dress)=><option key={dress.id} value={dress.code}>{dress.code} — {dress.name}</option>)}</select></label>
    {selected && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">سعر البيع المسجل: <b>{formatMoneyOMR(selected.salePrice)}</b></p>}
    <div className="grid gap-4 md:grid-cols-2"><label className="block text-sm font-bold text-slate-700">اسم العميلة<input required value={form.customerName} onChange={(e)=>setForm({...form,customerName:e.target.value})} className={field} /></label><label className="block text-sm font-bold text-slate-700">رقم الهاتف<input value={form.customerPhone} onChange={(e)=>setForm({...form,customerPhone:e.target.value})} className={field} /></label></div>
    <div className="grid gap-4 md:grid-cols-2"><label className="block text-sm font-bold text-slate-700">قيمة البيع<input required type="number" min="0.001" step="0.001" value={form.amount} onChange={(e)=>setForm({...form,amount:e.target.value})} className={field} /></label><label className="block text-sm font-bold text-slate-700">تاريخ البيع<input required type="date" max={getTodayISO()} value={form.saleDate} onChange={(e)=>setForm({...form,saleDate:e.target.value})} className={field} /></label></div>
    <label className="block text-sm font-bold text-slate-700">وسيلة الدفع<select value={form.paymentMethod} onChange={(e)=>setForm({...form,paymentMethod:e.target.value as SalePaymentMethod})} className={field}><option value="cash">نقداً</option><option value="card">بطاقة</option><option value="bank_transfer">تحويل بنكي</option><option value="other">أخرى</option></select></label>
    <label className="block text-sm font-bold text-slate-700">ملاحظات<textarea rows={3} maxLength={500} value={form.notes} onChange={(e)=>setForm({...form,notes:e.target.value})} className={field} /></label>
    {dresses.length===0 && <p className="text-sm font-bold text-amber-700">لا توجد فساتين مؤهلة للبيع حالياً.</p>}
    <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end"><button type="button" onClick={close} className="min-h-11 rounded-xl border border-slate-300 px-5 text-sm font-bold text-slate-700">إلغاء</button><button type="submit" disabled={dresses.length===0} className="min-h-11 rounded-xl bg-slate-950 px-5 text-sm font-bold text-white disabled:opacity-50">تسجيل البيع</button></div>
  </form></Modal>;
}
