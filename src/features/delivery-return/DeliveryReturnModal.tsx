import { useEffect, useMemo, useState } from 'react';
import { Modal } from '../../components/shared/Modal';
import { getReservations } from '../reservations/reservation.service';
import { completeDelivery, completeReturn } from './deliveryReturn.operations';
import type { DeliveryReturnRecord } from './deliveryReturn.types';

type Props = { open: boolean; onClose: () => void; onCompleted: (record: DeliveryReturnRecord) => void };
type Operation = 'delivery' | 'return';
type Form = { operation: Operation; reservationNumber: string; dateTime: string; condition: string; lateFee: string; damageFee: string; nextDressStatus: 'available' | 'laundry' | 'maintenance' | 'damaged'; notes: string };
const field = 'mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus-visible:border-amber-500 focus-visible:ring-2 focus-visible:ring-amber-500/30';
function defaults(): Form { return { operation: 'delivery', reservationNumber: '', dateTime: '', condition: '', lateFee: '0', damageFee: '0', nextDressStatus: 'laundry', notes: '' }; }

export function DeliveryReturnModal({ open, onClose, onCompleted }: Props) {
  const [form, setForm] = useState<Form>(() => defaults());
  const [error, setError] = useState<string | null>(null);
  const reservations = useMemo(() => getReservations().filter((item) => form.operation === 'delivery' ? ['pending', 'confirmed'].includes(item.status) : ['delivered', 'overdue'].includes(item.status)), [open, form.operation]);
  useEffect(() => { if (open) { setForm(defaults()); setError(null); } }, [open]);
  const close = () => { setForm(defaults()); setError(null); onClose(); };
  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError(null);
    try {
      const record = form.operation === 'delivery'
        ? completeDelivery({ reservationNumber: form.reservationNumber, deliveryDateTime: form.dateTime, deliveryCondition: form.condition, notes: form.notes })
        : completeReturn({ reservationNumber: form.reservationNumber, returnDateTime: form.dateTime, returnCondition: form.condition, lateFee: Number(form.lateFee), damageFee: Number(form.damageFee), nextDressStatus: form.nextDressStatus, notes: form.notes });
      onCompleted(record); close();
    } catch (reason: unknown) { setError(reason instanceof Error ? reason.message : 'تعذر حفظ العملية.'); }
  };
  return <Modal open={open} onClose={close} title="تسجيل تسليم أو استرجاع" className="max-w-2xl"><form onSubmit={submit} className="space-y-4">
    {error && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm font-bold text-rose-800">{error}</p>}
    <label className="block text-sm font-bold text-slate-700">نوع العملية<select value={form.operation} onChange={(e)=>setForm({...form,operation:e.target.value as Operation,reservationNumber:''})} className={field}><option value="delivery">تسليم فستان للعميلة</option><option value="return">استرجاع فستان من العميلة</option></select></label>
    <label className="block text-sm font-bold text-slate-700">الحجز<select required value={form.reservationNumber} onChange={(e)=>setForm({...form,reservationNumber:e.target.value})} className={field}><option value="">اختاري الحجز</option>{reservations.map((item)=><option key={item.id} value={item.reservationNumber}>{item.reservationNumber} — {item.customerName} — {item.dressCode}</option>)}</select></label>
    <div className="grid gap-4 md:grid-cols-2"><label className="block text-sm font-bold text-slate-700">التاريخ والوقت<input required type="datetime-local" value={form.dateTime} onChange={(e)=>setForm({...form,dateTime:e.target.value})} className={field} /></label><label className="block text-sm font-bold text-slate-700">حالة الفستان<textarea rows={2} value={form.condition} onChange={(e)=>setForm({...form,condition:e.target.value})} className={field} /></label></div>
    {form.operation === 'return' && <><div className="grid gap-4 md:grid-cols-2"><label className="block text-sm font-bold text-slate-700">رسوم التأخير<input type="number" min="0" step="0.001" value={form.lateFee} onChange={(e)=>setForm({...form,lateFee:e.target.value})} className={field} /></label><label className="block text-sm font-bold text-slate-700">رسوم الضرر<input type="number" min="0" step="0.001" value={form.damageFee} onChange={(e)=>setForm({...form,damageFee:e.target.value})} className={field} /></label></div><label className="block text-sm font-bold text-slate-700">حالة الفستان التالية<select value={form.nextDressStatus} onChange={(e)=>setForm({...form,nextDressStatus:e.target.value as Form['nextDressStatus']})} className={field}><option value="available">متاح مباشرة</option><option value="laundry">إلى المغسلة</option><option value="maintenance">إلى التعديل أو الصيانة</option><option value="damaged">تالف أو متضرر</option></select></label></>}
    <label className="block text-sm font-bold text-slate-700">ملاحظات<textarea rows={3} maxLength={500} value={form.notes} onChange={(e)=>setForm({...form,notes:e.target.value})} className={field} /></label>
    {reservations.length === 0 && <p className="text-sm font-bold text-amber-700">لا توجد حجوزات مؤهلة لهذه العملية حالياً.</p>}
    <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end"><button type="button" onClick={close} className="min-h-11 rounded-xl border border-slate-300 px-5 text-sm font-bold text-slate-700">إلغاء</button><button type="submit" disabled={reservations.length===0} className="min-h-11 rounded-xl bg-slate-950 px-5 text-sm font-bold text-white disabled:opacity-50">حفظ العملية</button></div>
  </form></Modal>;
}
