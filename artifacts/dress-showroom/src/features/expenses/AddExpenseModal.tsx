import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '../../components/shared/Modal';
import { addExpense, formatExpenseCategoryLabel, formatExpensePaymentMethodLabel } from './expense.service';
import type { ExpenseRecord } from './expense.types';

const schema = z.object({
  title: z.string().min(1, 'العنوان مطلوب'),
  category: z.enum(['laundry', 'tailoring', 'maintenance', 'purchase', 'rent', 'salary', 'other']),
  amount: z.coerce.number().min(0.001, 'المبلغ مطلوب'),
  paymentMethod: z.enum(['cash', 'card', 'bank_transfer', 'other']),
  relatedDressCode: z.string().optional().default(''),
  notes: z.string().optional().default(''),
});

type FormValues = z.infer<typeof schema>;

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess: (expense: ExpenseRecord) => void;
};

export function AddExpenseModal({ open, onClose, onSuccess }: Props) {
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { category: 'laundry', paymentMethod: 'cash' },
  });

  const onSubmit = (values: FormValues) => {
    const expense = addExpense({
      title: values.title,
      category: values.category,
      amount: values.amount,
      paymentMethod: values.paymentMethod,
      relatedDressCode: values.relatedDressCode || undefined,
      notes: values.notes,
    });
    reset();
    onSuccess(expense);
    onClose();
  };

  const inputCls = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 transition';
  const labelCls = 'block text-sm font-medium text-slate-700 mb-1';
  const errorCls = 'text-xs text-rose-600 mt-1';

  return (
    <Modal open={open} onClose={onClose} title="إضافة مصروف">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className={labelCls}>العنوان / الوصف *</label>
          <input {...register('title')} placeholder="مثال: غسيل فستان زفاف" className={inputCls} />
          {errors.title && <p className={errorCls}>{errors.title.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>الفئة *</label>
            <select {...register('category')} className={inputCls}>
              {(['laundry', 'tailoring', 'maintenance', 'purchase', 'rent', 'salary', 'other'] as const).map((c) => (
                <option key={c} value={c}>{formatExpenseCategoryLabel(c)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>طريقة الدفع</label>
            <select {...register('paymentMethod')} className={inputCls}>
              {(['cash', 'card', 'bank_transfer', 'other'] as const).map((m) => (
                <option key={m} value={m}>{formatExpensePaymentMethodLabel(m)}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className={labelCls}>المبلغ (ر.ع) *</label>
          <input type="number" step="0.001" {...register('amount')} placeholder="0.000" className={inputCls} />
          {errors.amount && <p className={errorCls}>{errors.amount.message}</p>}
        </div>

        <div>
          <label className={labelCls}>كود الفستان المرتبط (اختياري)</label>
          <input {...register('relatedDressCode')} placeholder="DR-001" className={inputCls} dir="ltr" />
        </div>

        <div>
          <label className={labelCls}>ملاحظات</label>
          <textarea {...register('notes')} rows={2} className={inputCls} />
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={isSubmitting} className="flex-1 bg-violet-700 text-white font-semibold py-2.5 rounded-lg hover:bg-violet-800 disabled:opacity-60 transition">
            إضافة المصروف
          </button>
          <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 transition text-sm">
            إلغاء
          </button>
        </div>
      </form>
    </Modal>
  );
}
