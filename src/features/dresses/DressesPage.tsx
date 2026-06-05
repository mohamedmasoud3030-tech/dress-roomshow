import { useMemo, useState } from 'react';
import { Banknote, Eye, Plus, Printer, Search, Shirt } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/shared/PageHeader';
import { SummaryCard } from '../../components/shared/SummaryCard';
import { formatMoneyOMR } from '../../shared/utils/format';
import { AddDressModal } from './AddDressModal';
import { filterDresses, getDresses, summarizeDresses } from './dress.service';
import { SellDressModal } from './SellDressModal';
import { normalizeDressCodeIdentifier } from './barcode';
import type { SaleRecord } from './sale.service';
import type { Dress, DressCategory, DressFilters, DressStatus } from './dress.types';
import { printDressLabel } from './printDressLabel';

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
  damaged: 'bg-rose-50 text-rose-700 ring-rose-200',
  sold: 'bg-slate-100 text-slate-700 ring-slate-200',
  inactive: 'bg-slate-100 text-slate-500 ring-slate-200',
};

const categories: Array<'all' | DressCategory> = ['all', 'زفاف', 'خطوبة', 'سهرة', 'أطفال', 'أخرى'];
const statuses: Array<'all' | DressStatus> = ['all', 'available', 'reserved', 'rented', 'laundry', 'maintenance', 'damaged', 'sold', 'inactive'];

