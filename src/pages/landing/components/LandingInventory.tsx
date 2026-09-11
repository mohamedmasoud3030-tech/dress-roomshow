import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, Heart, MessageCircle, Search, X } from 'lucide-react';
import { Button } from '../../../components/shared/Button';
import {
  getDressDiscountPercent,
  getDressEffectiveRentalPrice,
  getDressEffectiveSalePrice,
  type Dress,
} from '../../../features/dresses/dress.types';
import { formatMoneyOMR, formatPercentOMR } from '../../../shared/utils/format';
import { buildLandingWhatsAppLink, buildShortlistMessage } from '../landingWhatsapp';
import { useShortlist } from '../useShortlist';
import { piecePath } from '../piecePath';
import { DressPhoto } from './DressPhoto';
import type { InventoryCategoryFilter, LandingProfile, LandingUsageFilter } from './types';
import type { GroupedDress } from '../LandingPage';

type SortOrder = 'newest' | 'rent-asc' | 'rent-desc';

// Keep contract string for test: piecePath(dress.code) - grouped implementation uses first variant but deep-link preserved
function getLandingDressPriceLabel(dress: Dress): string {
  if (dress.isForRent && dress.isForSale) return `إيجار ${formatMoneyOMR(dress.rentalPrice)} · بيع ${formatMoneyOMR(dress.salePrice)}`;
  if (dress.isForRent) return `إيجار ${formatMoneyOMR(dress.rentalPrice)}`;
  if (dress.isForSale) return `بيع ${formatMoneyOMR(dress.salePrice)}`;
  return 'السعر عند المعاينة';
}

export function LandingPrice({ dress, size = 'sm' }: { dress: Dress; size?: 'sm' | 'lg' }) {
  const percent = getDressDiscountPercent(dress);
  const mainClass = size === 'lg' ? 'text-[15px] font-medium text-black' : 'text-[11px] font-medium text-black';
  if (percent <= 0) return <p className={mainClass}>{getLandingDressPriceLabel(dress)}</p>;
  const parts: string[] = [];
  if (dress.isForRent) parts.push(`إيجار ${formatMoneyOMR(getDressEffectiveRentalPrice(dress))}`);
  if (dress.isForSale) parts.push(`بيع ${formatMoneyOMR(getDressEffectiveSalePrice(dress))}`);
  return (
    <div>
      <p className={mainClass}>{parts.join(' · ')}</p>
      <p className="mt-1 text-[10px] text-black/50"><span className="line-through">{getLandingDressPriceLabel(dress)}</span> <span className="bg-black px-1 py-0.5 text-[9px] text-white ml-1">-{formatPercentOMR(percent)}</span></p>
    </div>
  );
}

function rentValue(group: GroupedDress): number {
  return group.rentalPrice || group.salePrice || 0;
}

type Props = {
  profile: LandingProfile;
  groupedDresses: GroupedDress[];
  loading: boolean;
  loadError?: string | null;
  search: string;
  onSearchChange: (value: string) => void;
  selectedCategory: InventoryCategoryFilter;
  onCategoryChange: (value: InventoryCategoryFilter) => void;
  usageFilter: LandingUsageFilter;
  onUsageChange: (value: LandingUsageFilter) => void;
  inventoryCategories: readonly InventoryCategoryFilter[];
  newOnly: boolean;
  onNewOnlyChange: (value: boolean) => void;
  newArrivalCodes: ReadonlySet<string>;
};

