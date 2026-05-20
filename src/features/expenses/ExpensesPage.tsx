import { useMemo, useState } from 'react';
import {
  filterExpenses,
  formatExpenseCategoryLabel,
  formatExpensePaymentMethodLabel,
  getExpenses,
  summarizeExpenses,
} from './expense.service';
import { SimpleModal } from '../../components/shared/SimpleModal';
import type { ExpenseCategory, ExpenseFilters, ExpensePaymentMethod } from './expense.types';

const categoryOptions: Array<{ value: ExpenseCategory | 'all'; label: string }> = [
  { value: 'all', label: 'كل الفئات' },
  { value: 'laundry', label: 'غسيل' },
  { value: 'tailoring', label: 'تعديل وخياطة' },
  { value: 'maintenance', label: 'صيانة' },
  { value: 'purchase', label: 'شراء' },
  { value: 'rent', label: 'إيجار' },
  { value: 'salary', label: 'رواتب' },
  { value: 'other', label: 'أخرى' },
];

const paymentMethodOptions: Array<{ value: ExpensePaymentMethod | 'all'; label: string }> = [
  { value: 'all', label: 'كل وسائل الدفع' },
  { value: 'cash', label: 'نقداً' },
  { value: 'card', label: 'بطاقة' },
  { value: 'bank_transfer', label: 'تحويل بنكي' },
  { value: 'other', label: 'أخرى' },
];

const categoryBadgeClasses: Record<ExpenseCategory, string> = {
  laundry: 'bg-sky-100 text-sky-800',
  tailoring: 'bg-[#B08A5B]/20 text-[#7A5133]',
  maintenance: 'bg-orange-100 text-orange-800',
  purchase: 'bg-emerald-100 text-emerald-800',
  rent: 'bg-[#E8DED2] text-slate-800',
  salary: 'bg-rose-100 text-rose-800',
  other: 'bg-stone-100 text-stone-700',
};

