import { useEffect, useMemo, useState } from 'react';
import { Modal } from '../../components/shared/Modal';
import { getTodayISO } from '../../shared/utils/date';
import { getDresses } from '../dresses/dress.service';
import { addExpense } from './expense.service';
import type { ExpenseCategory, ExpensePaymentMethod, ExpenseRecord } from './expense.types';

type Props = { open: boolean; onClose: () => void; onCreated: (expense: ExpenseRecord) => void };
type Form = { expenseDate: string; title: string; category: ExpenseCategory; amount: string; paymentMethod: ExpensePaymentMethod; relatedDressCode: string; notes: string };
const field = 'mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus-visible:border-amber-500 focus-visible:ring-2 focus-visible:ring-amber-500/30';
function defaults(): Form { return { expenseDate: getTodayISO(), title: '', category: 'laundry', amount: '', paymentMethod: 'cash', relatedDressCode: '', notes: '' }; }

export function AddExpenseModal({ open, onClose, onCreated }: Props) {
  const [form, setForm] = useState<Form>(() => defaults());
  const [error, setError] = useState<string | null>(null);
  const dresses = useMemo(() => getDresses(), [open]);
  useEffect(() => { if (open) { setForm(defaults()); setError(null); } }, [open]);
  const close = () => { setForm(defaults()); setError(null); onClose(); };
  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    try {
      const expense = addExpense({ ...form, amount: Number(form.amount), relatedDressCode: form.relatedDressCode || undefined });
      onCreated(expense);
      close();
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : 'تعذر تسجيل المصروف.');
    }
  };
  return <Modal open={open} onClose={close} title="تسجيل مصروف جديد" className="max-w-2xl"><form onSubmit={submit} className="space-y-4">
    {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm font-bold text-rose-800">{error}</p>}
    <label className="block text-sm font-bold text-slate-700">العنوان<input required value={form.title} onChange={(e)=>setForm({...form,title:e.target.value})} className={field} /></label>
    <div className="grid gap-4 md:grid-cols-2"><label className="block text-sm font-bold text-slate-700">الفئة<select value={form.category} onChange={(e)=>setForm({...form,category:e.target.value as ExpenseCategory})} className={field}><option value="laundry">غسيل</option><option value="tailoring">تعديل وخياطة</option><option value="maintenance">صيانة</option><option value="purchase">شراء</option><option value="rent">إيجار</option><option value="salary">رواتب</option><option value="other">أخرى</option></select></label><label className="block text-sm font-bold text-slate-700">القيمة (ر.ع)<input required type="number" min="0.001" step="0.001" value={form.amount} onChange={(e)=>setForm({...form,amount:e.target.value})} className={field} /></label></div>
    <div className="grid gap-4 md:grid-cols-2"><label className="block text-sm font-bold text-slate-700">تاريخ المصروف<input required type="date" max={getTodayISO()} value={form.expenseDate} onChange={(e)=>setForm({...form,expenseDate:e.target.value})} className={field} /></label><label className="block text-sm font-bold text-slate-700">وسيلة الدفع<select value={form.paymentMethod} onChange={(e)=>setForm({...form,paymentMethod:e.target.value as ExpensePaymentMethod})} className={field}><option value="cash">نقداً</option><option value="card">بطاقة</option><option value="bank_transfer">تحويل بنكي</option><option value="other">أخرى</option></select></label></div>
    <label className="block text-sm font-bold text-slate-700">ربط بفستان اختياري<select value={form.relatedDressCode} onChange={(e)=>setForm({...form,relatedDressCode:e.target.value})} className={field}><option value="">بدون ربط</option>{dresses.map((dress)=><option key={dress.id} value={dress.code}>{dress.code} — {dress.name}</option>)}</select></label>
    <label className="block text-sm font-bold text-slate-700">ملاحظات<textarea rows={3} maxLength={500} value={form.notes} onChange={(e)=>setForm({...form,notes:e.target.value})} className={field} /></label>
    <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end"><button type="button" onClick={close} className="min-h-11 rounded-xl border border-slate-300 px-5 text-sm font-bold text-slate-700">إلغاء</button><button type="submit" className="min-h-11 rounded-xl bg-slate-950 px-5 text-sm font-bold text-white">تسجيل المصروف</button></div>
  </form></Modal>;
}
