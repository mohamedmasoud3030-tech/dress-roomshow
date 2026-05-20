import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '../../components/shared/Modal';
import { addDress } from './dress.service';
import type { Dress, DressCategory, DressStatus } from './dress.types';

const schema = z.object({
  name: z.string().min(1, 'الاسم مطلوب'),
  category: z.enum(['زفاف', 'خطوبة', 'سهرة', 'أطفال', 'أخرى']),
  color: z.string().min(1, 'اللون مطلوب'),
  size: z.string().min(1, 'المقاس مطلوب'),
  description: z.string().optional().default(''),
  purchasePrice: z.coerce.number().min(0),
  rentalPrice: z.coerce.number().min(0),
  salePrice: z.coerce.number().min(0).default(0),
  depositAmount: z.coerce.number().min(0),
  status: z.enum(['available', 'reserved', 'rented', 'laundry', 'maintenance', 'damaged', 'sold', 'inactive']).default('available'),
  isForRent: z.boolean().default(true),
  isForSale: z.boolean().default(false),
  notes: z.string().optional().default(''),
});

type FormValues = z.infer<typeof schema>;

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess: (dress: Dress) => void;
};

export function AddDressModal({ open, onClose, onSuccess }: Props) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      status: 'available',
      isForRent: true,
      isForSale: false,
      purchasePrice: 0,
      salePrice: 0,
      depositAmount: 0,
    },
  });

  const onSubmit = (values: FormValues) => {
    const dress = addDress({
      name: values.name,
      description: values.description ?? '',
      category: values.category as DressCategory,
      color: values.color,
      size: values.size,
      purchasePrice: values.purchasePrice,
      rentalPrice: values.rentalPrice,
      salePrice: values.salePrice,
      depositAmount: values.depositAmount,
      status: values.status as DressStatus,
      isForRent: values.isForRent,
      isForSale: values.isForSale,
      notes: values.notes,
    });
    reset();
    onSuccess(dress);
    onClose();
  };

  const inputCls = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition';
  const labelCls = 'block text-sm font-medium text-slate-700 mb-1';
  const errorCls = 'text-xs text-rose-600 mt-1';

  return (
    <Modal open={open} onClose={onClose} title="إضافة فستان جديد" className="max-w-xl">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className={labelCls}>اسم الفستان *</label>
            <input {...register('name')} placeholder="مثال: فستان زفاف ملكي" className={inputCls} />
            {errors.name && <p className={errorCls}>{errors.name.message}</p>}
          </div>

          <div>
            <label className={labelCls}>الفئة *</label>
            <select {...register('category')} className={inputCls}>
              <option value="زفاف">زفاف</option>
              <option value="خطوبة">خطوبة</option>
              <option value="سهرة">سهرة</option>
              <option value="أطفال">أطفال</option>
              <option value="أخرى">أخرى</option>
            </select>
          </div>

          <div>
            <label className={labelCls}>الحالة *</label>
            <select {...register('status')} className={inputCls}>
              <option value="available">متاح</option>
              <option value="laundry">غسيل</option>
              <option value="maintenance">صيانة</option>
              <option value="inactive">غير نشط</option>
            </select>
          </div>

          <div>
            <label className={labelCls}>اللون *</label>
            <input {...register('color')} placeholder="أبيض / ذهبي / ..." className={inputCls} />
            {errors.color && <p className={errorCls}>{errors.color.message}</p>}
          </div>

          <div>
            <label className={labelCls}>المقاس *</label>
            <input {...register('size')} placeholder="M / L / 40 / ..." className={inputCls} />
            {errors.size && <p className={errorCls}>{errors.size.message}</p>}
          </div>

          <div>
            <label className={labelCls}>سعر الإيجار (ر.ع) *</label>
            <input type="number" step="0.001" {...register('rentalPrice')} placeholder="0.000" className={inputCls} />
            {errors.rentalPrice && <p className={errorCls}>{errors.rentalPrice.message}</p>}
          </div>

          <div>
            <label className={labelCls}>العربون (ر.ع)</label>
            <input type="number" step="0.001" {...register('depositAmount')} placeholder="0.000" className={inputCls} />
          </div>

          <div>
            <label className={labelCls}>سعر الشراء (ر.ع)</label>
            <input type="number" step="0.001" {...register('purchasePrice')} placeholder="0.000" className={inputCls} />
          </div>

          <div>
            <label className={labelCls}>سعر البيع (ر.ع)</label>
            <input type="number" step="0.001" {...register('salePrice')} placeholder="0.000" className={inputCls} />
          </div>

          <div className="col-span-2">
            <label className={labelCls}>الوصف</label>
            <input {...register('description')} placeholder="تفاصيل الفستان..." className={inputCls} />
          </div>

          <div className="col-span-2">
            <label className={labelCls}>ملاحظات</label>
            <textarea {...register('notes')} rows={2} placeholder="ملاحظات إضافية..." className={inputCls} />
          </div>

          <div className="col-span-2 flex gap-6">
            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
              <input type="checkbox" {...register('isForRent')} className="accent-violet-600" />
              للإيجار
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
              <input type="checkbox" {...register('isForSale')} className="accent-violet-600" />
              للبيع
            </label>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 bg-violet-700 text-white font-semibold py-2.5 rounded-lg hover:bg-violet-800 disabled:opacity-60 transition"
          >
            إضافة الفستان
          </button>
          <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 transition text-sm">
            إلغاء
          </button>
        </div>
      </form>
    </Modal>
  );
}
