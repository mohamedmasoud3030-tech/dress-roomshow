import { useEffect, useId, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Modal } from '../../components/shared/Modal';
import { addDress } from './dress.service';
import type { Dress } from './dress.types';

const initialStatuses = ['available', 'laundry', 'maintenance', 'damaged', 'inactive'] as const;

const dressSchema = z
  .object({
    name: z.string().trim().min(2, 'اكتبي اسم الفستان بشكل واضح.').max(100, 'الاسم طويل جداً.'),
    description: z.string().trim().max(300, 'الوصف يجب ألا يتجاوز 300 حرف.').optional(),
    category: z.enum(['زفاف', 'خطوبة', 'سهرة', 'أطفال', 'أخرى']),
    color: z.string().trim().min(1, 'لون الفستان مطلوب.').max(50, 'اسم اللون طويل جداً.'),
    size: z.string().trim().min(1, 'مقاس الفستان مطلوب.').max(30, 'المقاس طويل جداً.'),
    purchasePrice: z.coerce.number().finite('سعر الشراء غير صالح.').min(0, 'سعر الشراء لا يمكن أن يكون سالباً.'),
    rentalPrice: z.coerce.number().finite('سعر الإيجار غير صالح.').min(0, 'سعر الإيجار لا يمكن أن يكون سالباً.'),
    salePrice: z.coerce.number().finite('سعر البيع غير صالح.').min(0, 'سعر البيع لا يمكن أن يكون سالباً.'),
    depositAmount: z.coerce.number().finite('قيمة التأمين غير صالحة.').min(0, 'قيمة التأمين لا يمكن أن تكون سالبة.'),
    status: z.enum(initialStatuses),
    isForRent: z.boolean(),
    isForSale: z.boolean(),
    notes: z.string().trim().max(500, 'الملاحظات يجب ألا تتجاوز 500 حرف.').optional(),
  })
  .superRefine((values, context) => {
    if (!values.isForRent && !values.isForSale) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['isForRent'],
        message: 'حددي أن الفستان للبيع أو للإيجار على الأقل.',
      });
    }

    if (values.isForRent && values.rentalPrice <= 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['rentalPrice'],
        message: 'أدخلي سعر الإيجار للفساتين المتاحة للإيجار.',
      });
    }

    if (values.isForSale && values.salePrice <= 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['salePrice'],
        message: 'أدخلي سعر البيع للفساتين المتاحة للبيع.',
      });
    }
  });

type DressFormValues = z.infer<typeof dressSchema>;

type AddDressModalProps = {
  open: boolean;
  onClose: () => void;
  onCreated: (dress: Dress) => void;
};

const statusLabels: Record<(typeof initialStatuses)[number], string> = {
  available: 'متاح',
  laundry: 'في المغسلة',
  maintenance: 'تحت التعديل',
  damaged: 'تالف',
  inactive: 'غير نشط',
};

const fieldClassName =
  'min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 transition placeholder:text-slate-400 focus-visible:border-amber-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/30 read-only:cursor-not-allowed read-only:bg-stone-100 read-only:text-slate-400';
const labelClassName = 'mb-1.5 block text-sm font-bold text-slate-700';
const errorClassName = 'mt-1 text-xs font-medium text-rose-700';

function getDefaultValues(): DressFormValues {
  return {
    name: '',
    description: '',
    category: 'سهرة',
    color: '',
    size: '',
    purchasePrice: 0,
    rentalPrice: 0,
    salePrice: 0,
    depositAmount: 0,
    status: 'available',
    isForRent: true,
    isForSale: false,
    notes: '',
  };
}

