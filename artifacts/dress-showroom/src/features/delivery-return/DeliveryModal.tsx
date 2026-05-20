import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '../../components/shared/Modal';
import { recordDelivery } from './deliveryReturn.service';
import { getReservations } from '../reservations/reservation.service';
import type { DeliveryReturnRecord } from './deliveryReturn.types';
import type { Reservation } from '../reservations/reservation.types';

const schema = z.object({
  reservationId: z.string().min(1, 'اختري الحجز'),
  deliveryCondition: z.string().min(1, 'حالة الفستان مطلوبة'),
  notes: z.string().optional().default(''),
});

type FormValues = z.infer<typeof schema>;

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess: (record: DeliveryReturnRecord) => void;
};

export function DeliveryModal({ open, onClose, onSuccess }: Props) {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setReservations(getReservations().filter((r) => r.status === 'confirmed' || r.status === 'pending'));
      setError(null);
    }
  }, [open]);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const onSubmit = (values: FormValues) => {
    const res = reservations.find((r) => r.id === values.reservationId);
    if (!res) return;
    try {
      const record = recordDelivery({
        reservationId: res.id,
        reservationNumber: res.reservationNumber,
        customerId: res.customerId,
        customerName: res.customerName,
        customerPhone: res.customerPhone,
        dressId: res.dressId,
        dressCode: res.dressCode,
        dressName: res.dressName,
        depositAmount: res.depositAmount,
        deliveryCondition: values.deliveryCondition,
        notes: values.notes,
      });
      reset();
      setError(null);
      onSuccess(record);
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'حدث خطأ');
    }
  };

  const inputCls = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 transition';
  const labelCls = 'block text-sm font-medium text-slate-700 mb-1';
  const errorCls = 'text-xs text-rose-600 mt-1';

  return (
    <Modal open={open} onClose={onClose} title="تسجيل تسليم فستان">
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
          {reservations.length === 0 && (
            <p className="text-xs text-amber-600 mt-1">لا توجد حجوزات مؤكدة بانتظار التسليم.</p>
          )}
        </div>
        <div>
          <label className={labelCls}>حالة الفستان عند التسليم *</label>
          <input {...register('deliveryCondition')} placeholder="مثال: جيدة — نظيف وكامل" className={inputCls} />
          {errors.deliveryCondition && <p className={errorCls}>{errors.deliveryCondition.message}</p>}
        </div>
        <div>
          <label className={labelCls}>ملاحظات</label>
          <textarea {...register('notes')} rows={2} className={inputCls} />
        </div>
        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={isSubmitting} className="flex-1 bg-violet-700 text-white font-semibold py-2.5 rounded-lg hover:bg-violet-800 disabled:opacity-60 transition">
            تأكيد التسليم
          </button>
          <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 transition text-sm">
            إلغاء
          </button>
        </div>
      </form>
    </Modal>
  );
}
