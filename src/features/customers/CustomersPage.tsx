import { useState } from 'react';
import { Plus, Users, Phone } from 'lucide-react';
import { PageHeader } from '../../components/shared/PageHeader';
import { SummaryCard } from '../../components/shared/SummaryCard';
import { StatusBadge, customerStatusBadge } from '../../components/shared/StatusBadge';
import { getCustomers, filterCustomers, summarizeCustomers } from './customer.service';
import { AddCustomerModal } from './AddCustomerModal';
import type { Customer, CustomerFilters } from './customer.types';
import { formatMoneyOMR } from '../../shared/utils/format';

export function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>(() => getCustomers());
  const [filters, setFilters] = useState<CustomerFilters>({ search: '', status: 'all', balance: 'all' });
  const [showAdd, setShowAdd] = useState(false);

  const filtered = filterCustomers(customers, filters);
  const summary = summarizeCustomers(customers);

  return (
    <div className="min-h-full">
      <PageHeader
        title="العميلات"
        subtitle={`${summary.total} عميلة`}
        action={
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 bg-violet-700 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-violet-800 transition"
          >
            <Plus className="w-4 h-4" />
            إضافة عميلة
          </button>
        }
      />

      {/* Summary */}
      <div className="px-4 md:px-6 py-4 grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard label="الإجمالي" value={summary.total} icon={Users} color="violet" />
        <SummaryCard label="موثوقات" value={summary.trusted} icon={Users} color="emerald" />
        <SummaryCard label="لديهن رصيد" value={summary.withBalance} icon={Users} color="amber" />
        <SummaryCard label="تحذير/محظورة" value={summary.blockedOrWarning} icon={Users} color="rose" />
      </div>

      {/* Filters */}
      <div className="px-4 md:px-6 pb-3 flex flex-wrap gap-2">
        <input
          type="search"
          placeholder="بحث بالاسم أو الهاتف..."
          value={filters.search}
          onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
          className="flex-1 min-w-48 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
        />
        <select
          value={filters.status}
          onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value as CustomerFilters['status'] }))}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
        >
          <option value="all">كل التصنيفات</option>
          <option value="trusted">موثوقة</option>
          <option value="normal">عادي</option>
          <option value="warning">تحذير</option>
          <option value="blocked">محظورة</option>
        </select>
        <select
          value={filters.balance}
          onChange={(e) => setFilters((f) => ({ ...f, balance: e.target.value as CustomerFilters['balance'] }))}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
        >
          <option value="all">كل الأرصدة</option>
          <option value="with_balance">لديهن رصيد</option>
          <option value="clear">الرصيد مسدد</option>
        </select>
      </div>

      {/* List */}
      <div className="px-4 md:px-6 pb-8">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">
              {customers.length === 0 ? 'لا توجد عميلات. ابدأ بإضافة عميلة جديدة.' : 'لا توجد نتائج.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {filtered.map((c) => {
              const { label, color } = customerStatusBadge(c.status);
              return (
                <div key={c.id} className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-sm transition">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold text-slate-900">{c.name}</p>
                      <a href={`tel:${c.phone}`} className="flex items-center gap-1 text-xs text-slate-500 mt-0.5 hover:text-violet-600">
                        <Phone className="w-3 h-3" />
                        {c.phone}
                      </a>
                    </div>
                    <StatusBadge label={label} color={color} />
                  </div>
                  {c.address && <p className="text-xs text-slate-500 mt-2">{c.address}</p>}
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                    <div>
                      <p className="text-xs text-slate-400">إجمالي الحجوزات</p>
                      <p className="text-sm font-semibold text-slate-700">{c.totalReservations}</p>
                    </div>
                    {c.remainingBalance > 0 && (
                      <div className="text-start">
                        <p className="text-xs text-slate-400">الرصيد المستحق</p>
                        <p className="text-sm font-bold text-rose-600">{formatMoneyOMR(c.remainingBalance)}</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <AddCustomerModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        onSuccess={(c) => setCustomers((prev) => [c, ...prev])}
      />
    </div>
  );
}
