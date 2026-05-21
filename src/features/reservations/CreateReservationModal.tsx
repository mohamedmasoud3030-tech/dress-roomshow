import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '../../components/shared/Modal';
import { createReservation } from './reservation.service';
import { getDresses } from '../dresses/dress.service';
import { getCustomers } from '../customers/customer.service';
import type { Reservation } from './reservation.types';
import type { Dress } from '../dresses/dress.types';
import type { Customer } from '../customers/customer.types';
import { getTodayISO } from '../../shared/utils/date';
import { formatMoneyOMR } from '../../shared/utils/format';

const schema = z.object({
  customerId: z.string().min(1, 'اختري العميلة'),
  dressId: z.string().min(1, 'اختري الفستان'),
  pickupDate: z.string().min(1, 'تاريخ الاستلام مطلوب'),
  returnDate: z.string().min(1, 'تاريخ الإرجاع مطلوب'),
  depositAmount: z.coerce.number().min(0),
  notes: z.string().optional().default(''),
});

type FormValues = z.infer<typeof schema>;

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess: (res: Reservation) => void;
};

export function CreateReservationModal({ open, onClose, onSuccess }: Props) {
  const [dresses, setDresses] = useState<Dress[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedDress, setSelectedDress] = useState<Dress | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setDresses(getDresses().filter((d) => d.status === 'available' && d.isForRent));
      setCustomers(getCustomers());
      setError(null);
    }
  }, [open]);

  const today = getTodayISO();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { pickupDate: today, depositAmount: 0 },
  });

  const watchedDressId = watch('dressId');

  useEffect(() => {
    const dress = dresses.find((d) => d.id === watchedDressId);
    setSelectedDress(dress ?? null);
    if (dress) {
      setValue('depositAmount', dress.depositAmount);
    }
  }, [watchedDressId, dresses, setValue]);

  const onSubmit = (values: FormValues) => {
    const customer = customers.find((c) => c.id === values.customerId);
    const dress = dresses.find((d) => d.id === values.dressId);
    if (!customer || !dress) return;
    if (values.returnDate <= values.pickupDate) {
      setError('تاريخ الإرجاع يجب أن يكون بعد تاريخ الاستلام');
      return;
    }
    try {
      const res = createReservation({
        customerId: customer.id,
        customerName: customer.name,
        customerPhone: customer.phone,
        dressId: dress.id,
        dressCode: dress.code,
        dressName: dress.name,
        pickupDate: values.pickupDate,
        returnDate: values.returnDate,
        rentalPrice: dress.rentalPrice,
        depositAmount: values.depositAmount,
        notes: values.notes,
      });
      reset();
      setSelectedDress(null);
      setError(null);
      onSuccess(res);
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'حدث خطأ');
    }
  };

  const inputCls = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition';
  const labelCls = 'block text-sm font-medium text-slate-700 mb-1';
  const errorCls = 'text-xs text-rose-600 mt-1';

  return (
    <Modal open={open} onClose={onClose} title="إنشاء حجز جديد" className="max-w-xl">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {error && (
          <div className="bg-rose-50 border border-rose-200 rounded-lg px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        <div>
          <label className={labelCls}>العميلة *</label>
          <select {...register('customerId')} className={inputCls}>
            <option value="">اختري العميلة...</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} — {c.phone}
              </option>
            ))}
          </select>
          {errors.customerId && <p className={errorCls}>{errors.customerId.message}</p>}
          {customers.length === 0 && (
            <p className="text-xs text-amber-600 mt-1">لا توجد عميلات. أضفي عميلة أولاً من قسم العميلات.</p>
          )}
        </div>

        <div>
          <label className={labelCls}>الفستان *</label>
          <select {...register('dressId')} className={inputCls}>
            <option value="">اختري الفستان...</option>
            {dresses.map((d) => (
              <option key={d.id} value={d.id}>
                {d.code} — {d.name} ({formatMoneyOMR(d.rentalPrice)})
              </option>
            ))}
          </select>
          {errors.dressId && <p className={errorCls}>{errors.dressId.message}</p>}
          {dresses.length === 0 && (
            <p className="text-xs text-amber-600 mt-1">لا توجد فساتين متاحة للإيجار حالياً.</p>
          )}
        </div>

        {selectedDress && (
          <div className="bg-violet-50 rounded-lg p-3 text-sm text-violet-800 grid grid-cols-2 gap-2">
            <div>
              <span className="text-xs text-violet-600">سعر الإيجار:</span>
              <p className="font-bold">{formatMoneyOMR(selectedDress.rentalPrice)}</p>
            </div>
            <div>
              <span className="text-xs text-violet-600">اللون / المقاس:</span>
              <p>{selectedDress.color} / {selectedDress.size}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>تاريخ الاستلام *</label>
            <input type="date" {...register('pickupDate')} className={inputCls} />
            {errors.pickupDate && <p className={errorCls}>{errors.pickupDate.message}</p>}
          </div>
          <div>
            <label className={labelCls}>تاريخ الإرجاع *</label>
            <input type="date" {...register('returnDate')} className={inputCls} />
            {errors.returnDate && <p className={errorCls}>{errors.returnDate.message}</p>}
          </div>
        </div>

        <div>
          <label className={labelCls}>العربون (ر.ع)</label>
          <input type="number" step="0.001" {...register('depositAmount')} className={inputCls} />
        </div>

        <div>
          <label className={labelCls}>ملاحظات</label>
          <textarea {...register('notes')} rows={2} placeholder="ملاحظات اختيارية..." className={inputCls} />
        </div>

        {selectedDress && (
          <div className="bg-slate-50 rounded-lg p-3 text-sm border border-slate-200">
            <div className="flex justify-between">
              <span className="text-slate-600">المجموع الكلي:</span>
              <span className="font-bold text-slate-900">
                {formatMoneyOMR(selectedDress.rentalPrice + Number(watch('depositAmount') || 0))}
              </span>
            </div>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 bg-violet-700 text-white font-semibold py-2.5 rounded-lg hover:bg-violet-800 disabled:opacity-60 transition"
          >
            إنشاء الحجز
          </button>
          <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 transition text-sm">
            إلغاء
          </button>
        </div>
      </form>
    </Modal>
  );
}
