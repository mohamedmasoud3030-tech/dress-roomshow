import { useMemo, useState } from 'react';
import { Search, Shirt, Sparkles, Wrench } from 'lucide-react';
import { filterDresses, getDresses, summarizeDresses } from './dress.service';
import type { Dress, DressCategory, DressFilters, DressStatus } from './dress.types';
import { formatMoneyOMR } from '../../shared/utils/format';
import { EmptyState } from '../../components/shared/EmptyState';
import { FilterPanel } from '../../components/shared/FilterPanel';
import { PageHeader } from '../../components/shared/PageHeader';
import { SimpleModal } from '../../components/shared/SimpleModal';
import { SummaryCard } from '../../components/shared/SummaryCard';

type DressDraft = {
  code: string;
  name: string;
  description: string;
  category: DressCategory;
  color: string;
  size: string;
  rentalPrice: string;
  depositAmount: string;
};

const createInitialDressDraft = (): DressDraft => ({
  code: '',
  name: '',
  description: '',
  category: 'زفاف',
  color: '',
  size: '',
  rentalPrice: '',
  depositAmount: '',
});

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
  rented: 'bg-[#B08A5B]/15 text-[#8B5E3C] ring-[#E8DED2]',
  laundry: 'bg-sky-50 text-sky-700 ring-sky-200',
  maintenance: 'bg-orange-50 text-orange-700 ring-orange-200',
  damaged: 'bg-red-50 text-red-700 ring-red-200',
  sold: 'bg-slate-100 text-slate-700 ring-[#E8DED2]',
  inactive: 'bg-slate-100 text-[#7A7168] ring-[#E8DED2]',
};

const categories: Array<'all' | DressCategory> = ['all', 'زفاف', 'خطوبة', 'سهرة', 'أطفال', 'أخرى'];
const statuses: Array<'all' | DressStatus> = ['all', 'available', 'reserved', 'rented', 'laundry', 'maintenance', 'damaged', 'sold', 'inactive'];

type DressCardProps = Readonly<{ dress: Dress; onQuickReserve: (dress: Dress) => void; onViewDetails: (dress: Dress) => void }>;

