import { useEffect, useId, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '../../components/shared/Button';
import { Modal } from '../../components/shared/Modal';
import { UserFacingErrorAlert } from '../../components/shared/UserFacingErrorAlert';
import { MAX_NOTES_LENGTH, MIN_ZERO_AMOUNT, MONEY_STEP } from '../../shared/domain/businessRules';
import { FORM_ERROR_CLASS_NAME, FORM_FIELD_CLASS_NAME, FORM_LABEL_CLASS_NAME } from '../../shared/domain/formConstants';
import { DRESS_CATEGORIES } from '../../shared/domain/dressConstants';
import { formatMoneyOMR } from '../../shared/utils/format';
import { createSubmissionKey } from '../../shared/utils/submissionKey';
import { updateDressCommand } from '../workflows';
import type { Dress } from './dress.types';
import { getDressSecurityDepositAmount } from './dress.types';

/**
 * Editing a piece the showroom already owns.
 *
 * Identity (code/barcode), images, status and design links are deliberately
 * absent: each has its own command and its own audit trail. What changes here
 * is the commercial description of the piece — including its season discount.
 */
const editSchema = z
  .object({
    name: z.string().trim().min(2, 'اكتبي اسم العنصر بشكل واضح.').max(100, 'الاسم طويل جداً.'),
    category: z.enum(['زفاف', 'خطوبة', 'سهرة', 'أطفال', 'إكسسوارات', 'حقائب', 'أحذية', 'طرح وشالات', 'أخرى']),
    color: z.string().trim().min(1, 'لون العنصر مطلوب.').max(50, 'اسم اللون طويل جداً.'),
    size: z.string().trim().max(30, 'المقاس طويل جداً.'),
    description: z.string().trim().max(300, 'الوصف يجب ألا يتجاوز 300 حرف.'),
    rentalPrice: z.coerce.number().finite('سعر الإيجار غير صالح.').min(MIN_ZERO_AMOUNT, 'سعر الإيجار لا يمكن أن يكون سالباً.'),
    salePrice: z.coerce.number().finite('سعر البيع غير صالح.').min(MIN_ZERO_AMOUNT, 'سعر البيع لا يمكن أن يكون سالباً.'),
    securityDepositAmount: z.coerce
      .number()
      .finite('قيمة التأمين غير صالحة.')
      .min(MIN_ZERO_AMOUNT, 'قيمة التأمين لا يمكن أن تكون سالبة.'),
    discountPercent: z.coerce
      .number({ invalid_type_error: 'نسبة الخصم غير صالحة.' })
      .finite('نسبة الخصم غير صالحة.')
      .min(0, 'نسبة الخصم لا يمكن أن تكون سالبة.')
      .max(100, 'نسبة الخصم لا يمكن أن تتجاوز ١٠٠٪.'),
    isForRent: z.boolean(),
    isForSale: z.boolean(),
    notes: z.string().trim().max(MAX_NOTES_LENGTH, `الملاحظات يجب ألا تتجاوز ${MAX_NOTES_LENGTH} حرف.`),
  })
  .superRefine((values, context) => {
    if (!values.isForRent && !values.isForSale) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ['isForRent'], message: 'حددي أن العنصر للبيع أو للإيجار على الأقل.' });
    }
    if (values.isForRent && values.rentalPrice <= 0) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ['rentalPrice'], message: 'أدخلي سعر الإيجار للقطع المتاحة للإيجار.' });
    }
    if (values.isForSale && values.salePrice <= 0) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ['salePrice'], message: 'أدخلي سعر البيع للقطع المتاحة للبيع.' });
    }
  });

type EditFormValues = z.infer<typeof editSchema>;

type Props = { dress: Dress | null; onClose: () => void; onSaved: (dress: Dress) => void };

function toValues(dress: Dress): EditFormValues {
  return {
    name: dress.name,
    category: dress.category,
    color: dress.color,
    size: dress.size ?? '',
    description: dress.description ?? '',
    rentalPrice: dress.rentalPrice,
    salePrice: dress.salePrice,
    securityDepositAmount: getDressSecurityDepositAmount(dress),
    discountPercent: dress.discountPercent ?? 0,
    isForRent: dress.isForRent,
    isForSale: dress.isForSale,
    notes: dress.notes ?? '',
  };
}

