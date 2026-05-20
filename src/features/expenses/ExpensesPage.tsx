import { useMemo, useState } from 'react';
import {
  filterExpenses,
  formatExpenseCategoryLabel,
  formatExpensePaymentMethodLabel,
  getExpenses,
  summarizeExpenses,
} from './expense.service';
import { EmptyState } from '../../components/shared/EmptyState';
import { FilterPanel } from '../../components/shared/FilterPanel';
import { PageHeader } from '../../components/shared/PageHeader';
import { SimpleModal } from '../../components/shared/SimpleModal';
import { SummaryCard } from '../../components/shared/SummaryCard';
import { formatDateByLocale, formatMoneyByLocale } from '../../services/localeFormatters';
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

export function ExpensesPage() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [draftNote, setDraftNote] = useState('');

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
      <PageHeader eyebrow="المصروفات" title="إدارة المصروفات" description="متابعة مصروفات التشغيل والعناية بالفساتين داخل المتجر." action={<button className="rounded-xl bg-[#8B5E3C] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#7A5133]" onClick={() => setIsCreateModalOpen(true)}>تسجيل مصروف جديد</button>} />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <SummaryCard label="إجمالي المصروفات" value={formatMoneyByLocale(summary.totalExpenses)} />
        <SummaryCard label="مصروفات الغسيل" value={formatMoneyByLocale(summary.laundryExpenses)} />
        <SummaryCard label="الخياطة والصيانة" value={formatMoneyByLocale(summary.serviceExpenses)} />
        <SummaryCard label="مصروفات الشراء" value={formatMoneyByLocale(summary.purchaseExpenses)} />
        <SummaryCard label="مصروفات أخرى" value={formatMoneyByLocale(summary.otherExpenses)} />
      </div>

      <FilterPanel>
      <div className="grid gap-3 md:grid-cols-3">
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
      </FilterPanel>

      {filteredExpenses.length === 0 ? (
        <EmptyState title="لا توجد مصروفات مطابقة" description="غيّر الفلاتر الحالية لعرض نتائج أخرى." />
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
                <p className="text-sm font-bold text-rose-700">- {formatMoneyByLocale(expense.amount)}</p>
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
                <dd>{formatDateByLocale(expense.expenseDate)}</dd>
              </dl>

              {expense.notes ? (
                <p className="mt-3 rounded-xl bg-[#FAF7F2] p-3 text-sm text-[#7A7168]">{expense.notes}</p>
              ) : null}
            </article>
          ))}
        </div>
      )}
      <SimpleModal open={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title='تسجيل مصروف جديد' footer={<button onClick={() => setIsCreateModalOpen(false)} className='rounded-xl bg-[#8B5E3C] px-4 py-2 text-sm font-semibold text-white'>حفظ محلي</button>}>
        <textarea value={draftNote} onChange={(e)=>setDraftNote(e.target.value)} placeholder='ملاحظات العملية' className='min-h-24 w-full rounded-xl border border-[#E8DED2] bg-[#FAF7F2] px-3 py-2 text-sm' />
        <p className='text-xs text-[#7A7168]'>إجراء واجهة محلي فقط بدون تعديل مصادر البيانات الحالية.</p>
      </SimpleModal>
    </section>
  );
}