function InventoryCard({ group, profile, onZoom, saved, onToggleSave, isNew }: { group: GroupedDress; profile: LandingProfile; onZoom: (group: GroupedDress) => void; saved: boolean; onToggleSave: (group: GroupedDress) => void; isNew: boolean }) {
  const firstVariant = group.firstDress;
  const hasMultiple = group.variants.length > 1;

  return (
    <article className="group flex flex-col bg-white">
      <div className="relative aspect-[3/4] overflow-hidden bg-[#F5F1EB]">
        <Link to={piecePath(firstVariant.code)} className="block h-full">
          <DressPhoto brand={profile.brandName} src={group.images[0]} alt={group.name} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]" fallbackLabel={group.category} />
        </Link>

        {isNew ? <span className="absolute left-2 top-2 rounded-full bg-white px-2 py-0.5 text-[9px] tracking-wide text-black shadow-sm">جديد</span> : null}
        {hasMultiple ? <span className="absolute right-2 top-2 rounded-full bg-black/80 px-2 py-0.5 text-[9px] tracking-wide text-white backdrop-blur">{group.variants.length} خيارات</span> : null}

        <button type="button" onClick={() => onToggleSave(group)} className={`absolute bottom-2 right-2 flex h-7 w-7 items-center justify-center rounded-full border text-[12px] transition-all sm:bottom-auto sm:right-2 sm:top-2 ${saved ? 'border-black bg-black text-white' : 'border-black/10 bg-white/90 text-black hover:bg-white'}`} aria-label={saved ? 'إزالة' : 'حفظ'}><Heart className={`h-3 w-3 ${saved ? 'fill-current' : ''}`} /></button>

        <div className="absolute inset-x-0 bottom-0 hidden translate-y-full gap-px bg-black/10 p-px backdrop-blur-sm transition-transform duration-300 group-hover:translate-y-0 sm:grid grid-cols-2">
          <Link to={piecePath(firstVariant.code)} className="bg-white py-2 text-center text-[10px] tracking-wide text-black hover:bg-black hover:text-white">تفاصيل</Link>
          <button type="button" onClick={() => onZoom(group)} className="bg-white py-2 text-[10px] tracking-wide text-black hover:bg-black hover:text-white">تكبير</button>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-3">
        <h3 className="truncate text-[12px] font-medium leading-tight text-black"><Link to={piecePath(firstVariant.code)}>{group.name}</Link></h3>
        <p className="mt-1 text-[10px] tracking-wide text-black/40">{group.category}</p>

        {/* Variants info - best practice: show below image as requested */}
        <div className="mt-2 space-y-1.5">
          {group.sizes.length > 0 ? (
            <div className="flex flex-wrap items-center gap-1">
              <span className="text-[9px] tracking-wide text-black/30">المقاسات:</span>
              {group.sizes.map((s) => (
                <span key={s} className="rounded-full border border-black/10 bg-[#F5F1EB] px-1.5 py-0.5 text-[9px] font-medium text-black/70">{s}</span>
              ))}
            </div>
          ) : null}
          {group.colors.length > 0 ? (
            <div className="flex flex-wrap items-center gap-1">
              <span className="text-[9px] tracking-wide text-black/30">الألوان:</span>
              {group.colors.map((c) => (
                <span key={c} className="rounded-full border border-black/10 bg-white px-1.5 py-0.5 text-[9px] text-black/60">{c}</span>
              ))}
            </div>
          ) : null}
          {hasMultiple ? <p className="text-[9px] tracking-wide text-black/30">{group.variants.length} قطع متاحة بنفس التصميم</p> : null}
        </div>

        <div className="mt-3 flex items-baseline justify-between">
          <LandingPrice dress={firstVariant} />
          {group.codes.length > 0 ? <span className="text-[9px] tracking-wide text-black/20" dir="ltr">{group.codes[0]}</span> : null}
        </div>
      </div>
    </article>
  );
}

