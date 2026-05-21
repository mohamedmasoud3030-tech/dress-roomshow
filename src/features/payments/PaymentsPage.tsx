import { useState } from 'react';
import { Plus, CreditCard } from 'lucide-react';
import { PageHeader } from '../../components/shared/PageHeader';
import { SummaryCard } from '../../components/shared/SummaryCard';
import { StatusBadge } from '../../components/shared/StatusBadge';
import {
  getPayments,
  filterPayments,
  summarizePayments,
  formatPaymentTypeLabel,
  formatPaymentMethodLabel,
} from './payment.service';
import { AddPaymentModal } from './AddPaymentModal';
import type { PaymentFilters, PaymentRecord } from './payment.types';
import { formatMoneyOMR } from '../../shared/utils/format';
import { formatDateAr } from '../../shared/utils/date';

export function PaymentsPage() {
  const [payments, setPayments] = useState<PaymentRecord[]>(() => getPayments());
  const [filters, setFilters] = useState<PaymentFilters>({ search: '', type: 'all', method: 'all', direction: 'all' });
  const [showAdd, setShowAdd] = useState(false);

  const filtered = filterPayments(payments, filters);
  const summary = summarizePayments(payments);

  return (
    <div className="min-h-full">
      <PageHeader
        title="المدفوعات"
        subtitle={`${payments.length} دفعة`}
        action={
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 bg-violet-700 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-violet-800 transition"
          >
            <Plus className="w-4 h-4" />
            تسجيل دفعة
          </button>
        }
      />

      {/* Summary */}
      <div className="px-4 md:px-6 py-4 grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard label="إجمالي المحصّل" value={formatMoneyOMR(summary.totalCollected)} icon={CreditCard} color="emerald" />
        <SummaryCard label="العربونات" value={formatMoneyOMR(summary.deposits)} icon={CreditCard} color="blue" />
        <SummaryCard label="الغرامات" value={formatMoneyOMR(summary.penalties)} icon={CreditCard} color="amber" />
        <SummaryCard label="المستحق الكلي" value={formatMoneyOMR(summary.remainingBalance)} icon={CreditCard} color="rose" />
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
          value={filters.direction}
          onChange={(e) => setFilters((f) => ({ ...f, direction: e.target.value as PaymentFilters['direction'] }))}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white focus:outline-none"
        >
          <option value="all">الكل</option>
          <option value="income">تحصيل</option>
          <option value="refund">استرجاع</option>
        </select>
      </div>

      {/* List */}
      <div className="px-4 md:px-6 pb-8 space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">
              {payments.length === 0 ? 'لا توجد دفعات مسجلة.' : 'لا توجد نتائج.'}
            </p>
          </div>
        ) : (
          filtered.map((p) => (
            <div key={p.id} className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-slate-900">{p.customerName}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{p.paymentNumber} • {p.reservationNumber} • {p.dressCode}</p>
                </div>
                <StatusBadge
                  label={p.direction === 'income' ? 'تحصيل' : 'استرجاع'}
                  color={p.direction === 'income' ? 'emerald' : 'rose'}
                />
              </div>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                <div className="flex gap-4 text-sm text-slate-600">
                  <span>{formatPaymentTypeLabel(p.type)}</span>
                  <span>•</span>
                  <span>{formatPaymentMethodLabel(p.method)}</span>
                  <span>•</span>
                  <span>{formatDateAr(p.paymentDate)}</span>
                </div>
                <p className={`text-base font-bold ${p.direction === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {p.direction === 'refund' && '−'}{formatMoneyOMR(p.amount)}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      <AddPaymentModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onSuccess={(payment) => setPayments((prev) => [payment, ...prev])}
      />
    </div>
  );
}
