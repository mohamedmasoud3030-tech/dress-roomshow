import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Search, ShieldCheck, Users, WalletCards } from 'lucide-react';
import { addCustomerToLocalDb, filterCustomers, getCustomers, getCustomersFromLocalDb, summarizeCustomers } from './customer.service';
import type { Customer, CustomerFilters, CustomerStatus } from './customer.types';
import { formatMoneyOMR } from '../../shared/utils/format';
import { EmptyState } from '../../components/shared/EmptyState';
import { FilterPanel } from '../../components/shared/FilterPanel';
import { PageHeader } from '../../components/shared/PageHeader';
import { SimpleModal } from '../../components/shared/SimpleModal';

const statusLabels: Record<CustomerStatus, string> = {
  normal: 'عادية',
  trusted: 'موثوقة',
  warning: 'تنبيه',
  blocked: 'محظورة',
};

const statusStyles: Record<CustomerStatus, string> = {
  normal: 'bg-slate-100 text-slate-700 ring-[#E8DED2]',
  trusted: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  warning: 'bg-amber-50 text-amber-700 ring-amber-200',
  blocked: 'bg-red-50 text-red-700 ring-red-200',
};

const statuses: Array<'all' | CustomerStatus> = ['all', 'normal', 'trusted', 'warning', 'blocked'];

type CustomerCardProps = Readonly<{ customer: Customer }>;