function DressCard({ dress }: { dress: Dress }) {
  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex h-48 items-center justify-center overflow-hidden bg-gradient-to-br from-violet-100 via-white to-amber-50">
        {dress.mainImageUrl ? (
          <img src={dress.mainImageUrl} alt={`صورة ${dress.name}`} loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <div className="rounded-full bg-white/80 p-6 shadow-sm ring-1 ring-slate-200">
            <Shirt aria-hidden="true" className="h-12 w-12 text-violet-700" />
          </div>
        )}
      </div>
      <div className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-slate-400" dir="ltr">{dress.code}</p>
            <h2 className="mt-1 text-lg font-bold text-slate-950">{dress.name}</h2>
            {dress.description && <p className="mt-1 text-sm leading-6 text-slate-500">{dress.description}</p>}
          </div>
          <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ring-1 ${statusStyles[dress.status]}`}>
            {statusLabels[dress.status]}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 text-sm">
          <div className="rounded-xl bg-stone-50 p-3"><p className="text-slate-400">اللون</p><p className="font-semibold text-slate-900">{dress.color}</p></div>
          <div className="rounded-xl bg-stone-50 p-3"><p className="text-slate-400">المقاس</p><p className="font-semibold text-slate-900" dir="ltr">{dress.size}</p></div>
          <div className="rounded-xl bg-stone-50 p-3"><p className="text-slate-400">الفئة</p><p className="font-semibold text-slate-900">{dress.category}</p></div>
        </div>

        <div className="grid gap-3 border-t border-slate-100 pt-4 text-sm sm:grid-cols-2">
          {dress.isForRent && <><div><p className="text-slate-400">سعر الإيجار</p><p className="font-bold text-slate-950">{formatMoneyOMR(dress.rentalPrice)}</p></div><div><p className="text-slate-400">التأمين</p><p className="font-bold text-slate-950">{formatMoneyOMR(dress.depositAmount)}</p></div></>}
          {dress.isForSale && <div><p className="text-slate-400">سعر البيع</p><p className="font-bold text-slate-950">{formatMoneyOMR(dress.salePrice)}</p></div>}
        </div>

        <div className="flex flex-wrap gap-2">
          {dress.isForRent && <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700">للإيجار</span>}
          {dress.isForSale && <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">للبيع</span>}
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">تأجر {dress.timesRented} مرات</span>
        </div>
        <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
          <Link to={`/dresses/${encodeURIComponent(dress.code)}`} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-300 px-3 text-sm font-bold text-slate-700"><Eye className="h-4 w-4" />التفاصيل</Link>
          <button type="button" onClick={() => printDressLabel(dress)} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-300 px-3 text-sm font-bold text-slate-700"><Printer className="h-4 w-4" />ملصق</button>
        </div>
      </div>
    </article>
  );
}

export function DressesPage() {
  const [dresses, setDresses] = useState<Dress[]>(() => getDresses());
  const [filters, setFilters] = useState<DressFilters>({ search: '', status: 'all', category: 'all', usage: 'all' });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [quickCode, setQuickCode] = useState('');
  const navigate = useNavigate();

  const filteredDresses = useMemo(() => filterDresses(dresses, filters), [dresses, filters]);
  const summary = useMemo(() => summarizeDresses(dresses), [dresses]);

  const handleCreated = (dress: Dress) => {
    setDresses((current) => [dress, ...current]);
    setFeedback(`تمت إضافة الفستان ${dress.code} بنجاح.`);
  };

  const handleSold = (sale: SaleRecord) => {
    setDresses(getDresses());
    setFeedback(`تم تسجيل البيع ${sale.saleNumber} للفستان ${sale.dressCode}.`);
  };

  const openQuickCode = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalized = normalizeDressCodeIdentifier(quickCode);
    const dress = dresses.find((item) => normalizeDressCodeIdentifier(item.code) === normalized);
    if (!dress) { setFeedback('لم يتم العثور على فستان بهذا الكود.'); return; }
    navigate(`/dresses/${encodeURIComponent(dress.code)}`);
  };

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <PageHeader eyebrow="المخزون" title="الفساتين" description="إدارة فساتين المحل وحالاتها وأسعار البيع والإيجار والتأمين من سجل واحد واضح." />
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={() => { setFeedback(null); setShowSaleModal(true); }} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-800 shadow-sm transition hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"><Banknote aria-hidden="true" className="h-5 w-5" />بيع فستان</button>
          <button type="button" onClick={() => { setFeedback(null); setShowCreateModal(true); }} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"><Plus aria-hidden="true" className="h-5 w-5" />إضافة فستان</button>
        </div>
      </div>

      {feedback && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">{feedback}</div>}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="إجمالي الفساتين" value={summary.total} />
        <SummaryCard label="متاحة الآن" value={summary.available} tone="positive" />
        <SummaryCard label="مؤجرة حالياً" value={summary.rented} />
        <SummaryCard label="مغسلة أو تعديل" value={summary.inService} tone={summary.inService > 0 ? 'warning' : 'default'} />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <form onSubmit={openQuickCode} className="mb-3 grid gap-3 lg:grid-cols-[1fr_150px]"><label className="relative block"><span className="sr-only">فتح الفستان بالكود</span><Search aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" /><input type="search" value={quickCode} onChange={(event) => setQuickCode(event.target.value)} placeholder="امسحي الباركود أو أدخلي كود الفستان للفتح المباشر" className="h-12 w-full rounded-xl border border-amber-200 bg-amber-50/40 pr-11 text-sm outline-none transition focus-visible:border-amber-500 focus-visible:ring-2 focus-visible:ring-amber-500/30" /></label><button type="submit" className="min-h-12 rounded-xl bg-amber-600 px-4 text-sm font-bold text-white">فتح الكود</button></form>
        <div className="grid gap-3 lg:grid-cols-[1fr_180px_180px_180px]">
          <label className="relative block"><span className="sr-only">البحث في الفساتين</span><Search aria-hidden="true" className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" /><input type="search" value={filters.search} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} placeholder="ابحثي بالكود أو الاسم أو اللون أو المقاس" className="h-12 w-full rounded-xl border border-slate-200 bg-stone-50 pr-11 text-sm outline-none transition focus-visible:border-amber-500 focus-visible:ring-2 focus-visible:ring-amber-500/30" /></label>
          <label><span className="sr-only">حالة الفستان</span><select value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value as DressFilters['status'] }))} className="h-12 w-full rounded-xl border border-slate-200 bg-stone-50 px-3 text-sm outline-none transition focus-visible:border-amber-500 focus-visible:ring-2 focus-visible:ring-amber-500/30">{statuses.map((status) => <option key={status} value={status}>{status === 'all' ? 'كل الحالات' : statusLabels[status]}</option>)}</select></label>
          <label><span className="sr-only">فئة الفستان</span><select value={filters.category} onChange={(event) => setFilters((current) => ({ ...current, category: event.target.value as DressFilters['category'] }))} className="h-12 w-full rounded-xl border border-slate-200 bg-stone-50 px-3 text-sm outline-none transition focus-visible:border-amber-500 focus-visible:ring-2 focus-visible:ring-amber-500/30">{categories.map((category) => <option key={category} value={category}>{category === 'all' ? 'كل الفئات' : category}</option>)}</select></label>
          <label><span className="sr-only">نوع استخدام الفستان</span><select value={filters.usage} onChange={(event) => setFilters((current) => ({ ...current, usage: event.target.value as DressFilters['usage'] }))} className="h-12 w-full rounded-xl border border-slate-200 bg-stone-50 px-3 text-sm outline-none transition focus-visible:border-amber-500 focus-visible:ring-2 focus-visible:ring-amber-500/30"><option value="all">كل الاستخدامات</option><option value="rent">للإيجار</option><option value="sale">للبيع</option></select></label>
        </div>
      </div>

      {filteredDresses.length > 0 ? <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">{filteredDresses.map((dress) => <DressCard key={dress.id} dress={dress} />)}</div> : <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm"><p className="text-lg font-semibold text-slate-900">لا توجد فساتين مطابقة</p><p className="mt-2 text-sm text-slate-500">غيّري البحث أو الفلاتر الحالية لعرض نتائج أخرى.</p></div>}

      <AddDressModal open={showCreateModal} onClose={() => setShowCreateModal(false)} onCreated={handleCreated} />
      <SellDressModal open={showSaleModal} onClose={() => setShowSaleModal(false)} onCreated={handleSold} />
    </section>
  );
}
