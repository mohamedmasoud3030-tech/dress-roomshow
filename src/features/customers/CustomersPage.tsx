import { useMemo, useState } from 'react';
import { AlertTriangle, Search, ShieldCheck, Users, WalletCards } from 'lucide-react';
import { filterCustomers, getCustomers, summarizeCustomers } from './customer.service';
import type { Customer, CustomerFilters, CustomerStatus } from './customer.types';
import { formatMoneyOMR } from '../../shared/utils/format';

const statusLabels: Record<CustomerStatus, string> = {
  normal: 'عادية',
  trusted: 'موثوقة',
  warning: 'تنبيه',
  blocked: 'محظورة',
};

const statusStyles: Record<CustomerStatus, string> = {
  normal: 'bg-slate-100 text-slate-700 ring-slate-200',
  trusted: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  warning: 'bg-amber-50 text-amber-700 ring-amber-200',
  blocked: 'bg-red-50 text-red-700 ring-red-200',
};

const statuses: Array<'all' | CustomerStatus> = ['all', 'normal', 'trusted', 'warning', 'blocked'];

function CustomerCard({ customer }: { customer: Customer }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-slate-400">{customer.phone}</p>
          <h3 className="mt-1 text-xl font-bold text-slate-950">{customer.name}</h3>
          <p className="mt-1 text-sm text-slate-500">{customer.address}</p>
        </div>
        <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ring-1 ${statusStyles[customer.status]}`}>
          {statusLabels[customer.status]}
        </span>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-sm text-slate-400">الحجوزات</p>
          <p className="mt-1 font-bold text-slate-950">{customer.totalReservations}</p>
        </div>
        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-sm text-slate-400">النشطة</p>
          <p className="mt-1 font-bold text-slate-950">{customer.activeReservations}</p>
        </div>
        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-sm text-slate-400">المتبقي</p>
          <p className={`mt-1 font-bold ${customer.remainingBalance > 0 ? 'text-red-700' : 'text-emerald-700'}`}>
            {formatMoneyOMR(customer.remainingBalance)}
          </p>
        </div>
      </div>

      <div className="mt-5 border-t border-slate-100 pt-4 text-sm text-slate-600">
        <p><span className="font-semibold text-slate-900">المقاسات:</span> {customer.measurements}</p>
        {customer.lastReservationDate && (
          <p className="mt-2"><span className="font-semibold text-slate-900">آخر حجز:</span> {customer.lastReservationDate}</p>
        )}
        {customer.notes && <p className="mt-2 rounded-xl bg-amber-50 p-3 text-amber-800">{customer.notes}</p>}
      </div>
    </article>
  );
}

export function CustomersPage() {
  const [filters, setFilters] = useState<CustomerFilters>({ search: '', status: 'all', balance: 'all' });
  const customers = getCustomers();

  const filteredCustomers = useMemo(() => filterCustomers(customers, filters), [customers, filters]);
  const summary = useMemo(() => summarizeCustomers(customers), [customers]);

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className="text-sm font-semibold text-violet-700">العملاء</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">إدارة العملاء</h1>
          <p className="mt-2 text-slate-600">عرض بيانات العملاء، الحالة، الأرصدة، وسجل التعامل المختصر.</p>
        </div>
        <button className="rounded-xl bg-violet-700 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-violet-800">
          إضافة عميلة
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <Users className="mb-4 h-6 w-6 text-violet-700" />
          <p className="text-sm text-slate-500">إجمالي العملاء</p>
          <p className="mt-2 text-3xl font-bold">{summary.total}</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <ShieldCheck className="mb-4 h-6 w-6 text-emerald-700" />
          <p className="text-sm text-slate-500">عملاء موثوقون</p>
          <p className="mt-2 text-3xl font-bold text-emerald-700">{summary.trusted}</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <WalletCards className="mb-4 h-6 w-6 text-red-700" />
          <p className="text-sm text-slate-500">عليهم متبقي</p>
          <p className="mt-2 text-3xl font-bold text-red-700">{summary.withBalance}</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <AlertTriangle className="mb-4 h-6 w-6 text-amber-700" />
          <p className="text-sm text-slate-500">تنبيه / حظر</p>
          <p className="mt-2 text-3xl font-bold text-amber-700">{summary.blockedOrWarning}</p>
        </article>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[1fr_180px_180px]">
          <label className="relative block">
            <Search className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              value={filters.search}
              onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
              placeholder="ابحث بالاسم، الهاتف أو العنوان"
              className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pr-11 text-sm outline-none ring-violet-200 transition focus:border-violet-300 focus:ring-4"
            />
          </label>

          <select
            value={filters.status}
            onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value as CustomerFilters['status'] }))}
            className="h-12 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-violet-300"
          >
            {statuses.map((status) => (
              <option key={status} value={status}>
                {status === 'all' ? 'كل الحالات' : statusLabels[status]}
              </option>
            ))}
          </select>

          <select
            value={filters.balance}
            onChange={(event) => setFilters((current) => ({ ...current, balance: event.target.value as CustomerFilters['balance'] }))}
            className="h-12 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-violet-300"
          >
            <option value="all">كل الأرصدة</option>
            <option value="with_balance">عليهم متبقي</option>
            <option value="clear">بدون متبقي</option>
          </select>
        </div>
      </div>

      {filteredCustomers.length > 0 ? (
        <div className="grid gap-5 xl:grid-cols-2">
          {filteredCustomers.map((customer) => (
            <CustomerCard key={customer.id} customer={customer} />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
          <p className="text-lg font-semibold text-slate-900">لا توجد عميلات مطابقات</p>
          <p className="mt-2 text-sm text-slate-500">غيّر البحث أو الفلاتر الحالية لعرض نتائج أخرى.</p>
        </div>
      )}
    </section>
  );
}