function formatAmount(amount: number): string {
  return new Intl.NumberFormat('ar-OM', {
    style: 'currency',
    currency: 'OMR',
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('ar-OM', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

export function ExpensesPage() {
  const [openModal, setOpenModal] = useState(false);
  const [localNote, setLocalNote] = useState('');

  const [filters, setFilters] = useState<ExpenseFilters>({
    search: '',
    category: 'all',
    paymentMethod: 'all',
  });

  const expenses = useMemo(() => getExpenses(), []);
  const filteredExpenses = useMemo(() => filterExpenses(expenses, filters), [expenses, filters]);
  const summary = useMemo(() => summarizeExpenses(filteredExpenses), [filteredExpenses]);

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">إدارة المصروفات</h1>
          <p className="mt-2 text-[#7A7168]">متابعة مصروفات التشغيل والعناية بالفساتين داخل المتجر.</p>
        </div>
        <button className="rounded-xl bg-[#8B5E3C] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#7A5133]" onClick={() => setOpenModal(true)}>
          تسجيل مصروف جديد
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <article className="rounded-2xl border border-[#E8DED2] bg-white p-5 shadow-sm"><p className="text-sm text-[#7A7168]">إجمالي المصروفات</p><p className="mt-2 text-2xl font-bold">{formatAmount(summary.totalExpenses)}</p></article>
        <article className="rounded-2xl border border-[#E8DED2] bg-white p-5 shadow-sm"><p className="text-sm text-[#7A7168]">مصروفات الغسيل</p><p className="mt-2 text-2xl font-bold">{formatAmount(summary.laundryExpenses)}</p></article>
        <article className="rounded-2xl border border-[#E8DED2] bg-white p-5 shadow-sm"><p className="text-sm text-[#7A7168]">الخياطة والصيانة</p><p className="mt-2 text-2xl font-bold">{formatAmount(summary.serviceExpenses)}</p></article>
        <article className="rounded-2xl border border-[#E8DED2] bg-white p-5 shadow-sm"><p className="text-sm text-[#7A7168]">مصروفات الشراء</p><p className="mt-2 text-2xl font-bold">{formatAmount(summary.purchaseExpenses)}</p></article>
        <article className="rounded-2xl border border-[#E8DED2] bg-white p-5 shadow-sm"><p className="text-sm text-[#7A7168]">مصروفات أخرى</p><p className="mt-2 text-2xl font-bold">{formatAmount(summary.otherExpenses)}</p></article>
      </div>

      <div className="grid gap-3 rounded-2xl border border-[#E8DED2] bg-white p-4 shadow-sm md:grid-cols-3">
        <input
          value={filters.search}
          onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
          placeholder="بحث برقم المصروف أو العنوان أو الفستان أو الملاحظات"
          className="rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-[#B08A5B] focus:outline-none focus:ring-2 focus:ring-[#B08A5B]/20"
        />
        <select
          value={filters.category}
          onChange={(event) =>
            setFilters((prev) => ({ ...prev, category: event.target.value as ExpenseCategory | 'all' }))
          }
          className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:border-[#B08A5B] focus:outline-none focus:ring-2 focus:ring-[#B08A5B]/20"
        >
          {categoryOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <select
          value={filters.paymentMethod}
          onChange={(event) =>
            setFilters((prev) => ({
              ...prev,
              paymentMethod: event.target.value as ExpensePaymentMethod | 'all',
            }))
          }
          className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:border-[#B08A5B] focus:outline-none focus:ring-2 focus:ring-[#B08A5B]/20"
        >
          {paymentMethodOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {filteredExpenses.length === 0 ? (
        <article className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
          <p className="text-sm text-[#7A7168]">لا توجد مصروفات مطابقة للفلاتر الحالية.</p>
        </article>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {filteredExpenses.map((expense) => (
            <article key={expense.id} className="rounded-2xl border border-[#E8DED2] bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-[#7A7168]">رقم المصروف: {expense.expenseNumber}</p>
                  <h2 className="mt-1 text-lg font-semibold text-[#1F1B18]">{expense.title}</h2>
                  {expense.relatedDressCode ? (
                    <p className="text-sm text-[#7A7168]">
                      الفستان: {expense.relatedDressCode}
                      {expense.relatedDressName ? ` / ${expense.relatedDressName}` : ''}
                    </p>
                  ) : (
                    <p className="text-sm text-[#7A7168]">غير مرتبط بفستان محدد</p>
                  )}
                </div>
                <p className="text-sm font-bold text-rose-700">- {formatAmount(expense.amount)}</p>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${categoryBadgeClasses[expense.category]}`}>
                  {formatExpenseCategoryLabel(expense.category)}
                </span>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                  {formatExpensePaymentMethodLabel(expense.paymentMethod)}
                </span>
              </div>

              <dl className="mt-4 text-sm text-slate-700">
                <dt className="text-[#7A7168]">تاريخ المصروف</dt>
                <dd>{formatDate(expense.expenseDate)}</dd>
              </dl>

              {expense.notes ? (
                <p className="mt-3 rounded-xl bg-[#FAF7F2] p-3 text-sm text-[#7A7168]">{expense.notes}</p>
              ) : null}
            </article>
          ))}
        </div>
      )}
      <SimpleModal open={openModal} onClose={() => setOpenModal(false)} title='تسجيل مصروف جديد' footer={<button onClick={() => setOpenModal(false)} className='rounded-xl bg-[#8B5E3C] px-4 py-2 text-sm font-semibold text-white'>حفظ محلي</button>}>
        <textarea value={localNote} onChange={(e)=>setLocalNote(e.target.value)} placeholder='ملاحظات العملية' className='min-h-24 w-full rounded-xl border border-[#E8DED2] bg-[#FAF7F2] px-3 py-2 text-sm' />
        <p className='text-xs text-[#7A7168]'>إجراء واجهة محلي فقط بدون تعديل مصادر البيانات الحالية.</p>
      </SimpleModal>
    </section>
  );
}
