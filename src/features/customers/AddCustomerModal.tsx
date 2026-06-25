import { useEffect, useId, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Modal } from '../../components/shared/Modal';
import { UserFacingErrorAlert } from '../../components/shared/UserFacingErrorAlert';
import { addCustomer } from './customer.service';
import type { Customer } from './customer.types';

const customerSchema = z.object({
  name: z.string().trim().min(2, 'اكتبي اسم العميلة بشكل واضح.').max(100, 'الاسم طويل جداً.'),
  phone: z.string().trim().min(7, 'رقم الهاتف غير صالح.').max(20, 'رقم الهاتف غير صالح.'),
  address: z.string().trim().max(160, 'العنوان طويل جداً.').optional(),
  measurements: z.string().trim().max(250, 'تفاصيل المقاسات طويلة جداً.').optional(),
  status: z.enum(['normal', 'trusted', 'warning', 'blocked']),
  notes: z.string().trim().max(500, 'الملاحظات يجب ألا تتجاوز 500 حرف.').optional(),
});

type CustomerFormValues = z.infer<typeof customerSchema>;

type AddCustomerModalProps = {
  open: boolean;
  onClose: () => void;
  onCreated: (customer: Customer) => void;
};

const fieldClassName =
  'min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 transition placeholder:text-slate-400 focus-visible:border-amber-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/30';
const labelClassName = 'mb-1.5 block text-sm font-bold text-slate-700';
const errorClassName = 'mt-1 text-xs font-medium text-rose-700';

function getDefaultValues(): CustomerFormValues {
  return {
    name: '',
    phone: '',
    address: '',
    measurements: '',
    status: 'normal',
    notes: '',
  };
}

export function AddCustomerModal({ open, onClose, onCreated }: AddCustomerModalProps) {
  const fieldId = useId();
  const [submitError, setSubmitError] = useState<unknown>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: getDefaultValues(),
  });

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

  const onSubmit = (values: CustomerFormValues) => {
    setSubmitError(null);

    try {
      const customer = addCustomer(values);
      onCreated(customer);
      closeModal();
    } catch (error: unknown) {
      setSubmitError(error);
    }
  };

  return (
    <Modal open={open} onClose={closeModal} title="إضافة عميلة جديدة" className="max-w-2xl">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        {submitError !== null && (
          <UserFacingErrorAlert error={submitError} fallback="تعذر إضافة العميلة. حاولي مرة أخرى." />
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label htmlFor={`${fieldId}-name`} className={labelClassName}>اسم العميلة</label>
            <input id={`${fieldId}-name`} autoComplete="name" {...register('name')} className={fieldClassName} placeholder="الاسم الكامل" />
            {errors.name && <p className={errorClassName}>{errors.name.message}</p>}
          </div>
          <div>
            <label htmlFor={`${fieldId}-phone`} className={labelClassName}>رقم الهاتف</label>
            <input
              id={`${fieldId}-phone`}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              dir="ltr"
              {...register('phone')}
              className={fieldClassName}
              placeholder="9XXXXXXX"
            />
            {errors.phone && <p className={errorClassName}>{errors.phone.message}</p>}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label htmlFor={`${fieldId}-address`} className={labelClassName}>العنوان</label>
            <input id={`${fieldId}-address`} autoComplete="address-level2" {...register('address')} className={fieldClassName} placeholder="المحافظة / المنطقة" />
            {errors.address && <p className={errorClassName}>{errors.address.message}</p>}
          </div>
          <div>
            <label htmlFor={`${fieldId}-status`} className={labelClassName}>تصنيف العميلة</label>
            <select id={`${fieldId}-status`} {...register('status')} className={fieldClassName}>
              <option value="normal">عادية</option>
              <option value="trusted">موثوقة</option>
              <option value="warning">تنبيه</option>
              <option value="blocked">محظورة</option>
            </select>
          </div>
        </div>

        <div>
          <label htmlFor={`${fieldId}-measurements`} className={labelClassName}>المقاسات</label>
          <textarea
            id={`${fieldId}-measurements`}
            rows={3}
            maxLength={250}
            {...register('measurements')}
            className={fieldClassName}
            placeholder="مثال: الطول 165 سم، المقاس M، وملاحظات التفصيل"
          />
          {errors.measurements && <p className={errorClassName}>{errors.measurements.message}</p>}
        </div>

        <div>
          <label htmlFor={`${fieldId}-notes`} className={labelClassName}>ملاحظات التعامل</label>
          <textarea id={`${fieldId}-notes`} rows={3} maxLength={500} {...register('notes')} className={fieldClassName} placeholder="ملاحظات اختيارية عن التفضيلات أو المتابعة" />
          {errors.notes && <p className={errorClassName}>{errors.notes.message}</p>}
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={closeModal}
            className="min-h-11 rounded-xl border border-slate-300 px-5 py-2 text-sm font-bold text-slate-700 transition hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
          >
            إلغاء
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="min-h-11 rounded-xl bg-slate-950 px-5 py-2 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
          >
            {isSubmitting ? 'جارٍ الحفظ...' : 'إضافة العميلة'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
