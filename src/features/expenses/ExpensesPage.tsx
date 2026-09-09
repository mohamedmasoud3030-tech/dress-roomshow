import { useMemo, useState } from 'react';
import { Download, Plus } from 'lucide-react';
import { downloadCsv } from '@platform/download';
import { buildExpensesCsv, ledgerFileName } from '../reports/ledgerExports';
import { Button } from '../../components/shared/Button';
import { PageHeader } from '../../components/shared/PageHeader';
import { SummaryCard } from '../../components/shared/SummaryCard';
import { EmptyState } from '../../components/shared/StateViews';
import { FilterBar, SearchFilter, SelectFilter } from '../../components/shared/FilterBar';
import {
  ALERT_STYLES,
  ALERT_BASE_CLASS_NAME,
  CARD_GRID_CLASS_NAME,
} from '../../shared/domain/uiConstants';
import { AddExpenseModal } from './AddExpenseModal';
import { EXPENSE_CATEGORY_FILTER_OPTIONS, EXPENSE_PAYMENT_METHOD_FILTER_OPTIONS } from './expense.constants';
import {
  filterExpenses,
  formatExpenseCategoryLabel,
  formatExpensePaymentMethodLabel,
  getExpenses,
  summarizeExpenses,
} from './expense.service';
import type { ExpenseCategory, ExpenseFilters, ExpenseRecord } from './expense.types';

const categoryBadgeClasses: Record<ExpenseCategory, string> = {
  laundry: 'bg-sky-100 text-sky-800',
  tailoring: 'bg-violet-100 text-violet-800',
  maintenance: 'bg-orange-100 text-orange-800',
  purchase: 'bg-emerald-100 text-emerald-800',
  rent: 'bg-slate-200 text-slate-800',
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
  const [expenses, setExpenses] = useState<ExpenseRecord[]>(() => getExpenses());
  const [filters, setFilters] = useState<ExpenseFilters>({
    search: '',
    category: 'all',
    paymentMethod: 'all',
  });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const filteredExpenses = useMemo(() => filterExpenses(expenses, filters), [expenses, filters]);
  const summary = useMemo(() => summarizeExpenses(expenses), [expenses]);
  const hasActiveFilters = filters.search !== '' || filters.category !== 'all' || filters.paymentMethod !== 'all';

  const handleCreated = (expense: ExpenseRecord) => {
    setExpenses((current) => [expense, ...current]);
    setFeedback(`تم تسجيل المصروف ${expense.expenseNumber} بنجاح.`);
  };

  /**
   * Exports exactly what the filters show: the accountant asks for a period or
   * a category, and an unfiltered dump makes her redo the narrowing.
   */
  const handleExport = () => {
    downloadCsv(ledgerFileName('سجل-المصروفات'), buildExpensesCsv(filteredExpenses));
  };

  return (
    <section className="min-w-0 space-y-6">
      <PageHeader
        eyebrow="المصروفات"
        title="إدارة المصروفات"
        actions={(
          <>
            <Button type="button" variant="secondary" onClick={handleExport}>
              <Download aria-hidden="true" className="h-5 w-5" />
              تصدير CSV
            </Button>
            <Button type="button" onClick={() => { setFeedback(null); setShowCreateModal(true); }} className="min-h-11">
              <Plus aria-hidden="true" className="h-5 w-5" />
              تسجيل مصروف جديد
            </Button>
          </>
        )}
      />

      {feedback && (
        <div role="status" className={`${ALERT_STYLES.success} ${ALERT_BASE_CLASS_NAME}`}>
          {feedback}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-5">
        <SummaryCard label="إجمالي المصروفات" value={formatAmount(summary.totalExpenses)} tone={summary.totalExpenses > 0 ? 'warning' : 'default'} />
        <SummaryCard label="مصروفات الغسيل" value={formatAmount(summary.laundryExpenses)} />
        <SummaryCard label="الخياطة والصيانة" value={formatAmount(summary.serviceExpenses)} />
        <SummaryCard label="مصروفات الشراء" value={formatAmount(summary.purchaseExpenses)} />
        <SummaryCard label="مصروفات أخرى" value={formatAmount(summary.otherExpenses)} />
      </div>

      <FilterBar>
        <SearchFilter
          label="البحث في المصروفات"
          value={filters.search}
          onChange={(search) => setFilters((current) => ({ ...current, search }))}
          placeholder="بحث برقم المصروف أو العنوان أو العنصر"
        />
        <SelectFilter label="فئة المصروف" value={filters.category} onChange={(category) => setFilters((current) => ({ ...current, category }))} options={EXPENSE_CATEGORY_FILTER_OPTIONS} />
        <SelectFilter label="وسيلة الدفع" value={filters.paymentMethod} onChange={(paymentMethod) => setFilters((current) => ({ ...current, paymentMethod }))} options={EXPENSE_PAYMENT_METHOD_FILTER_OPTIONS} />
        {hasActiveFilters ? (
          <Button type="button" variant="quiet" size="sm" onClick={() => setFilters({ search: '', category: 'all', paymentMethod: 'all' })} className="justify-self-start text-slate-600 hover:bg-stone-100 xl:justify-self-end">
            مسح الفلاتر
          </Button>
        ) : null}
      </FilterBar>

      {filteredExpenses.length === 0 ? (
        <EmptyState
          title={expenses.length === 0 ? 'لا توجد مصروفات بعد' : 'لا توجد مصروفات مطابقة'}
          description={expenses.length === 0 ? 'سجّلي أول مصروف تشغيلي ليظهر هنا وفي تقارير الربحية.' : 'غيّري البحث أو الفلاتر الحالية لعرض نتائج أخرى.'}
        />
      ) : (
        <div className={CARD_GRID_CLASS_NAME}>
          {filteredExpenses.map((expense) => (
            <article key={expense.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-slate-500">رقم المصروف: {expense.expenseNumber}</p>
                  <h2 className="mt-1 text-lg font-semibold text-slate-950">{expense.title}</h2>
                  {expense.relatedDressCode ? (
                    <p className="text-sm text-slate-600">
                      العنصر: {expense.relatedDressCode}
                      {expense.relatedDressName ? ` / ${expense.relatedDressName}` : ''}
                    </p>
                  ) : expense.relatedAccessoryCode ? (
                    <p className="text-sm text-slate-600">
                      الملحق: {expense.relatedAccessoryCode}
                      {expense.relatedAccessoryName ? ` / ${expense.relatedAccessoryName}` : ''}
                    </p>
                  ) : (
                    <p className="text-sm text-slate-600">غير مرتبط بعنصر محدد</p>
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
                <dt className="text-slate-500">تاريخ المصروف</dt>
                <dd>{formatDate(expense.expenseDate)}</dd>
              </dl>

              {expense.notes ? (
                <p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">{expense.notes}</p>
              ) : null}
            </article>
          ))}
        </div>
      )}

      <AddExpenseModal open={showCreateModal} onClose={() => setShowCreateModal(false)} onCreated={handleCreated} />
    </section>
  );
}
