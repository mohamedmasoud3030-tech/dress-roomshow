import { useEffect, useMemo, useState } from 'react';
import { Modal } from '../../components/shared/Modal';
import { getTodayISO } from '../../shared/utils/date';
import { formatMoneyOMR } from '../../shared/utils/format';
import { getReservations } from '../reservations/reservation.service';
import type { Reservation } from '../reservations/reservation.types';
import { addPayment } from './payment.service';
import type { PaymentMethod, PaymentRecord, PaymentType } from './payment.types';

type AddPaymentModalProps = {
  open: boolean;
  onClose: () => void;
  onCreated: (payment: PaymentRecord) => void;
};

type PaymentForm = {
  reservationNumber: string;
  paymentDate: string;
  type: PaymentType;
  method: PaymentMethod;
  amount: string;
  notes: string;
};

const fieldClass = 'mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus-visible:border-amber-500 focus-visible:ring-2 focus-visible:ring-amber-500/30';

function getDefaultForm(): PaymentForm {
  return { reservationNumber: '', paymentDate: getTodayISO(), type: 'rental', method: 'cash', amount: '', notes: '' };
}

function isEligible(reservation: Reservation, type: PaymentType): boolean {
  if (reservation.status === 'cancelled') return false;
  if (type === 'refund') return reservation.paidAmount > 0;
  if (type === 'penalty' || type === 'adjustment') return true;
  return reservation.remainingAmount > 0;
}

export function AddPaymentModal({ open, onClose, onCreated }: AddPaymentModalProps) {
  const [form, setForm] = useState<PaymentForm>(() => getDefaultForm());
  const [submitError, setSubmitError] = useState<string | null>(null);
  const reservations = useMemo(() => getReservations().filter((item) => isEligible(item, form.type)), [open, form.type]);
  const selected = reservations.find((item) => item.reservationNumber === form.reservationNumber);
  const maximum = selected
    ? form.type === 'refund'
      ? selected.paidAmount
      : form.type === 'rental' || form.type === 'deposit'
        ? selected.remainingAmount
        : undefined
    : undefined;

  useEffect(() => {
    if (!open) return;
    setForm(getDefaultForm());
    setSubmitError(null);
  }, [open]);

  const close = () => {
    setForm(getDefaultForm());
    setSubmitError(null);
    onClose();
  };

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitError(null);

    try {
      const payment = addPayment({ ...form, amount: Number(form.amount) });
      onCreated(payment);
      close();
    } catch (error: unknown) {
      setSubmitError(error instanceof Error ? error.message : 'تعذر تسجيل الدفعة.');
    }
  };

  return (
    <Modal open={open} onClose={close} title="تسجيل دفعة جديدة" className="max-w-2xl">
      <form onSubmit={submit} className="space-y-4">
        {submitError && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm font-bold text-rose-800">{submitError}</p>}
        <label className="block text-sm font-bold text-slate-700">نوع الحركة<select value={form.type} onChange={(event) => setForm((current) => ({ ...current, type: event.target.value as PaymentType, reservationNumber: '' }))} className={fieldClass}><option value="rental">تحصيل إيجار</option><option value="deposit">تحصيل عربون أو تأمين</option><option value="penalty">غرامة مسددة</option><option value="adjustment">تسوية مسددة</option><option value="refund">استرجاع مبلغ</option></select></label>
        <label className="block text-sm font-bold text-slate-700">الحجز<select required value={form.reservationNumber} onChange={(event) => setForm((current) => ({ ...current, reservationNumber: event.target.value }))} className={fieldClass}><option value="">اختاري الحجز</option>{reservations.map((item) => <option key={item.id} value={item.reservationNumber}>{item.reservationNumber} — {item.customerName} — {item.dressCode}</option>)}</select></label>
        {selected && <div className="grid gap-2 rounded-xl bg-amber-50 p-3 text-sm sm:grid-cols-3"><span>الإجمالي: <b>{formatMoneyOMR(selected.totalAmount)}</b></span><span>المحصل: <b>{formatMoneyOMR(selected.paidAmount)}</b></span><span>المتبقي: <b>{formatMoneyOMR(selected.remainingAmount)}</b></span></div>}
        <div className="grid gap-4 md:grid-cols-2"><label className="block text-sm font-bold text-slate-700">القيمة (ر.ع)<input required type="number" min="0.001" max={maximum} step="0.001" value={form.amount} onChange={(event) => setForm((current) => ({ ...current, amount: event.target.value }))} className={fieldClass} />{maximum !== undefined && <span className="mt-1 block text-xs text-slate-500">الحد الأقصى: {formatMoneyOMR(maximum)}</span>}</label><label className="block text-sm font-bold text-slate-700">تاريخ الدفع<input required type="date" max={getTodayISO()} value={form.paymentDate} onChange={(event) => setForm((current) => ({ ...current, paymentDate: event.target.value }))} className={fieldClass} /></label></div>
        <div className="grid gap-4 md:grid-cols-2"><label className="block text-sm font-bold text-slate-700">وسيلة الدفع<select value={form.method} onChange={(event) => setForm((current) => ({ ...current, method: event.target.value as PaymentMethod }))} className={fieldClass}><option value="cash">نقداً</option><option value="card">بطاقة</option><option value="bank_transfer">تحويل بنكي</option><option value="other">أخرى</option></select></label><label className="block text-sm font-bold text-slate-700">ملاحظات<textarea rows={3} maxLength={500} value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} className={fieldClass} /></label></div>
        {reservations.length === 0 && <p className="text-sm font-bold text-amber-700">لا توجد حجوزات مؤهلة لهذه الحركة حالياً.</p>}
        <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end"><button type="button" onClick={close} className="min-h-11 rounded-xl border border-slate-300 px-5 text-sm font-bold text-slate-700">إلغاء</button><button type="submit" disabled={reservations.length === 0} className="min-h-11 rounded-xl bg-slate-950 px-5 text-sm font-bold text-white disabled:opacity-50">تسجيل الدفعة</button></div>
      </form>
    </Modal>
  );
}
