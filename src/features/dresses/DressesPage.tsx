import { useMemo, useState } from 'react';
import { Search, Shirt, Sparkles, Wrench } from 'lucide-react';
import { filterDresses, getDresses, summarizeDresses } from './dress.service';
import type { Dress, DressCategory, DressFilters, DressStatus } from './dress.types';

const statusLabels: Record<DressStatus, string> = {
  available: 'متاح',
  reserved: 'محجوز',
  rented: 'مؤجر',
  laundry: 'في المغسلة',
  maintenance: 'تحت التعديل',
  damaged: 'تالف',
  sold: 'مباع',
  inactive: 'غير نشط',
};

const statusStyles: Record<DressStatus, string> = {
  available: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  reserved: 'bg-amber-50 text-amber-700 ring-amber-200',
  rented: 'bg-violet-50 text-violet-700 ring-violet-200',
  laundry: 'bg-sky-50 text-sky-700 ring-sky-200',
  maintenance: 'bg-orange-50 text-orange-700 ring-orange-200',
  damaged: 'bg-red-50 text-red-700 ring-red-200',
  sold: 'bg-slate-100 text-slate-700 ring-slate-200',
  inactive: 'bg-slate-100 text-slate-500 ring-slate-200',
};

const categories: Array<'all' | DressCategory> = ['all', 'زفاف', 'خطوبة', 'سهرة', 'أطفال', 'أخرى'];
const statuses: Array<'all' | DressStatus> = ['all', 'available', 'reserved', 'rented', 'laundry', 'maintenance', 'damaged', 'sold', 'inactive'];

function formatMoney(value: number) {
  return new Intl.NumberFormat('ar-OM', {
    style: 'currency',
    currency: 'OMR',
    minimumFractionDigits: 3,
  }).format(value);
}

function DressCard({ dress }: { dress: Dress }) {
  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex h-48 items-center justify-center bg-gradient-to-br from-violet-100 via-white to-amber-50">
        <div className="rounded-full bg-white/80 p-6 shadow-sm ring-1 ring-slate-200">
          <Shirt className="h-12 w-12 text-violet-700" />
        </div>
      </div>
      <div className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-slate-400">{dress.code}</p>
            <h3 className="mt-1 text-lg font-bold text-slate-950">{dress.name}</h3>
            <p className="mt-1 text-sm text-slate-500">{dress.description}</p>
          </div>
          <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ring-1 ${statusStyles[dress.status]}`}>
            {statusLabels[dress.status]}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 text-sm">
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-slate-400">اللون</p>
            <p className="font-semibold text-slate-900">{dress.color}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-slate-400">المقاس</p>
            <p className="font-semibold text-slate-900">{dress.size}</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-slate-400">الفئة</p>
            <p className="font-semibold text-slate-900">{dress.category}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 text-sm">
          <div>
            <p className="text-slate-400">سعر الإيجار</p>
            <p className="font-bold text-slate-950">{formatMoney(dress.rentalPrice)}</p>
          </div>
          <div>
            <p className="text-slate-400">التأمين</p>
            <p className="font-bold text-slate-950">{formatMoney(dress.depositAmount)}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {dress.isForRent && <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700">للإيجار</span>}
          {dress.isForSale && <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">للبيع</span>}
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">تأجر {dress.timesRented} مرات</span>
        </div>
      </div>
    </article>
  );
}

export function DressesPage() {
  const [filters, setFilters] = useState<DressFilters>({ search: '', status: 'all', category: 'all', usage: 'all' });
  const dresses = getDresses();

  const filteredDresses = useMemo(() => filterDresses(dresses, filters), [dresses, filters]);
  const summary = useMemo(() => summarizeDresses(dresses), [dresses]);

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className="text-sm font-semibold text-violet-700">المخزون</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">الفساتين</h1>
          <p className="mt-2 text-slate-600">إدارة فساتين المحل وحالاتها وأسعار الإيجار والتأمين.</p>
        </div>
        <button className="rounded-xl bg-violet-700 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-violet-800">
          إضافة فستان
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <Sparkles className="mb-4 h-6 w-6 text-violet-700" />
          <p className="text-sm text-slate-500">إجمالي الفساتين</p>
          <p className="mt-2 text-3xl font-bold">{summary.total}</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">متاحة الآن</p>
          <p className="mt-2 text-3xl font-bold text-emerald-700">{summary.available}</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">مؤجرة حاليًا</p>
          <p className="mt-2 text-3xl font-bold text-violet-700">{summary.rented}</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <Wrench className="mb-4 h-6 w-6 text-orange-600" />
          <p className="text-sm text-slate-500">مغسلة / تعديل</p>
          <p className="mt-2 text-3xl font-bold text-orange-600">{summary.inService}</p>
        </article>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[1fr_180px_180px_180px]">
          <label className="relative block">
            <Search className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              value={filters.search}
              onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
              placeholder="ابحث بالكود، الاسم، اللون أو المقاس"
              className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pr-11 text-sm outline-none ring-violet-200 transition focus:border-violet-300 focus:ring-4"
            />
          </label>

          <select
            value={filters.status}
            onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value as DressFilters['status'] }))}
            className="h-12 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-violet-300"
          >
            {statuses.map((status) => (
              <option key={status} value={status}>
                {status === 'all' ? 'كل الحالات' : statusLabels[status]}
              </option>
            ))}
          </select>

          <select
            value={filters.category}
            onChange={(event) => setFilters((current) => ({ ...current, category: event.target.value as DressFilters['category'] }))}
            className="h-12 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-violet-300"
          >
            {categories.map((category) => (
              <option key={category} value={category}>
                {category === 'all' ? 'كل الفئات' : category}
              </option>
            ))}
          </select>

          <select
            value={filters.usage}
            onChange={(event) => setFilters((current) => ({ ...current, usage: event.target.value as DressFilters['usage'] }))}
            className="h-12 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-violet-300"
          >
            <option value="all">كل الاستخدامات</option>
            <option value="rent">للإيجار</option>
            <option value="sale">للبيع</option>
          </select>
        </div>
      </div>

      {filteredDresses.length > 0 ? (
        <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
          {filteredDresses.map((dress) => (
            <DressCard key={dress.id} dress={dress} />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
          <p className="text-lg font-semibold text-slate-900">لا توجد فساتين مطابقة</p>
          <p className="mt-2 text-sm text-slate-500">غيّر البحث أو الفلاتر الحالية لعرض نتائج أخرى.</p>
        </div>
      )}
    </section>
  );
}