export function AddDressModal({ open, onClose, onCreated }: AddDressModalProps) {
  const fieldId = useId();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<DressFormValues>({
    resolver: zodResolver(dressSchema),
    defaultValues: getDefaultValues(),
  });

  const isForRent = watch('isForRent');
  const isForSale = watch('isForSale');

  useEffect(() => {
    if (!open) return;
    reset(getDefaultValues());
    setSubmitError(null);
  }, [open, reset]);

  const closeModal = () => {
    reset(getDefaultValues());
    setSubmitError(null);
    onClose();
  };

  const onSubmit = (values: DressFormValues) => {
    setSubmitError(null);

    try {
      const dress = addDress({
        ...values,
        description: values.description || '',
        rentalPrice: values.isForRent ? values.rentalPrice : 0,
        salePrice: values.isForSale ? values.salePrice : 0,
        depositAmount: values.isForRent ? values.depositAmount : 0,
        notes: values.notes || undefined,
      });
      onCreated(dress);
      closeModal();
    } catch (error: unknown) {
      setSubmitError(error instanceof Error ? error.message : 'تعذر إضافة الفستان. حاولي مرة أخرى.');
    }
  };

  return (
    <Modal open={open} onClose={closeModal} title="إضافة فستان جديد" className="max-w-3xl">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        {submitError && (
          <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">
            {submitError}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label htmlFor={`${fieldId}-name`} className={labelClassName}>اسم الفستان</label>
            <input id={`${fieldId}-name`} {...register('name')} className={fieldClassName} placeholder="مثال: فستان سهرة كحلي مطرز" />
            {errors.name && <p className={errorClassName}>{errors.name.message}</p>}
          </div>
          <div>
            <label htmlFor={`${fieldId}-category`} className={labelClassName}>الفئة</label>
            <select id={`${fieldId}-category`} {...register('category')} className={fieldClassName}>
              <option value="زفاف">زفاف</option>
              <option value="خطوبة">خطوبة</option>
              <option value="سهرة">سهرة</option>
              <option value="أطفال">أطفال</option>
              <option value="أخرى">أخرى</option>
            </select>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label htmlFor={`${fieldId}-color`} className={labelClassName}>اللون</label>
            <input id={`${fieldId}-color`} {...register('color')} className={fieldClassName} placeholder="مثال: كحلي" />
            {errors.color && <p className={errorClassName}>{errors.color.message}</p>}
          </div>
          <div>
            <label htmlFor={`${fieldId}-size`} className={labelClassName}>المقاس</label>
            <input id={`${fieldId}-size`} dir="ltr" {...register('size')} className={fieldClassName} placeholder="مثال: M أو 42" />
            {errors.size && <p className={errorClassName}>{errors.size.message}</p>}
          </div>
        </div>

        <div>
          <label htmlFor={`${fieldId}-description`} className={labelClassName}>وصف مختصر</label>
          <textarea id={`${fieldId}-description`} rows={3} maxLength={300} {...register('description')} className={fieldClassName} placeholder="تفاصيل القصة أو التطريز أو الاستخدام المناسب" />
          {errors.description && <p className={errorClassName}>{errors.description.message}</p>}
        </div>

        <fieldset className="rounded-xl border border-slate-200 bg-stone-50 p-4">
          <legend className="px-1 text-sm font-bold text-slate-700">نوع الاستخدام</legend>
          <div className="mt-2 flex flex-wrap gap-5">
            <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 text-sm font-bold text-slate-800">
              <input type="checkbox" {...register('isForRent')} className="h-4 w-4 cursor-pointer rounded border-slate-300 text-slate-950 focus:ring-amber-500" />
              متاح للإيجار
            </label>
            <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 text-sm font-bold text-slate-800">
              <input type="checkbox" {...register('isForSale')} className="h-4 w-4 cursor-pointer rounded border-slate-300 text-slate-950 focus:ring-amber-500" />
              متاح للبيع
            </label>
          </div>
          {errors.isForRent && <p className={errorClassName}>{errors.isForRent.message}</p>}
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div>
            <label htmlFor={`${fieldId}-purchase-price`} className={labelClassName}>سعر الشراء (ر.ع)</label>
            <input id={`${fieldId}-purchase-price`} type="number" min="0" step="0.001" inputMode="decimal" {...register('purchasePrice')} className={fieldClassName} />
            {errors.purchasePrice && <p className={errorClassName}>{errors.purchasePrice.message}</p>}
          </div>
          <div>
            <label htmlFor={`${fieldId}-rental-price`} className={labelClassName}>سعر الإيجار (ر.ع)</label>
            <input id={`${fieldId}-rental-price`} type="number" min="0" step="0.001" inputMode="decimal" readOnly={!isForRent} {...register('rentalPrice')} className={fieldClassName} />
            {errors.rentalPrice && <p className={errorClassName}>{errors.rentalPrice.message}</p>}
          </div>
          <div>
            <label htmlFor={`${fieldId}-deposit`} className={labelClassName}>التأمين (ر.ع)</label>
            <input id={`${fieldId}-deposit`} type="number" min="0" step="0.001" inputMode="decimal" readOnly={!isForRent} {...register('depositAmount')} className={fieldClassName} />
            {errors.depositAmount && <p className={errorClassName}>{errors.depositAmount.message}</p>}
          </div>
          <div>
            <label htmlFor={`${fieldId}-sale-price`} className={labelClassName}>سعر البيع (ر.ع)</label>
            <input id={`${fieldId}-sale-price`} type="number" min="0" step="0.001" inputMode="decimal" readOnly={!isForSale} {...register('salePrice')} className={fieldClassName} />
            {errors.salePrice && <p className={errorClassName}>{errors.salePrice.message}</p>}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label htmlFor={`${fieldId}-status`} className={labelClassName}>حالة البداية</label>
            <select id={`${fieldId}-status`} {...register('status')} className={fieldClassName}>
              {initialStatuses.map((status) => (
                <option key={status} value={status}>{statusLabels[status]}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor={`${fieldId}-notes`} className={labelClassName}>ملاحظات</label>
            <textarea id={`${fieldId}-notes`} rows={3} maxLength={500} {...register('notes')} className={fieldClassName} placeholder="ملاحظات اختيارية عن الفستان أو التجهيز" />
            {errors.notes && <p className={errorClassName}>{errors.notes.message}</p>}
          </div>
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={closeModal}
            className="min-h-11 cursor-pointer rounded-xl border border-slate-300 px-5 py-2 text-sm font-bold text-slate-700 transition duration-200 hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 active:scale-95"
          >
            إلغاء
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="min-h-11 cursor-pointer rounded-xl bg-slate-950 px-5 py-2 text-sm font-bold text-white transition duration-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 active:scale-95"
          >
            {isSubmitting ? 'جارٍ الحفظ...' : 'إضافة الفستان'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
