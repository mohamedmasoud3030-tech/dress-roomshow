import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '../../components/shared/Modal';
import { addPayment, formatPaymentMethodLabel, formatPaymentTypeLabel } from './payment.service';
import { getReservations } from '../reservations/reservation.service';
import type { PaymentRecord } from './payment.types';
import type { Reservation } from '../reservations/reservation.types';
import { formatMoneyOMR } from '../../shared/utils/format';

const schema = z.object({
  reservationId: z.string().min(1, 'اختري الحجز'),
  type: z.enum(['rental', 'deposit', 'penalty', 'refund', 'adjustment']),
  method: z.enum(['cash', 'card', 'bank_transfer', 'other']),
  direction: z.enum(['income', 'refund']),
  amount: z.coerce.number().min(0.001, 'المبلغ مطلوب'),
  notes: z.string().optional().default(''),
});

type FormValues = z.infer<typeof schema>;

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess: (payment: PaymentRecord) => void;
};

export function AddPaymentModal({ open, onClose, onSuccess }: Props) {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      const activeStatuses = ['pending', 'confirmed', 'delivered', 'overdue'];
      setReservations(getReservations().filter((r) => activeStatuses.includes(r.status)));
      setError(null);
    }
  }, [open]);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { type: 'rental', method: 'cash', direction: 'income' },
  });

  const watchedResId = watch('reservationId');
  useEffect(() => {
    const res = reservations.find((r) => r.id === watchedResId);
    setSelectedReservation(res ?? null);
  }, [watchedResId, reservations]);

  const onSubmit = (values: FormValues) => {
    const res = reservations.find((r) => r.id === values.reservationId);
    if (!res) return;
    try {
      const payment = addPayment({
        reservationId: res.id,
        reservationNumber: res.reservationNumber,
        customerName: res.customerName,
        dressCode: res.dressCode,
        dressName: res.dressName,
        type: values.type,
        method: values.method,
        direction: values.direction,
        amount: values.amount,
        notes: values.notes,
      });
      reset();
      setSelectedReservation(null);
      setError(null);
      onSuccess(payment);
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'حدث خطأ');
    }
  };

  const inputCls = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 transition';
  const labelCls = 'block text-sm font-medium text-slate-700 mb-1';
  const errorCls = 'text-xs text-rose-600 mt-1';

  return (
    <Modal open={open} onClose={onClose} title="إضافة دفعة">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {error && <div className="bg-rose-50 border border-rose-200 rounded-lg px-4 py-3 text-sm text-rose-700">{error}</div>}

        <div>
          <label className={labelCls}>الحجز *</label>
          <select {...register('reservationId')} className={inputCls}>
            <option value="">اختري الحجز...</option>
            {reservations.map((r) => (
              <option key={r.id} value={r.id}>
                {r.reservationNumber} — {r.customerName} ({r.dressCode})
              </option>
            ))}
          </select>
          {errors.reservationId && <p className={errorCls}>{errors.reservationId.message}</p>}
        </div>

        {selectedReservation && (
          <div className="bg-violet-50 rounded-lg p-3 text-sm grid grid-cols-2 gap-2 text-violet-800">
            <div>
              <span className="text-xs text-violet-600">المبلغ الكلي:</span>
              <p className="font-bold">{formatMoneyOMR(selectedReservation.totalAmount)}</p>
            </div>
            <div>
              <span className="text-xs text-violet-600">المتبقي:</span>
              <p className="font-bold text-rose-600">{formatMoneyOMR(selectedReservation.remainingAmount)}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>نوع الدفعة *</label>
            <select {...register('type')} className={inputCls}>
              {(['rental', 'deposit', 'penalty', 'refund', 'adjustment'] as const).map((t) => (
                <option key={t} value={t}>{formatPaymentTypeLabel(t)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>اتجاه الدفعة *</label>
            <select {...register('direction')} className={inputCls}>
              <option value="income">تحصيل</option>
              <option value="refund">استرجاع</option>
            </select>
          </div>
        </div>

        <div>
          <label className={labelCls}>طريقة الدفع *</label>
          <select {...register('method')} className={inputCls}>
            {(['cash', 'card', 'bank_transfer', 'other'] as const).map((m) => (
              <option key={m} value={m}>{formatPaymentMethodLabel(m)}</option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelCls}>المبلغ (ر.ع) *</label>
          <input type="number" step="0.001" {...register('amount')} placeholder="0.000" className={inputCls} />
          {errors.amount && <p className={errorCls}>{errors.amount.message}</p>}
        </div>

        <div>
          <label className={labelCls}>ملاحظات</label>
          <textarea {...register('notes')} rows={2} className={inputCls} />
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={isSubmitting} className="flex-1 bg-violet-700 text-white font-semibold py-2.5 rounded-lg hover:bg-violet-800 disabled:opacity-60 transition">
            تسجيل الدفعة
          </button>
          <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 transition text-sm">
            إلغاء
          </button>
        </div>
      </form>
    </Modal>
  );
}
