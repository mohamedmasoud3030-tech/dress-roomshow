import { useState } from 'react';
import { Plus, Shirt } from 'lucide-react';
import { PageHeader } from '../../components/shared/PageHeader';
import { SummaryCard } from '../../components/shared/SummaryCard';
import { StatusBadge, dressStatusBadge } from '../../components/shared/StatusBadge';
import { getDresses, filterDresses, summarizeDresses } from './dress.service';
import { AddDressModal } from './AddDressModal';
import type { Dress, DressFilters } from './dress.types';
import { formatMoneyOMR } from '../../shared/utils/format';

export function DressesPage() {
  const [dresses, setDresses] = useState<Dress[]>(() => getDresses());
  const [filters, setFilters] = useState<DressFilters>({
    search: '',
    status: 'all',
    category: 'all',
    usage: 'all',
  });
  const [showAdd, setShowAdd] = useState(false);

  const filtered = filterDresses(dresses, filters);
  const summary = summarizeDresses(dresses);

  const handleSuccess = (dress: Dress) => {
    setDresses((prev) => [dress, ...prev]);
  };

  const badge = (status: string) => {
    const { label, color } = dressStatusBadge(status);
    return <StatusBadge label={label} color={color} />;
  };

  return (
    <div className="min-h-full">
      <PageHeader
        title="الفساتين"
        subtitle={`${summary.total} فستان`}
        action={
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 bg-violet-700 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-violet-800 transition"
          >
            <Plus className="w-4 h-4" />
            إضافة فستان
          </button>
        }
      />

      {/* Summary */}
      <div className="px-4 md:px-6 py-4 grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard label="الإجمالي" value={summary.total} icon={Shirt} color="violet" />
        <SummaryCard label="متاحة" value={summary.available} icon={Shirt} color="emerald" />
        <SummaryCard label="مؤجرة" value={summary.rented} icon={Shirt} color="blue" />
        <SummaryCard label="في الخدمة" value={summary.inService} icon={Shirt} color="amber" />
      </div>

      {/* Filters */}
      <div className="px-4 md:px-6 pb-3 flex flex-wrap gap-2">
        <input
          type="search"
          placeholder="بحث بالاسم أو الكود..."
          value={filters.search}
          onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
          className="flex-1 min-w-48 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
        />
        <select
          value={filters.status}
          onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value as DressFilters['status'] }))}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
        >
          <option value="all">كل الحالات</option>
          <option value="available">متاح</option>
          <option value="reserved">محجوز</option>
          <option value="rented">مؤجر</option>
          <option value="laundry">غسيل</option>
          <option value="maintenance">صيانة</option>
          <option value="damaged">تالف</option>
          <option value="sold">مباع</option>
          <option value="inactive">غير نشط</option>
        </select>
        <select
          value={filters.category}
          onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value as DressFilters['category'] }))}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-violet-500"
        >
          <option value="all">كل الفئات</option>
          <option value="زفاف">زفاف</option>
          <option value="خطوبة">خطوبة</option>
          <option value="سهرة">سهرة</option>
          <option value="أطفال">أطفال</option>
          <option value="أخرى">أخرى</option>
        </select>
      </div>

      {/* List */}
      <div className="px-4 md:px-6 pb-8">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <Shirt className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">
              {dresses.length === 0 ? 'لا توجد فساتين. ابدأ بإضافة فستان جديد.' : 'لا توجد نتائج تطابق البحث.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {filtered.map((dress) => (
              <div key={dress.id} className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-sm transition">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-semibold text-slate-900">{dress.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{dress.code} • {dress.category}</p>
                  </div>
                  {badge(dress.status)}
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-600 mt-3">
                  <span>اللون: {dress.color}</span>
                  <span>•</span>
                  <span>المقاس: {dress.size}</span>
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                  <div>
                    <p className="text-xs text-slate-400">سعر الإيجار</p>
                    <p className="text-sm font-bold text-violet-700">{formatMoneyOMR(dress.rentalPrice)}</p>
                  </div>
                  <div className="text-start">
                    <p className="text-xs text-slate-400">عدد الإيجارات</p>
                    <p className="text-sm font-semibold text-slate-700">{dress.timesRented} مرة</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AddDressModal open={showAdd} onClose={() => setShowAdd(false)} onSuccess={handleSuccess} />
    </div>
  );
}
