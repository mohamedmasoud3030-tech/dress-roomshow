import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '../../components/shared/Modal';
import { getDeliveredReservations, recordReturn, calculateDepositRefund } from './deliveryReturn.service';
import type { DeliveryReturnRecord } from './deliveryReturn.types';
import type { Dress } from '../dresses/dress.types';
import { formatMoneyOMR } from '../../shared/utils/format';

const schema = z.object({
  recordId: z.string().min(1, 'اختري السجل'),
  returnCondition: z.string().min(1, 'حالة الفستان مطلوبة'),
  lateFee: z.coerce.number().min(0).default(0),
  damageFee: z.coerce.number().min(0).default(0),
  returnStatus: z.enum(['returned', 'late', 'damaged']),
  dressAfterStatus: z.enum(['available', 'laundry', 'maintenance', 'damaged']),
  notes: z.string().optional().default(''),
});

type FormValues = z.infer<typeof schema>;

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess: (record: DeliveryReturnRecord) => void;
};

export function ReturnModal({ open, onClose, onSuccess }: Props) {
  const [delivered, setDelivered] = useState<DeliveryReturnRecord[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<DeliveryReturnRecord | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setDelivered(getDeliveredReservations());
      setError(null);
    }
  }, [open]);

  const { register, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { returnStatus: 'returned', dressAfterStatus: 'laundry', lateFee: 0, damageFee: 0 },
  });

  const watchedId = watch('recordId');
  const lateFee = watch('lateFee') || 0;
  const damageFee = watch('damageFee') || 0;

  useEffect(() => {
    const rec = delivered.find((r) => r.id === watchedId);
    setSelectedRecord(rec ?? null);
  }, [watchedId, delivered]);

  const refund = selectedRecord ? calculateDepositRefund(selectedRecord.depositAmount, Number(lateFee), Number(damageFee)) : 0;

  const onSubmit = (values: FormValues) => {
    try {
      const record = recordReturn({
        recordId: values.recordId,
        returnCondition: values.returnCondition,
        lateFee: values.lateFee,
        damageFee: values.damageFee,
        returnStatus: values.returnStatus,
        dressAfterStatus: values.dressAfterStatus as Dress['status'],
        notes: values.notes,
      });
      reset();
      setSelectedRecord(null);
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
    <Modal open={open} onClose={onClose} title="تسجيل استلام فستان">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {error && <div className="bg-rose-50 border border-rose-200 rounded-lg px-4 py-3 text-sm text-rose-700">{error}</div>}

        <div>
          <label className={labelCls}>الفستان المُسلَّم *</label>
          <select {...register('recordId')} className={inputCls}>
            <option value="">اختري الفستان...</option>
            {delivered.map((r) => (
              <option key={r.id} value={r.id}>
                {r.reservationNumber} — {r.customerName} ({r.dressCode})
              </option>
            ))}
          </select>
          {errors.recordId && <p className={errorCls}>{errors.recordId.message}</p>}
          {delivered.length === 0 && <p className="text-xs text-amber-600 mt-1">لا توجد فساتين مُسلَّمة بانتظار الاستلام.</p>}
        </div>

        {selectedRecord && (
          <div className="bg-violet-50 rounded-lg p-3 text-sm text-violet-800">
            <p>العربون المدفوع: <strong>{formatMoneyOMR(selectedRecord.depositAmount)}</strong></p>
          </div>
        )}

        <div>
          <label className={labelCls}>حالة الفستان عند الاستلام *</label>
          <input {...register('returnCondition')} placeholder="مثال: جيدة / بها بقعة / ممزق" className={inputCls} />
          {errors.returnCondition && <p className={errorCls}>{errors.returnCondition.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>غرامة التأخير (ر.ع)</label>
            <input type="number" step="0.001" {...register('lateFee')} placeholder="0.000" className={inputCls} />
          </div>
          <div>
            <label className={labelCls}>رسوم التلف (ر.ع)</label>
            <input type="number" step="0.001" {...register('damageFee')} placeholder="0.000" className={inputCls} />
          </div>
        </div>

        {selectedRecord && (
          <div className="bg-emerald-50 rounded-lg p-3 text-sm border border-emerald-200">
            <p className="text-emerald-700">استرجاع العربون: <strong>{formatMoneyOMR(refund)}</strong></p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>نتيجة الاستلام</label>
            <select {...register('returnStatus')} className={inputCls}>
              <option value="returned">سليم</option>
              <option value="late">مع تأخير</option>
              <option value="damaged">مع تلف</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>حالة الفستان بعد الاستلام</label>
            <select {...register('dressAfterStatus')} className={inputCls}>
              <option value="available">متاح</option>
              <option value="laundry">غسيل</option>
              <option value="maintenance">صيانة</option>
              <option value="damaged">تالف</option>
            </select>
          </div>
        </div>

        <div>
          <label className={labelCls}>ملاحظات</label>
          <textarea {...register('notes')} rows={2} className={inputCls} />
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={isSubmitting} className="flex-1 bg-violet-700 text-white font-semibold py-2.5 rounded-lg hover:bg-violet-800 disabled:opacity-60 transition">
            تأكيد الاستلام
          </button>
          <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 transition text-sm">
            إلغاء
          </button>
        </div>
      </form>
    </Modal>
  );
}