function CustomerCard({ customer }: CustomerCardProps) {
  return (
    <article className="rounded-2xl border border-[#E8DED2] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-slate-400">{customer.phone}</p>
          <h3 className="mt-1 text-xl font-bold text-[#1F1B18]">{customer.name}</h3>
          <p className="mt-1 text-sm text-[#7A7168]">{customer.address}</p>
        </div>
        <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ring-1 ${statusStyles[customer.status]}`}>
          {statusLabels[customer.status]}
        </span>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <div className="rounded-xl bg-[#FAF7F2] p-3">
          <p className="text-sm text-slate-400">الحجوزات</p>
          <p className="mt-1 font-bold text-[#1F1B18]">{customer.totalReservations}</p>
        </div>
        <div className="rounded-xl bg-[#FAF7F2] p-3">
          <p className="text-sm text-slate-400">النشطة</p>
          <p className="mt-1 font-bold text-[#1F1B18]">{customer.activeReservations}</p>
        </div>
        <div className="rounded-xl bg-[#FAF7F2] p-3">
          <p className="text-sm text-slate-400">المتبقي</p>
          <p className={`mt-1 font-bold ${customer.remainingBalance > 0 ? 'text-red-700' : 'text-emerald-700'}`}>
            {formatMoneyOMR(customer.remainingBalance)}
          </p>
        </div>
      </div>

      <div className="mt-5 border-t border-slate-100 pt-4 text-sm text-[#7A7168]">
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
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [draftPhone, setDraftPhone] = useState('');
  const [localCustomers, setLocalCustomers] = useState<Customer[]>([]);
  const [isDbMode, setIsDbMode] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({});
  const customers = isDbMode ? localCustomers : [...getCustomers(), ...localCustomers];

  const normalizeName = (value: string) => value.replace(/\s+/g, ' ').trim();
  const normalizePhone = (value: string) => value.replace(/[^\d+]/g, '').trim();


  useEffect(() => {
    const loadCustomers = async () => {
      const dbCustomers = await getCustomersFromLocalDb();
      if (dbCustomers) {
        setLocalCustomers(dbCustomers);
        setIsDbMode(true);
      }
    };

    void loadCustomers();
  }, []);

  const closeAddModal = () => {
    setIsAddModalOpen(false);
    setDraftName('');
    setDraftPhone('');
    setErrors({});
  };

  const submitAddCustomer = () => {
    const normalizedName = normalizeName(draftName);
    const normalizedPhone = normalizePhone(draftPhone);
    const nextErrors: { name?: string; phone?: string } = {};

    if (!normalizedName) nextErrors.name = 'اسم العميلة مطلوب.';
    if (!normalizedPhone) nextErrors.phone = 'رقم الهاتف مطلوب.';

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const customerDraft: Customer = {
      id: `local-customer-${Date.now()}`,
      name: normalizedName,
      phone: normalizedPhone,
      address: 'غير محدد',
      measurements: 'غير مسجل',
      status: 'normal',
      totalReservations: 0,
      activeReservations: 0,
      totalPaid: 0,
      remainingBalance: 0,
    };

    void (async () => {
      const persisted = await addCustomerToLocalDb(customerDraft);
      setLocalCustomers((current) => [customerDraft, ...current]);
      if (persisted) {
        setIsDbMode(true);
      }
      closeAddModal();
    })();
  };

  const filteredCustomers = useMemo(() => filterCustomers(customers, filters), [customers, filters]);
  const summary = useMemo(() => summarizeCustomers(customers), [customers]);

  return (
    <section className="space-y-6">
      <PageHeader
        eyebrow="العملاء"
        title="إدارة العملاء"
        description="عرض بيانات العملاء، الحالة، الأرصدة، وسجل التعامل المختصر."
        action={(
          <button onClick={() => setIsAddModalOpen(true)} className="rounded-xl bg-[#8B5E3C] px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#7A5133]">
            إضافة عميلة
          </button>
        )}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border border-[#E8DED2] bg-white p-5 shadow-sm">
          <Users className="mb-4 h-6 w-6 text-[#8B5E3C]" />
          <p className="text-sm text-[#7A7168]">إجمالي العملاء</p>
          <p className="mt-2 text-3xl font-bold">{summary.total}</p>
        </article>
        <article className="rounded-2xl border border-[#E8DED2] bg-white p-5 shadow-sm">
          <ShieldCheck className="mb-4 h-6 w-6 text-emerald-700" />
          <p className="text-sm text-[#7A7168]">عملاء موثوقون</p>
          <p className="mt-2 text-3xl font-bold text-emerald-700">{summary.trusted}</p>
        </article>
        <article className="rounded-2xl border border-[#E8DED2] bg-white p-5 shadow-sm">
          <WalletCards className="mb-4 h-6 w-6 text-red-700" />
          <p className="text-sm text-[#7A7168]">عليهم متبقي</p>
          <p className="mt-2 text-3xl font-bold text-red-700">{summary.withBalance}</p>
        </article>
        <article className="rounded-2xl border border-[#E8DED2] bg-white p-5 shadow-sm">
          <AlertTriangle className="mb-4 h-6 w-6 text-amber-700" />
          <p className="text-sm text-[#7A7168]">تنبيه / حظر</p>
          <p className="mt-2 text-3xl font-bold text-amber-700">{summary.blockedOrWarning}</p>
        </article>
      </div>

      <FilterPanel>
        <div className="grid gap-3 lg:grid-cols-[1fr_180px_180px]">
          <label className="relative block">
            <Search className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              value={filters.search}
              onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
              placeholder="ابحث بالاسم، الهاتف أو العنوان"
              className="h-12 w-full rounded-xl border border-[#E8DED2] bg-[#FAF7F2] pr-11 text-sm outline-none ring-[#E8DED2] transition focus:border-[#B08A5B] focus:ring-4"
            />
          </label>

          <select
            value={filters.status}
            onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value as CustomerFilters['status'] }))}
            className="h-12 rounded-xl border border-[#E8DED2] bg-[#FAF7F2] px-3 text-sm outline-none focus:border-[#B08A5B]"
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
            className="h-12 rounded-xl border border-[#E8DED2] bg-[#FAF7F2] px-3 text-sm outline-none focus:border-[#B08A5B]"
          >
            <option value="all">كل الأرصدة</option>
            <option value="with_balance">عليهم متبقي</option>
            <option value="clear">بدون متبقي</option>
          </select>
        </div>
      </FilterPanel>

      {filteredCustomers.length > 0 ? (
        <div className="grid gap-5 xl:grid-cols-2">
          {filteredCustomers.map((customer) => (
            <CustomerCard key={customer.id} customer={customer} />
          ))}
        </div>
      ) : (
        <EmptyState title="لا توجد عميلات مطابقات" description="غيّر البحث أو الفلاتر الحالية لعرض نتائج أخرى." />
      )}
      <SimpleModal open={isAddModalOpen} onClose={closeAddModal} title="إضافة عميلة" footer={<button onClick={submitAddCustomer} className="rounded-xl bg-[#8B5E3C] px-4 py-2 text-sm font-semibold text-white">حفظ محلي</button>}>
        <input value={draftName} onChange={(e)=>setDraftName(normalizeName(e.target.value))} placeholder="اسم العميلة" className="w-full rounded-xl border border-[#E8DED2] bg-[#FAF7F2] px-3 py-2 text-sm" />
        {errors.name && <p className="text-xs text-red-700">{errors.name}</p>}
        <input value={draftPhone} onChange={(e)=>setDraftPhone(normalizePhone(e.target.value))} placeholder="رقم الهاتف" className="w-full rounded-xl border border-[#E8DED2] bg-[#FAF7F2] px-3 py-2 text-sm" />
        {errors.phone && <p className="text-xs text-red-700">{errors.phone}</p>}
        <p className="text-xs text-[#7A7168]">يتم الحفظ في قاعدة البيانات المحلية داخل تطبيق سطح المكتب، مع fallback محلي في وضع الويب.</p>
      </SimpleModal>
    </section>
  );
}
