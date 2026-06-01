import { useState } from 'react';
import { getTodayISO } from '../../shared/utils/date';
import { formatMoneyOMR } from '../../shared/utils/format';
import { calculateCashClose, saveCashClose, type CashCloseRecord } from './cashClose.service';

type Form = { closeDate: string; openingCash: string; actualCash: string; notes: string };
const field = 'mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus-visible:border-amber-500 focus-visible:ring-2 focus-visible:ring-amber-500/30';
function defaults(): Form { return { closeDate: getTodayISO(), openingCash: '0', actualCash: '0', notes: '' }; }

export function CashClosePanel() {
  const [form, setForm] = useState<Form>(() => defaults());
  const [record, setRecord] = useState<CashCloseRecord | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    try {
      const input = { closeDate: form.closeDate, openingCash: Number(form.openingCash), actualCash: Number(form.actualCash), notes: form.notes };
      calculateCashClose(input);
      setRecord(saveCashClose(input));
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : 'تعذر حفظ إقفال اليومية.');
    }
  };

  return <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <div>
      <h2 className="text-lg font-semibold">إقفال اليومية النقدية</h2>
      <p className="mt-1 text-sm text-slate-500">قارني النقد المتوقع بالجرد الفعلي في الصندوق.</p>
    </div>
    {error && <p role="alert" className="mt-4 rounded-xl bg-rose-50 p-3 text-sm font-bold text-rose-800">{error}</p>}
    <form onSubmit={submit} className="mt-4 space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        <label className="block text-sm font-bold text-slate-700">تاريخ الإقفال<input required type="date" max={getTodayISO()} value={form.closeDate} onChange={(e)=>setForm({...form,closeDate:e.target.value})} className={field} /></label>
        <label className="block text-sm font-bold text-slate-700">رصيد بداية اليوم<input required type="number" min="0" step="0.001" value={form.openingCash} onChange={(e)=>setForm({...form,openingCash:e.target.value})} className={field} /></label>
        <label className="block text-sm font-bold text-slate-700">الجرد الفعلي<input required type="number" min="0" step="0.001" value={form.actualCash} onChange={(e)=>setForm({...form,actualCash:e.target.value})} className={field} /></label>
      </div>
      <label className="block text-sm font-bold text-slate-700">ملاحظات<textarea rows={2} maxLength={500} value={form.notes} onChange={(e)=>setForm({...form,notes:e.target.value})} className={field} /></label>
      <button type="submit" className="min-h-11 rounded-xl bg-slate-950 px-5 text-sm font-bold text-white hover:bg-slate-800">حفظ الإقفال</button>
    </form>
    {record && <div className="mt-5 grid gap-3 rounded-xl bg-stone-50 p-4 text-sm md:grid-cols-3">
      <p>نقد التأجير: <b>{formatMoneyOMR(record.rentalCash)}</b></p>
      <p>نقد المبيعات: <b>{formatMoneyOMR(record.salesCash)}</b></p>
      <p>المصروفات النقدية: <b>{formatMoneyOMR(record.expensesCash)}</b></p>
      <p>الاسترجاعات النقدية: <b>{formatMoneyOMR(record.refundsCash)}</b></p>
      <p>النقد المتوقع: <b>{formatMoneyOMR(record.expectedCash)}</b></p>
      <p className={record.difference === 0 ? 'font-bold text-emerald-700' : 'font-bold text-rose-700'}>الفرق: {formatMoneyOMR(record.difference)}</p>
    </div>}
  </article>;
}