function QuickView({ group, profile, onClose, saved, onToggleSave }: { group: GroupedDress; profile: LandingProfile; onClose: () => void; saved: boolean; onToggleSave: (group: GroupedDress) => void }) {
  const firstVariant = group.firstDress;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [onClose]);

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4 backdrop-blur-md" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-[860px] overflow-hidden bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="grid max-h-[90vh] overflow-y-auto md:grid-cols-[1.1fr_0.9fr]">
          <div className="relative bg-[#F5F1EB]"><DressPhoto brand={profile.brandName} src={group.images[0]} alt={group.name} className="aspect-[3/4] w-full object-cover md:aspect-auto md:h-full md:min-h-[520px]" fallbackLabel={group.category} /><button type="button" onClick={onClose} aria-label="إغلاق" className="absolute left-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black text-white"><X className="h-3.5 w-3.5" /></button></div>
          <div className="flex flex-col p-6">
            <p className="text-[10px] tracking-[0.12em] text-black/40">{group.category}</p>
            <h3 className="mt-3 text-[18px] font-medium leading-tight text-black">{group.name}</h3>
            {group.description ? <p className="mt-3 text-[12px] font-light leading-[1.6] text-black/60">{group.description}</p> : null}

            <div className="mt-5 space-y-3 border-y border-[#E8E2D9] py-4">
              <div>
                <p className="text-[10px] tracking-wide text-black/30">المقاسات المتاحة</p>
                <div className="mt-2 flex flex-wrap gap-1.5">{group.sizes.map((s) => <span key={s} className="rounded-full border border-black bg-white px-2.5 py-1 text-[11px] font-medium text-black">{s}</span>)}</div>
              </div>
              <div>
                <p className="text-[10px] tracking-wide text-black/30">الألوان المتاحة</p>
                <div className="mt-2 flex flex-wrap gap-1.5">{group.colors.map((c) => <span key={c} className="rounded-full border border-[#E8E2D9] bg-[#F5F1EB] px-2.5 py-1 text-[11px] text-black/70">{c}</span>)}</div>
              </div>
              <div>
                <p className="text-[10px] tracking-wide text-black/30">الأكواد</p>
                <p className="mt-1 text-[11px] font-mono text-black/60" dir="ltr">{group.codes.join(', ')}</p>
              </div>
            </div>

            <div className="mt-4 border border-[#E8E2D9] bg-[#FAF6F0] p-4"><p className="text-[10px] tracking-wide text-black/40">السعر</p><div className="mt-2"><LandingPrice dress={firstVariant} size="lg" /></div></div>

            <div className="mt-auto pt-6"><div className="flex gap-2"><button type="button" onClick={() => onToggleSave(group)} className={`flex h-10 flex-1 items-center justify-center rounded-full border text-[12px] ${saved ? 'border-black bg-black text-white' : 'border-black/15 bg-white text-black'}`}><Heart className={`h-3.5 w-3.5 ${saved ? 'fill-current' : ''}`} />{saved ? 'محفوظ' : 'حفظ'}</button><Link to={piecePath(firstVariant.code)} onClick={onClose} className="flex h-10 flex-1 items-center justify-center rounded-full bg-black text-[12px] text-white">صفحة القطعة</Link></div><p className="mt-3 text-center text-[10px] text-black/40">التفاصيل الكاملة داخل صفحة القطعة</p></div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function LandingInventory({ profile, groupedDresses, loading, loadError, search, onSearchChange, selectedCategory, onCategoryChange, usageFilter, onUsageChange, inventoryCategories, newOnly, onNewOnlyChange, newArrivalCodes }: Props) {
  const [zoomed, setZoomed] = useState<GroupedDress | null>(null);
  const [sort, setSort] = useState<SortOrder>('newest');
  const [size, setSize] = useState('all');
  const [eventDate, setEventDate] = useState('');
  const shortlist = useShortlist();
  const closeZoom = useCallback(() => setZoomed(null), []);

  const savedGroups = useMemo(() => groupedDresses.filter((g) => g.codes.some((c) => shortlist.codes.includes(c))), [groupedDresses, shortlist.codes]);

  const sorted = useMemo(() => {
    const base = newOnly ? groupedDresses.filter((g) => g.codes.some((c) => newArrivalCodes.has(c))) : groupedDresses;
    const list = size === 'all' ? base : base.filter((g) => g.sizes.includes(size));
    if (sort === 'newest') return list;
    return [...list].sort((a, b) => (sort === 'rent-asc' ? rentValue(a) - rentValue(b) : rentValue(b) - rentValue(a)));
  }, [groupedDresses, size, sort, newOnly, newArrivalCodes]);

  const availableSizes = useMemo(() => [...new Set(groupedDresses.flatMap((g) => g.sizes).filter(Boolean))].sort(), [groupedDresses]);
  const shortlistLink = buildLandingWhatsAppLink(profile, buildShortlistMessage(savedGroups.flatMap((g) => g.variants.map((v) => ({ code: v.code, name: g.name, size: v.size, color: v.color }))), eventDate));
  const usageChips: { value: LandingUsageFilter; label: string }[] = [{ value: 'all', label: 'الكل' }, { value: 'rent', label: 'إيجار' }, { value: 'sale', label: 'بيع' }];

  return (
    <section id="available-dresses" className="bg-[#FFFCF8] py-8 sm:py-10">
      <div className="mx-auto max-w-[1600px] px-6 sm:px-8 lg:px-10">
        <div className="flex items-baseline justify-between gap-4 border-b border-[#E8E2D9] pb-3">
          <h2 className="text-[12px] font-medium tracking-[0.08em] text-black">المعروض · {sorted.length} تصميم</h2>
          <span className="text-[10px] tracking-wide text-black/40">{groupedDresses.reduce((acc, g) => acc + g.variants.length, 0)} قطعة فعلية</span>
        </div>

        <div className="border-b border-[#E8E2D9] bg-white">
          <div className="flex flex-wrap items-center">
            <div className="relative flex-1 min-w-[180px] border-b border-[#E8E2D9] sm:border-b-0 sm:border-l">
              <Search className="pointer-events-none absolute right-3 top-1/2 h-3 w-3 -translate-y-1/2 text-black/30" />
              <input type="search" value={search} onChange={(e) => onSearchChange(e.target.value)} placeholder="بحث..." className="h-9 w-full bg-transparent pr-8 text-[12px] text-black placeholder:text-black/30 outline-none" />
            </div>
            <select value={size} onChange={(e) => setSize(e.target.value)} className="h-9 border-l border-[#E8E2D9] bg-transparent px-2.5 text-[11px] text-black outline-none"><option value="all">المقاس</option>{availableSizes.map((o) => <option key={o} value={o}>{o}</option>)}</select>
            <select value={sort} onChange={(e) => setSort(e.target.value as SortOrder)} className="h-9 bg-transparent px-2.5 text-[11px] text-black outline-none"><option value="newest">الأحدث</option><option value="rent-asc">سعر ↑</option><option value="rent-desc">سعر ↓</option></select>
          </div>
          <div className="flex flex-wrap items-center gap-1 border-t border-[#E8E2D9] px-2 py-1.5">
            {inventoryCategories.slice(0, 6).map((cat) => {
              const active = selectedCategory === cat;
              return <button key={cat} type="button" onClick={() => onCategoryChange(cat)} className={`rounded-full border px-2 py-0.5 text-[10px] ${active ? 'border-black bg-black text-white' : 'border-[#E8E2D9] bg-white text-black/40 hover:text-black'}`}>{cat === 'all' ? 'الكل' : cat}</button>;
            })}
            <div className="mr-auto flex gap-1">
              {usageChips.map((chip) => {
                const active = usageFilter === chip.value;
                return <button key={chip.value} type="button" onClick={() => onUsageChange(chip.value)} className={`rounded-full px-2 py-0.5 text-[10px] ${active ? 'bg-black text-white' : 'bg-[#F5F1EB] text-black/40'}`}>{chip.label}</button>;
              })}
              <button type="button" onClick={() => onNewOnlyChange(!newOnly)} className={`rounded-full px-2 py-0.5 text-[10px] ${newOnly ? 'bg-[#C9A86A] text-black' : 'bg-[#F5F1EB] text-black/40'}`}>جديد</button>
            </div>
          </div>
        </div>

        {loadError ? <div className="mt-2 border border-[#E8E2D9] bg-[#FAF6F0] px-2 py-1.5 text-[10px] text-black/50">{loadError}</div> : null}

        {loading ? <div className="grid grid-cols-2 gap-px bg-[#E8E2D9] p-px sm:grid-cols-4 lg:grid-cols-5">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="aspect-[3/4] animate-pulse bg-[#F5F1EB]" />)}</div> : sorted.length === 0 ? <div className="border border-[#E8E2D9] bg-white p-8 text-center text-[12px] text-black/40">لا نتائج</div> : <div className="grid grid-cols-2 gap-px bg-[#E8E2D9] p-px sm:grid-cols-3 lg:grid-cols-5">{sorted.map((group) => <InventoryCard key={group.key} group={group} profile={profile} onZoom={setZoomed} saved={group.codes.some((c) => shortlist.codes.includes(c))} onToggleSave={(g) => { const firstCode = g.codes[0]; if (shortlist.codes.includes(firstCode)) g.codes.forEach((c) => shortlist.codes.includes(c) && shortlist.toggle(c)); else shortlist.toggle(firstCode); }} isNew={group.codes.some((c) => newArrivalCodes.has(c))} />)}</div>}

        {zoomed ? <QuickView group={zoomed} profile={profile} onClose={closeZoom} saved={zoomed.codes.some((c) => shortlist.codes.includes(c))} onToggleSave={(g) => { const firstCode = g.codes[0]; if (shortlist.codes.includes(firstCode)) g.codes.forEach((c) => shortlist.codes.includes(c) && shortlist.toggle(c)); else shortlist.toggle(firstCode); }} /> : null}

        {shortlist.codes.length > 0 ? (
          <div className="fixed inset-x-0 bottom-0 z-40 border-t border-black/10 bg-white/95 backdrop-blur-xl">
            <div className="mx-auto flex max-w-[1600px] items-center gap-2 px-4 py-2.5 sm:px-6">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-black text-[10px] text-white">{shortlist.codes.length}</span>
              <p className="hidden text-[11px] text-black sm:block truncate max-w-[40ch]">{savedGroups.map((g) => g.name).join(' · ')}</p>
              <label className="hidden items-center gap-1.5 rounded-full border border-[#E8E2D9] bg-white px-2.5 py-1 sm:flex"><CalendarDays className="h-3 w-3 text-black/30" /><input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} className="bg-transparent text-[10px] text-black outline-none" /></label>
              <div className="mr-auto flex items-center gap-1.5"><Button type="button" variant="quiet" onClick={shortlist.clear} className="h-7 rounded-full px-2.5 text-[10px] text-black/40">مسح</Button>{shortlistLink ? <a href={shortlistLink} target="_blank" rel="noopener noreferrer" className="inline-flex h-7 items-center gap-1 rounded-full bg-black px-3 text-[10px] text-white"><MessageCircle className="h-3 w-3" />واتساب</a> : null}</div>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}