function DressCard({ dress, onQuickReserve, onViewDetails }: DressCardProps) {
  return (
    <article className="overflow-hidden rounded-2xl border border-[#E8DED2] bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex h-48 items-center justify-center bg-gradient-to-br from-[#B08A5B]/20 via-white to-amber-50">
        <div className="rounded-full bg-white/80 p-6 shadow-sm ring-1 ring-[#E8DED2]">
          <Shirt className="h-12 w-12 text-[#8B5E3C]" />
        </div>
      </div>
      <div className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-slate-400">{dress.code}</p>
            <h3 className="mt-1 text-lg font-bold text-[#1F1B18]">{dress.name}</h3>
            <p className="mt-1 text-sm text-[#7A7168]">{dress.description}</p>
          </div>
          <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ring-1 ${statusStyles[dress.status]}`}>
            {statusLabels[dress.status]}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2 text-sm">
          <div className="rounded-xl bg-[#FAF7F2] p-3">
            <p className="text-slate-400">اللون</p>
            <p className="font-semibold text-slate-900">{dress.color}</p>
          </div>
          <div className="rounded-xl bg-[#FAF7F2] p-3">
            <p className="text-slate-400">المقاس</p>
            <p className="font-semibold text-slate-900">{dress.size}</p>
          </div>
          <div className="rounded-xl bg-[#FAF7F2] p-3">
            <p className="text-slate-400">الفئة</p>
            <p className="font-semibold text-slate-900">{dress.category}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 text-sm">
          <div>
            <p className="text-slate-400">سعر الإيجار</p>
            <p className="font-bold text-[#1F1B18]">{formatMoneyOMR(dress.rentalPrice)}</p>
          </div>
          <div>
            <p className="text-slate-400">التأمين</p>
            <p className="font-bold text-[#1F1B18]">{formatMoneyOMR(dress.depositAmount)}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {dress.isForRent && <span className="rounded-full bg-[#B08A5B]/15 px-3 py-1 text-xs font-medium text-[#8B5E3C]">للإيجار</span>}
          {dress.isForSale && <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">للبيع</span>}
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-[#7A7168]">تأجر {dress.timesRented} مرات</span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => onQuickReserve(dress)} className="rounded-xl bg-[#8B5E3C] px-3 py-2 text-sm font-semibold text-white">حجز سريع</button>
          <button onClick={() => onViewDetails(dress)} className="rounded-xl border border-[#E8DED2] px-3 py-2 text-sm font-semibold text-[#8B5E3C]">تفاصيل</button>
        </div>
      </div>
    </article>
  );
}

export function DressesPage() {
  const [filters, setFilters] = useState<DressFilters>({ search: '', status: 'all', category: 'all', usage: 'all' });
  const [selectedDress, setSelectedDress] = useState<Dress | null>(null);
  const [modalType, setModalType] = useState<'add' | 'reserve' | 'details' | null>(null);
  const [localDresses, setLocalDresses] = useState<Dress[]>([]);
  const [dressDraft, setDressDraft] = useState<DressDraft>(createInitialDressDraft());
  const [dressErrors, setDressErrors] = useState<Partial<Record<keyof DressDraft, string>>>({});
  const dresses = [...getDresses(), ...localDresses];

  const closeModal = () => {
    setModalType(null);
    setSelectedDress(null);
    setDressDraft(createInitialDressDraft());
    setDressErrors({});
  };

  const validateDressDraft = () => {
    const errors: Partial<Record<keyof DressDraft, string>> = {};
    if (!dressDraft.code.trim()) errors.code = 'الكود مطلوب.';
    if (!dressDraft.name.trim()) errors.name = 'اسم الفستان مطلوب.';
    if (!dressDraft.category) errors.category = 'الفئة مطلوبة.';
    if (!dressDraft.color.trim()) errors.color = 'اللون مطلوب.';
    if (!dressDraft.size.trim()) errors.size = 'المقاس مطلوب.';
    if (!dressDraft.rentalPrice.trim() || Number(dressDraft.rentalPrice) <= 0) errors.rentalPrice = 'سعر الإيجار مطلوب ويكون أكبر من صفر.';
    if (!dressDraft.depositAmount.trim() || Number(dressDraft.depositAmount) < 0) errors.depositAmount = 'التأمين مطلوب ولا يكون سالباً.';
    setDressErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const submitDress = () => {
    if (!validateDressDraft()) return;
    const nowId = `local-dress-${Date.now()}`;
    setLocalDresses((current) => [
      {
        id: nowId,
        code: dressDraft.code.trim().toUpperCase(),
        name: dressDraft.name.trim(),
        description: dressDraft.description.trim() || 'بدون وصف',
        category: dressDraft.category,
        color: dressDraft.color.trim(),
        size: dressDraft.size.trim(),
        purchasePrice: 0,
        rentalPrice: Number(dressDraft.rentalPrice),
        salePrice: 0,
        depositAmount: Number(dressDraft.depositAmount),
        status: 'available',
        isForRent: true,
        isForSale: false,
        timesRented: 0,
      },
      ...current,
    ]);
    closeModal();
  };

  const filteredDresses = useMemo(() => filterDresses(dresses, filters), [dresses, filters]);
  const summary = useMemo(() => summarizeDresses(dresses), [dresses]);

  return (
    <section className="space-y-6">
      <PageHeader
        eyebrow="المخزون"
        title="الفساتين"
        description="إدارة فساتين المحل وحالاتها وأسعار الإيجار والتأمين."
        action={<button onClick={() => { setSelectedDress(null); setModalType('add'); }} className="rounded-xl bg-[#8B5E3C] px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#7A5133]">إضافة فستان</button>}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border border-[#E8DED2] bg-white p-5 shadow-sm">
          <Sparkles className="mb-4 h-6 w-6 text-[#8B5E3C]" />
          <p className="text-sm text-[#7A7168]">إجمالي الفساتين</p>
          <p className="mt-2 text-3xl font-bold">{summary.total}</p>
        </article>
        <SummaryCard label="متاحة الآن" value={summary.available} valueClassName="text-emerald-700" />
        <SummaryCard label="مؤجرة حاليًا" value={summary.rented} valueClassName="text-[#8B5E3C]" />
        <article className="rounded-2xl border border-[#E8DED2] bg-white p-5 shadow-sm">
          <Wrench className="mb-4 h-6 w-6 text-orange-600" />
          <p className="text-sm text-[#7A7168]">مغسلة / تعديل</p>
          <p className="mt-2 text-3xl font-bold text-orange-600">{summary.inService}</p>
        </article>
      </div>

      <FilterPanel>
        <div className="grid gap-3 lg:grid-cols-[1fr_180px_180px_180px]">
          <label className="relative block">
            <Search className="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              value={filters.search}
              onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
              placeholder="ابحث بالكود، الاسم، اللون أو المقاس"
              className="h-12 w-full rounded-xl border border-[#E8DED2] bg-[#FAF7F2] pr-11 text-sm outline-none ring-[#E8DED2] transition focus:border-[#B08A5B] focus:ring-4"
            />
          </label>

          <select
            value={filters.status}
            onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value as DressFilters['status'] }))}
            className="h-12 rounded-xl border border-[#E8DED2] bg-[#FAF7F2] px-3 text-sm outline-none focus:border-[#B08A5B]"
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
            className="h-12 rounded-xl border border-[#E8DED2] bg-[#FAF7F2] px-3 text-sm outline-none focus:border-[#B08A5B]"
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
            className="h-12 rounded-xl border border-[#E8DED2] bg-[#FAF7F2] px-3 text-sm outline-none focus:border-[#B08A5B]"
          >
            <option value="all">كل الاستخدامات</option>
            <option value="rent">للإيجار</option>
            <option value="sale">للبيع</option>
          </select>
        </div>
      </FilterPanel>

      {filteredDresses.length > 0 ? (
        <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
          {filteredDresses.map((dress) => (
            <DressCard key={dress.id} dress={dress} onQuickReserve={(item)=>{setSelectedDress(item);setModalType('reserve');}} onViewDetails={(item)=>{setSelectedDress(item);setModalType('details');}} />
          ))}
        </div>
      ) : (
        <EmptyState title="لا توجد فساتين مطابقة" description="غيّر البحث أو الفلاتر الحالية لعرض نتائج أخرى." />
      )}
      <SimpleModal
        open={modalType !== null}
        onClose={closeModal}
        title={modalType === 'add' ? 'إضافة فستان' : modalType === 'reserve' ? 'حجز سريع' : 'تفاصيل الفستان'}
        footer={
          modalType === 'add' ? (
            <button className="rounded-xl bg-[#8B5E3C] px-4 py-2 text-sm font-semibold text-white" onClick={submitDress}>حفظ محلي</button>
          ) : (
            <button className="rounded-xl bg-[#8B5E3C] px-4 py-2 text-sm font-semibold text-white" onClick={closeModal}>تم</button>
          )
        }
      >
        {modalType === 'add' && (
          <>
            <input value={dressDraft.code} onChange={(event) => setDressDraft((current) => ({ ...current, code: event.target.value }))} placeholder="كود الفستان" className="w-full rounded-xl border border-[#E8DED2] bg-[#FAF7F2] px-3 py-2 text-sm" />
            {dressErrors.code && <p className="text-xs text-red-700">{dressErrors.code}</p>}
            <input value={dressDraft.name} onChange={(event) => setDressDraft((current) => ({ ...current, name: event.target.value }))} placeholder="اسم الفستان" className="w-full rounded-xl border border-[#E8DED2] bg-[#FAF7F2] px-3 py-2 text-sm" />
            {dressErrors.name && <p className="text-xs text-red-700">{dressErrors.name}</p>}
            <textarea value={dressDraft.description} onChange={(event) => setDressDraft((current) => ({ ...current, description: event.target.value }))} placeholder="الوصف" className="h-24 w-full rounded-xl border border-[#E8DED2] bg-[#FAF7F2] px-3 py-2 text-sm" />
            <select value={dressDraft.category} onChange={(event) => setDressDraft((current) => ({ ...current, category: event.target.value as DressCategory }))} className="w-full rounded-xl border border-[#E8DED2] bg-[#FAF7F2] px-3 py-2 text-sm">
              {categories.filter((category): category is DressCategory => category !== 'all').map((category) => <option key={category} value={category}>{category}</option>)}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <input value={dressDraft.color} onChange={(event) => setDressDraft((current) => ({ ...current, color: event.target.value }))} placeholder="اللون" className="w-full rounded-xl border border-[#E8DED2] bg-[#FAF7F2] px-3 py-2 text-sm" />
              <input value={dressDraft.size} onChange={(event) => setDressDraft((current) => ({ ...current, size: event.target.value }))} placeholder="المقاس" className="w-full rounded-xl border border-[#E8DED2] bg-[#FAF7F2] px-3 py-2 text-sm" />
            </div>
            {(dressErrors.color || dressErrors.size) && <p className="text-xs text-red-700">{dressErrors.color ?? dressErrors.size}</p>}
            <div className="grid grid-cols-2 gap-2">
              <input type="number" min="0" step="0.001" value={dressDraft.rentalPrice} onChange={(event) => setDressDraft((current) => ({ ...current, rentalPrice: event.target.value }))} placeholder="سعر الإيجار" className="w-full rounded-xl border border-[#E8DED2] bg-[#FAF7F2] px-3 py-2 text-sm" />
              <input type="number" min="0" step="0.001" value={dressDraft.depositAmount} onChange={(event) => setDressDraft((current) => ({ ...current, depositAmount: event.target.value }))} placeholder="مبلغ التأمين" className="w-full rounded-xl border border-[#E8DED2] bg-[#FAF7F2] px-3 py-2 text-sm" />
            </div>
            {(dressErrors.rentalPrice || dressErrors.depositAmount) && <p className="text-xs text-red-700">{dressErrors.rentalPrice ?? dressErrors.depositAmount}</p>}
            <p className="text-xs text-[#7A7168]">لا يتم حفظ الفستان في بيانات mock الحالية ضمن هذا الإصدار.</p>
          </>
        )}
        {modalType === 'reserve' && selectedDress && <p className="text-sm text-[#7A7168]">نقطة دخول الحجز السريع جاهزة للفستان: <span className="font-semibold">{selectedDress.name}</span>. سيتم ربطها بتدفق الحجوزات لاحقاً.</p>}
        {selectedDress && (
          <>
            <p className="text-sm text-[#7A7168]">{selectedDress.code} — {selectedDress.name}</p>
            <p className="text-sm">المقاس: <span className="font-semibold">{selectedDress.size}</span> | اللون: <span className="font-semibold">{selectedDress.color}</span></p>
            <p className="text-sm">الإيجار: <span className="font-semibold">{formatMoneyOMR(selectedDress.rentalPrice)}</span> | التأمين: <span className="font-semibold">{formatMoneyOMR(selectedDress.depositAmount)}</span></p>
            <p className="text-sm">الفئة: <span className="font-semibold">{selectedDress.category}</span> | الحالة: <span className="font-semibold">{statusLabels[selectedDress.status]}</span></p>
            <p className="text-sm">الوصف: <span className="font-semibold">{selectedDress.description}</span></p>
          </>
        )}
      </SimpleModal>
    </section>
  );
}
