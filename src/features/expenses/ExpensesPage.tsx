import { useState } from 'react';
import { Plus, Receipt } from 'lucide-react';
import { PageHeader } from '../../components/shared/PageHeader';
import { SummaryCard } from '../../components/shared/SummaryCard';
import {
  getExpenses,
  filterExpenses,
  summarizeExpenses,
  formatExpenseCategoryLabel,
  formatExpensePaymentMethodLabel,
  deleteExpense,
} from './expense.service';
import { AddExpenseModal } from './AddExpenseModal';
import type { ExpenseFilters, ExpenseRecord } from './expense.types';
import { formatMoneyOMR } from '../../shared/utils/format';
import { formatDateAr } from '../../shared/utils/date';

export function ExpensesPage() {
  const [expenses, setExpenses] = useState<ExpenseRecord[]>(() => getExpenses());
  const [filters, setFilters] = useState<ExpenseFilters>({ search: '', category: 'all', paymentMethod: 'all' });
  const [showAdd, setShowAdd] = useState(false);

  const filtered = filterExpenses(expenses, filters);
  const summary = summarizeExpenses(expenses);

  const handleDelete = (id: string) => {
    if (!confirm('هل أنت متأكدة من حذف هذا المصروف؟')) return;
    deleteExpense(id);
    setExpenses(getExpenses());
  };

  return (
    <div className="min-h-full">
      <PageHeader
        title="المصاريف"
        subtitle={`${expenses.length} سجل`}
        action={
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 bg-violet-700 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-violet-800 transition"
          >
            <Plus className="w-4 h-4" />
            إضافة مصروف
          </button>
        }
      />

      {/* Summary */}
      <div className="px-4 md:px-6 py-4 grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard label="إجمالي المصاريف" value={formatMoneyOMR(summary.totalExpenses)} icon={Receipt} color="rose" />
        <SummaryCard label="غسيل" value={formatMoneyOMR(summary.laundryExpenses)} icon={Receipt} color="blue" />
        <SummaryCard label="خياطة/صيانة" value={formatMoneyOMR(summary.serviceExpenses)} icon={Receipt} color="amber" />
        <SummaryCard label="شراء" value={formatMoneyOMR(summary.purchaseExpenses)} icon={Receipt} color="violet" />
      </div>

      {/* Filters */}
      <div className="px-4 md:px-6 pb-3 flex flex-wrap gap-2">
        <input
          type="search"
          placeholder="بحث..."
          value={filters.search}
          onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
          className="flex-1 min-w-48 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
        />
        <select
          value={filters.category}
          onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value as ExpenseFilters['category'] }))}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white focus:outline-none"
        >
          <option value="all">كل الفئات</option>
          {(['laundry', 'tailoring', 'maintenance', 'purchase', 'rent', 'salary', 'other'] as const).map((c) => (
            <option key={c} value={c}>{formatExpenseCategoryLabel(c)}</option>
          ))}
        </select>
      </div>

      {/* List */}
      <div className="px-4 md:px-6 pb-8 space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <Receipt className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">
              {expenses.length === 0 ? 'لا توجد مصاريف مسجلة.' : 'لا توجد نتائج.'}
            </p>
          </div>
        ) : (
          filtered.map((e) => (
            <div key={e.id} className="bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="font-semibold text-slate-900 truncate">{e.title}</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                    {formatExpenseCategoryLabel(e.category)}
                  </span>
                  <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                    {formatExpensePaymentMethodLabel(e.paymentMethod)}
                  </span>
                  <span className="text-xs text-slate-400">{formatDateAr(e.expenseDate)}</span>
                  {e.relatedDressCode && (
                    <span className="text-xs text-violet-600">{e.relatedDressCode}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <p className="text-base font-bold text-rose-600">{formatMoneyOMR(e.amount)}</p>
                <button
                  onClick={() => handleDelete(e.id)}
                  className="text-xs text-slate-400 hover:text-rose-600 transition"
                >
                  حذف
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <AddExpenseModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onSuccess={(expense) => setExpenses((prev) => [expense, ...prev])}
      />
    </div>
  );
}