export function EditDressModal({ dress, onClose, onSaved }: Props) {
  const fieldId = useId();
  const [submitError, setSubmitError] = useState<unknown>(null);
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<EditFormValues>({
    resolver: zodResolver(editSchema),
    defaultValues: dress ? toValues(dress) : undefined,
  });

  useEffect(() => {
    if (!dress) return;
    reset(toValues(dress));
    setSubmitError(null);
  }, [dress, reset]);

  const isForRent = watch('isForRent');
  const isForSale = watch('isForSale');
  const discountPercent = Number(watch('discountPercent')) || 0;
  const rentalPrice = Number(watch('rentalPrice')) || 0;
  const salePrice = Number(watch('salePrice')) || 0;
  const afterDiscount = (value: number) => Math.round(value * (1 - discountPercent / 100) * 1000) / 1000;

  const onSubmit = (values: EditFormValues) => {
    if (!dress) return;
    setSubmitError(null);
    try {
      const updated = updateDressCommand(
        dress.code,
        {
          name: values.name,
          category: values.category,
          color: values.color,
          size: values.size,
          description: values.description,
          rentalPrice: values.isForRent ? values.rentalPrice : 0,
          salePrice: values.isForSale ? values.salePrice : 0,
          defaultSecurityDepositAmount: values.isForRent ? values.securityDepositAmount : 0,
          isForRent: values.isForRent,
          isForSale: values.isForSale,
          discountPercent: values.discountPercent,
          notes: values.notes || undefined,
        },
        createSubmissionKey('inventory-update'),
      );
      onSaved(updated);
      onClose();
    } catch (error: unknown) {
      setSubmitError(error);
    }
  };

  return (
    <Modal open={dress !== null} onClose={onClose} title="تعديل بيانات القطعة" className="max-w-3xl">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        {submitError !== null ? <UserFacingErrorAlert error={submitError} fallback="تعذر حفظ تعديلات القطعة." /> : null}

        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label htmlFor={`${fieldId}-name`} className={FORM_LABEL_CLASS_NAME}>اسم العنصر</label>
            <input id={`${fieldId}-name`} {...register('name')} className={FORM_FIELD_CLASS_NAME} />
            {errors.name ? <p className={FORM_ERROR_CLASS_NAME}>{errors.name.message}</p> : null}
          </div>
          <div>
            <label htmlFor={`${fieldId}-category`} className={FORM_LABEL_CLASS_NAME}>التصنيف</label>
            <select id={`${fieldId}-category`} {...register('category')} className={FORM_FIELD_CLASS_NAME}>
              {DRESS_CATEGORIES.map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor={`${fieldId}-color`} className={FORM_LABEL_CLASS_NAME}>اللون</label>
            <input id={`${fieldId}-color`} {...register('color')} className={FORM_FIELD_CLASS_NAME} />
            {errors.color ? <p className={FORM_ERROR_CLASS_NAME}>{errors.color.message}</p> : null}
          </div>
          <div>
            <label htmlFor={`${fieldId}-size`} className={FORM_LABEL_CLASS_NAME}>المقاس</label>
            <input id={`${fieldId}-size`} {...register('size')} className={FORM_FIELD_CLASS_NAME} />
          </div>
          <div>
            <label htmlFor={`${fieldId}-rental`} className={FORM_LABEL_CLASS_NAME}>سعر الإيجار</label>
            <input id={`${fieldId}-rental`} type="number" min={MIN_ZERO_AMOUNT} step={MONEY_STEP} {...register('rentalPrice')} className={FORM_FIELD_CLASS_NAME} />
            {errors.rentalPrice ? <p className={FORM_ERROR_CLASS_NAME}>{errors.rentalPrice.message}</p> : null}
          </div>
          <div>
            <label htmlFor={`${fieldId}-sale`} className={FORM_LABEL_CLASS_NAME}>سعر البيع</label>
            <input id={`${fieldId}-sale`} type="number" min={MIN_ZERO_AMOUNT} step={MONEY_STEP} {...register('salePrice')} className={FORM_FIELD_CLASS_NAME} />
            {errors.salePrice ? <p className={FORM_ERROR_CLASS_NAME}>{errors.salePrice.message}</p> : null}
          </div>
          <div>
            <label htmlFor={`${fieldId}-deposit`} className={FORM_LABEL_CLASS_NAME}>التأمين المسترد</label>
            <input id={`${fieldId}-deposit`} type="number" min={MIN_ZERO_AMOUNT} step={MONEY_STEP} {...register('securityDepositAmount')} className={FORM_FIELD_CLASS_NAME} />
          </div>
          <div>
            <label htmlFor={`${fieldId}-discount`} className={FORM_LABEL_CLASS_NAME}>نسبة الخصم %</label>
            <input id={`${fieldId}-discount`} type="number" min={0} max={100} step={1} {...register('discountPercent')} className={FORM_FIELD_CLASS_NAME} />
            {errors.discountPercent ? <p className={FORM_ERROR_CLASS_NAME}>{errors.discountPercent.message}</p> : null}
          </div>
        </div>

        <label className="block text-sm font-bold text-slate-700">
          الوصف
          <textarea rows={3} {...register('description')} className={`mt-2 ${FORM_FIELD_CLASS_NAME}`} />
        </label>

        <div className="flex flex-wrap gap-5">
          <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
            <input type="checkbox" {...register('isForRent')} className="h-4 w-4" />
            متاح للإيجار
          </label>
          <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
            <input type="checkbox" {...register('isForSale')} className="h-4 w-4" />
            متاح للبيع
          </label>
        </div>

        {discountPercent > 0 ? (
          <p className="rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-900">
            بعد الخصم: {isForRent ? `إيجار ${formatMoneyOMR(afterDiscount(rentalPrice))}` : ''}
            {isForRent && isForSale ? ' · ' : ''}
            {isForSale ? `بيع ${formatMoneyOMR(afterDiscount(salePrice))}` : ''}
          </p>
        ) : null}

        <label className="block text-sm font-bold text-slate-700">
          ملاحظات
          <textarea rows={2} {...register('notes')} className={`mt-2 ${FORM_FIELD_CLASS_NAME}`} />
        </label>

        <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>إلغاء</Button>
          <Button type="submit" disabled={isSubmitting} loading={isSubmitting} loadingLabel="جارٍ الحفظ…">حفظ التعديلات</Button>
        </div>
      </form>
    </Modal>
  );
}
