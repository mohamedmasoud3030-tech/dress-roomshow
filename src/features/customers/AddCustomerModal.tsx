import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '../../components/shared/Modal';
import { addCustomer } from './customer.service';
import type { Customer } from './customer.types';

const schema = z.object({
  name: z.string().min(1, 'الاسم مطلوب'),
  phone: z.string().min(7, 'رقم الهاتف مطلوب'),
  address: z.string().optional().default(''),
  measurements: z.string().optional().default(''),
  status: z.enum(['normal', 'trusted', 'warning', 'blocked']).default('normal'),
  notes: z.string().optional().default(''),
});

type FormValues = z.infer<typeof schema>;

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess: (customer: Customer) => void;
};

export function AddCustomerModal({ open, onClose, onSuccess }: Props) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { status: 'normal' } });

  const onSubmit = (values: FormValues) => {
    const customer = addCustomer({
      name: values.name,
      phone: values.phone,
      address: values.address ?? '',
      measurements: values.measurements ?? '',
      status: values.status,
      notes: values.notes,
    });
    reset();
    onSuccess(customer);
    onClose();
  };

  const inputCls = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition';
  const labelCls = 'block text-sm font-medium text-slate-700 mb-1';
  const errorCls = 'text-xs text-rose-600 mt-1';

  return (
    <Modal open={open} onClose={onClose} title="إضافة عميلة جديدة">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className={labelCls}>الاسم الكامل *</label>
          <input {...register('name')} placeholder="اسم العميلة" className={inputCls} />
          {errors.name && <p className={errorCls}>{errors.name.message}</p>}
        </div>

        <div>
          <label className={labelCls}>رقم الهاتف *</label>
          <input {...register('phone')} placeholder="9XXXXXXX" className={inputCls} dir="ltr" />
          {errors.phone && <p className={errorCls}>{errors.phone.message}</p>}
        </div>

        <div>
          <label className={labelCls}>العنوان</label>
          <input {...register('address')} placeholder="المحافظة / المنطقة" className={inputCls} />
        </div>

        <div>
          <label className={labelCls}>المقاسات</label>
          <input {...register('measurements')} placeholder="مثال: صدر 90 / خصر 70 / أرداف 96" className={inputCls} />
        </div>

        <div>
          <label className={labelCls}>تصنيف العميلة</label>
          <select {...register('status')} className={inputCls}>
            <option value="normal">عادي</option>
            <option value="trusted">موثوقة</option>
            <option value="warning">تحذير</option>
            <option value="blocked">محظورة</option>
          </select>
        </div>

        <div>
          <label className={labelCls}>ملاحظات</label>
          <textarea {...register('notes')} rows={2} placeholder="ملاحظات اختيارية..." className={inputCls} />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 bg-violet-700 text-white font-semibold py-2.5 rounded-lg hover:bg-violet-800 disabled:opacity-60 transition"
          >
            إضافة العميلة
          </button>
          <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 transition text-sm">
            إلغاء
          </button>
        </div>
      </form>
    </Modal>
  );
}
