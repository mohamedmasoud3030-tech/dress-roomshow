import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpDown, CalendarDays, Check, Filter, Heart, MessageCircle, Search, Sparkles, X, ZoomIn } from 'lucide-react';
import { Button, IconButton } from '../../../components/shared/Button';
import { isLastOfCategory } from '../landingFlags';
import {
  getDressDiscountPercent,
  getDressEffectiveRentalPrice,
  getDressEffectiveSalePrice,
  getDressSecurityDepositAmount,
  type Dress,
} from '../../../features/dresses/dress.types';
import { INVENTORY_ITEM_TYPE_LABELS } from '../../../shared/domain/dressConstants';
import { formatMoneyOMR, formatPercentOMR } from '../../../shared/utils/format';
import {
  buildAppointmentInquiryMessage,
  buildLandingWhatsAppLink,
  buildQuickInquiryMessage,
  buildShortlistMessage,
} from '../landingWhatsapp';
import { useShortlist } from '../useShortlist';
import { piecePath } from '../piecePath';
import { DressPhoto } from './DressPhoto';
import { Reveal } from './Reveal';
import type { LandingDress } from '../landingDress.repository';
import type { InventoryCategoryFilter, LandingProfile, LandingUsageFilter } from './types';

type SortOrder = 'newest' | 'rent-asc' | 'rent-desc';

function getLandingDressPriceLabel(dress: Dress): string {
  if (dress.isForRent && dress.isForSale) {
    return `إيجار ${formatMoneyOMR(dress.rentalPrice)} · بيع ${formatMoneyOMR(dress.salePrice)}`;
  }
  if (dress.isForRent) return `إيجار ${formatMoneyOMR(dress.rentalPrice)}`;
  if (dress.isForSale) return `بيع ${formatMoneyOMR(dress.salePrice)}`;
  return 'السعر يحدد عند المعاينة';
}

/**
 * The price a visitor actually pays. A piece on sale shows the list price
 * struck through beside the discounted one — the one number a customer wants
 * is the one she will pay, and hiding the old price only looks like a trick.
 */
export function LandingPrice({ dress, size = 'sm' }: { dress: Dress; size?: 'sm' | 'lg' }) {
  const percent = getDressDiscountPercent(dress);
  const mainClass = size === 'lg' ? 'text-base font-black text-slate-950' : 'text-sm font-black text-slate-950';

  if (percent <= 0) {
    return <p className={mainClass}>{getLandingDressPriceLabel(dress)}</p>;
  }

  const parts: string[] = [];
  if (dress.isForRent) parts.push(`إيجار ${formatMoneyOMR(getDressEffectiveRentalPrice(dress))}`);
  if (dress.isForSale) parts.push(`بيع ${formatMoneyOMR(getDressEffectiveSalePrice(dress))}`);

  return (
    <div>
      <p className={mainClass}>{parts.join(' · ') || getLandingDressPriceLabel(dress)}</p>
      <p className="mt-0.5 text-[0.7rem] text-slate-500">
        <span className="line-through">{getLandingDressPriceLabel(dress)}</span>
        {' · '}
        <span className="font-bold text-rose-700">خصم {formatPercentOMR(percent)}</span>
      </p>
    </div>
  );
}

function rentValue(dress: Dress): number {
  return dress.isForRent ? dress.rentalPrice : dress.isForSale ? dress.salePrice : 0;
}

type Props = {
  profile: LandingProfile;
  dresses: LandingDress[];
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
  /** Codes currently shown under "وصل حديثاً". */
  newArrivalCodes: ReadonlySet<string>;
};

function InventoryCard({
  dress,
  profile,
  onZoom,
  index,
  saved,
  onToggleSave,
  allDresses,
  isNew,
}: {
  dress: LandingDress;
  profile: LandingProfile;
  onZoom: (dress: LandingDress) => void;
  index: number;
  saved: boolean;
  onToggleSave: (dress: LandingDress) => void;
  allDresses: readonly Dress[];
  isNew: boolean;
}) {
  const typeLabel = INVENTORY_ITEM_TYPE_LABELS[dress.itemType ?? 'dress'];
  const bookingItem = { code: dress.code, name: dress.name, size: dress.size, color: dress.color };
  const appointmentLink = buildLandingWhatsAppLink(profile, buildAppointmentInquiryMessage(bookingItem));
  const inquiryLink = buildLandingWhatsAppLink(profile, buildQuickInquiryMessage(bookingItem));

  return (
    <Reveal delay={Math.min(index * 70, 350)}>
      <article className="group flex h-full flex-col overflow-hidden rounded-[1.5rem] border border-slate-200/80 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:border-amber-300 hover:shadow-2xl hover:shadow-slate-900/10">
        <div className="relative overflow-hidden">
          <Link
            to={piecePath(dress.code)}
            aria-label={`صفحة ${dress.name}`}
            className="block"
          >
            <DressPhoto
              brand={profile.brandName}
              src={dress.images[0]}
              alt={dress.name}
              className="aspect-[3/4] w-full transition duration-[900ms] group-hover:scale-105"
              fallbackLabel={dress.category}
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent opacity-0 transition duration-300 group-hover:opacity-100"
            />
          </Link>

          <div className="absolute right-3 top-3 flex flex-col gap-1.5">
            {isNew ? (
              <span className="rounded-full bg-amber-400 px-2.5 py-1 text-[0.65rem] font-black text-slate-950">
                جديد
              </span>
            ) : null}
            {dress.isForRent ? (
              <span className="rounded-full bg-slate-950/85 px-2.5 py-1 text-[0.65rem] font-black text-amber-200 backdrop-blur">
                للإيجار
              </span>
            ) : null}
            {dress.isForSale ? (
              <span className="rounded-full bg-amber-400 px-2.5 py-1 text-[0.65rem] font-black text-slate-950">
                للبيع
              </span>
            ) : null}
          </div>

          <IconButton
            type="button"
            variant="quiet"
            size="sm"
            onClick={() => onToggleSave(dress)}
            aria-pressed={saved}
            label={saved ? `إزالة ${dress.name} من اختياراتك` : `إضافة ${dress.name} إلى اختياراتك`}
            className={`absolute left-3 top-3 h-10 w-10 rounded-xl p-0 shadow-lg backdrop-blur ${
              saved
                ? 'bg-amber-400 text-slate-950'
                : 'bg-white/90 text-slate-700 hover:bg-white'
            }`}
          >
            <Heart aria-hidden="true" className={`h-4 w-4 ${saved ? 'fill-current' : ''}`} />
          </IconButton>

          <IconButton
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => onZoom(dress)}
            label={`تكبير صورة ${dress.name}`}
            className="absolute bottom-3 left-3 h-10 w-10 rounded-xl bg-white/90 p-0 text-slate-900 shadow-lg backdrop-blur hover:bg-white"
          >
            <ZoomIn aria-hidden="true" className="h-4 w-4" />
          </IconButton>
        </div>

        <div className="flex flex-1 flex-col space-y-4 p-5">
          <div>
            <p className="text-[0.7rem] font-bold text-amber-700">
              {typeLabel} · {dress.category}
            </p>
            <h3 className="mt-1.5 text-lg font-black leading-snug text-slate-950"><Link to={piecePath(dress.code)} className="transition hover:text-amber-700">{dress.name}</Link></h3>
            <p className="mt-1.5 text-xs leading-6 text-slate-500">
              {dress.description || 'قطعة متاحة حالياً ويمكن معاينتها وتجربتها خلال الموعد داخل المعرض.'}
            </p>
          </div>

          <div className="flex flex-wrap gap-2 text-[0.7rem] font-bold">
            <span className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-slate-700">
              المقاس <span dir="ltr">{dress.size}</span>
            </span>
            <span className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-slate-700">{dress.color}</span>
            {isLastOfCategory(dress, allDresses) ? (
              <span className="rounded-lg bg-amber-50 px-2.5 py-1.5 text-amber-800">
                القطعة الوحيدة في فئتها
              </span>
            ) : null}
          </div>

          <div className="mt-auto flex items-end justify-between gap-3 border-t border-slate-100 pt-4">
            <div>
              <p className="text-[0.65rem] font-bold text-slate-500">السعر</p>
              <LandingPrice dress={dress} />
              {dress.isForRent && getDressSecurityDepositAmount(dress) > 0 ? (
                <p className="mt-1 text-[0.65rem] text-slate-500">
                  التأمين {formatMoneyOMR(getDressSecurityDepositAmount(dress))}
                </p>
              ) : null}
            </div>
            {inquiryLink ? (
              <a
                href={inquiryLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-white transition hover:bg-emerald-600"
                aria-label={`استفسار سريع عن ${dress.name}`}
              >
                <MessageCircle aria-hidden="true" className="h-4 w-4" />
              </a>
            ) : null}
          </div>

          {appointmentLink ? (
            <a
              href={appointmentLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-11 w-full items-center justify-center rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white transition hover:bg-slate-800"
            >
              احجزي موعد لتجربة هذه القطعة
            </a>
          ) : (
            <p className="rounded-xl bg-stone-100 px-4 py-3 text-center text-[0.7rem] font-semibold leading-6 text-slate-500">
              أضيفي رقم واتساب في إعدادات المعرض لتفعيل أزرار الحجز والاستفسار.
            </p>
          )}
        </div>
      </article>
    </Reveal>
  );
}

function QuickView({
  dress,
  profile,
  onClose,
  saved,
  onToggleSave,
}: {
  dress: Dress;
  profile: LandingProfile;
  onClose: () => void;
  saved: boolean;
  onToggleSave: (dress: LandingDress) => void;
}) {
  const bookingItem = { code: dress.code, name: dress.name, size: dress.size, color: dress.color };
  const appointmentLink = buildLandingWhatsAppLink(profile, buildAppointmentInquiryMessage(bookingItem));
  const inquiryLink = buildLandingWhatsAppLink(profile, buildQuickInquiryMessage(bookingItem));

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={dress.name}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-[1.75rem] bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="grid md:grid-cols-[1fr_1fr]">
          <DressPhoto
            brand={profile.brandName}
            src={dress.images[0]}
            alt={dress.name}
            className="aspect-[3/4] w-full md:aspect-auto md:h-full"
            fallbackLabel={dress.category}
          />
          <div className="relative p-6 sm:p-8">
            <IconButton
              type="button"
              variant="secondary"
              size="sm"
              onClick={onClose}
              label="إغلاق"
              className="absolute left-4 top-4 h-10 w-10 rounded-xl bg-slate-100 p-0 text-slate-700 hover:bg-slate-200"
            >
              <X aria-hidden="true" className="h-5 w-5" />
            </IconButton>

            <p className="text-xs font-black tracking-[0.15em] text-amber-600">
              {INVENTORY_ITEM_TYPE_LABELS[dress.itemType ?? 'dress']} · {dress.category}
            </p>
            <h3 className="mt-2 text-2xl font-black text-slate-950">{dress.name}</h3>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              {dress.description || 'قطعة متاحة حالياً داخل المعرض ويمكن معاينتها وتجربتها خلال الموعد.'}
            </p>

            <dl className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-slate-50 p-4">
                <dt className="text-[0.7rem] font-bold text-slate-500">المقاس</dt>
                <dd className="mt-1 font-black text-slate-900" dir="ltr">
                  {dress.size}
                </dd>
              </div>
              <div className="rounded-2xl bg-slate-50 p-4">
                <dt className="text-[0.7rem] font-bold text-slate-500">اللون</dt>
                <dd className="mt-1 font-black text-slate-900">{dress.color}</dd>
              </div>
            </dl>

            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-[0.7rem] font-bold text-amber-800">السعر</p>
              <LandingPrice dress={dress} size="lg" />
              {dress.isForRent && getDressSecurityDepositAmount(dress) > 0 ? (
                <p className="mt-1 text-xs text-amber-900">
                  التأمين {formatMoneyOMR(getDressSecurityDepositAmount(dress))}
                </p>
              ) : null}
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <Button
                type="button"
                variant="quiet"
                aria-pressed={saved}
                onClick={() => onToggleSave(dress)}
                className={`min-h-12 rounded-xl px-4 py-3 text-sm font-black ${
                  saved
                    ? 'bg-amber-400 text-slate-950 hover:bg-amber-300'
                    : 'border border-slate-300 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Heart aria-hidden="true" className={`h-4 w-4 ${saved ? 'fill-current' : ''}`} />
                {saved ? 'في اختياراتك' : 'أضيفي لاختياراتك'}
              </Button>
              {inquiryLink ? (
                <a
                  href={inquiryLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-3 text-sm font-black text-slate-700 transition hover:bg-slate-50"
                >
                  <MessageCircle aria-hidden="true" className="h-4 w-4" />
                  استفسار سريع
                </a>
              ) : null}
            </div>

            {appointmentLink ? (
              <a
                href={appointmentLink}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 flex min-h-12 items-center justify-center rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white transition hover:bg-slate-800"
              >
                احجزي موعد تجربة
              </a>
            ) : null}
            <Link
              to={piecePath(dress.code)}
              onClick={onClose}
              className="mt-2 flex min-h-11 items-center justify-center rounded-xl text-xs font-black text-amber-700 underline-offset-4 transition hover:underline"
            >
              افتحي صفحة القطعة لمشاركة رابطها
            </Link>
            <p className="mt-4 text-center text-[0.7rem] leading-6 text-slate-500">
              يؤكد المعرض الموعد وتوفر القطعة بعد استلام الطلب.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function LandingInventory({
  profile,
  dresses,
  loading,
  loadError,
  search,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  usageFilter,
  onUsageChange,
  inventoryCategories,
  newOnly,
  onNewOnlyChange,
  newArrivalCodes,
}: Props) {
  const [zoomed, setZoomed] = useState<LandingDress | null>(null);
  const [sort, setSort] = useState<SortOrder>('newest');
  const [size, setSize] = useState('all');
  const [eventDate, setEventDate] = useState('');
  const shortlist = useShortlist();
  const closeZoom = useCallback(() => setZoomed(null), []);

  const savedDresses = useMemo(
    () => dresses.filter((dress) => shortlist.codes.includes(dress.code)),
    [dresses, shortlist.codes],
  );

  const sorted = useMemo(() => {
    const base = newOnly ? dresses.filter((dress) => newArrivalCodes.has(dress.code)) : dresses;
    const list = size === 'all' ? base : base.filter((dress) => dress.size === size);
    if (sort === 'newest') return list;
    return [...list].sort((a, b) =>
      sort === 'rent-asc' ? rentValue(a) - rentValue(b) : rentValue(b) - rentValue(a),
    );
  }, [dresses, size, sort, newOnly, newArrivalCodes]);

  const availableSizes = useMemo(
    () => [...new Set(dresses.map((dress) => dress.size).filter(Boolean))].sort(),
    [dresses],
  );

  const headerAppointmentLink = buildLandingWhatsAppLink(profile, buildAppointmentInquiryMessage());
  const emptyStateAppointmentLink = buildLandingWhatsAppLink(profile, buildQuickInquiryMessage());
  const shortlistLink = buildLandingWhatsAppLink(
    profile,
    buildShortlistMessage(
      savedDresses.map((dress) => ({
        code: dress.code,
        name: dress.name,
        size: dress.size,
        color: dress.color,
      })),
      eventDate,
    ),
  );

  const usageChips: { value: LandingUsageFilter; label: string }[] = [
    { value: 'all', label: 'الكل' },
    { value: 'rent', label: 'للإيجار' },
    { value: 'sale', label: 'للبيع' },
  ];

  return (
    <section id="available-dresses" className="mt-20 scroll-mt-24 sm:mt-24">
      <Reveal>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black tracking-[0.2em] text-amber-600">المعروض الآن</p>
            <h2 className="mt-2 text-3xl font-black text-slate-950 sm:text-4xl">قطع جاهزة للطلب</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
              كل ما ترينه هنا متاح فعلياً في المعرض. أضيفي ما أعجبك إلى اختياراتك، ثم أرسليها
              دفعة واحدة عبر واتساب مع تاريخ مناسبتك.
            </p>
          </div>
          {headerAppointmentLink ? (
            <a
              href={headerAppointmentLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800"
            >
              <Sparkles aria-hidden="true" className="h-4 w-4 text-amber-300" />
              اطلبِي موعداً الآن
            </a>
          ) : null}
        </div>
      </Reveal>

      <Reveal delay={80}>
        <div className="mt-7 rounded-[1.5rem] border border-slate-200/80 bg-white p-3 shadow-sm sm:p-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_170px_190px]">
            <label className="relative block">
              <span className="sr-only">ابحثي في المعروض</span>
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute right-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
              />
              <input
                type="search"
                value={search}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder="ابحثي بالاسم أو الفئة أو اللون أو المقاس"
                className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pr-11 text-sm outline-none transition placeholder:text-slate-400 focus-visible:border-amber-500 focus-visible:bg-white focus-visible:ring-4 focus-visible:ring-amber-500/15"
              />
            </label>

            <label className="relative block">
              <span className="sr-only">فلتر المقاس</span>
              <Filter
                aria-hidden="true"
                className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              />
              <select
                value={size}
                onChange={(event) => setSize(event.target.value)}
                className="h-12 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 pr-10 pl-3 text-sm outline-none transition focus-visible:border-amber-500 focus-visible:bg-white focus-visible:ring-4 focus-visible:ring-amber-500/15"
              >
                <option value="all">كل المقاسات</option>
                {availableSizes.map((option) => (
                  <option key={option} value={option}>
                    مقاس {option}
                  </option>
                ))}
              </select>
            </label>

            <label className="relative block">
              <span className="sr-only">ترتيب النتائج</span>
              <ArrowUpDown
                aria-hidden="true"
                className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              />
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value as SortOrder)}
                className="h-12 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 pr-10 pl-3 text-sm outline-none transition focus-visible:border-amber-500 focus-visible:bg-white focus-visible:ring-4 focus-visible:ring-amber-500/15"
              >
                <option value="newest">الأحدث</option>
                <option value="rent-asc">السعر من الأقل</option>
                <option value="rent-desc">السعر من الأعلى</option>
              </select>
            </label>
          </div>

          {/* Category chips */}
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {inventoryCategories.map((category) => {
              const active = selectedCategory === category;
              return (
                <Button
                  key={category}
                  type="button"
                  variant="quiet"
                  size="sm"
                  onClick={() => onCategoryChange(category)}
                  aria-pressed={active}
                  className={`shrink-0 rounded-full px-4 py-2 text-xs font-black ${
                    active
                      ? 'bg-slate-950 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {category === 'all' ? 'كل الفئات' : category}
                </Button>
              );
            })}
          </div>

          {/* Usage chips */}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {usageChips.map((chip) => {
              const active = usageFilter === chip.value;
              return (
                <Button
                  key={chip.value}
                  type="button"
                  variant="quiet"
                  size="sm"
                  onClick={() => onUsageChange(chip.value)}
                  aria-pressed={active}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-black ${
                    active
                      ? 'border-amber-400 bg-amber-50 text-amber-800'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  {active ? <Check aria-hidden="true" className="h-3 w-3" /> : null}
                  {chip.label}
                </Button>
              );
            })}
            <Button
              type="button"
              variant="quiet"
              size="sm"
              onClick={() => onNewOnlyChange(!newOnly)}
              aria-pressed={newOnly}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-black ${
                newOnly
                  ? 'border-amber-400 bg-amber-400 text-slate-950'
                  : 'border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
            >
              <Sparkles aria-hidden="true" className="h-3 w-3" />
              وصل حديثاً
            </Button>
            <span className="mr-auto pl-1 text-xs font-bold text-slate-500">
              {sorted.length} قطعة
            </span>
          </div>
        </div>
      </Reveal>

      {loadError ? (
        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          {loadError}
        </div>
      ) : null}

      {loading ? (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white"
            >
              <div className="aspect-[3/4] animate-pulse bg-slate-100" />
              <div className="space-y-3 p-5">
                <div className="h-5 animate-pulse rounded bg-slate-100" />
                <div className="h-4 w-2/3 animate-pulse rounded bg-slate-100" />
                <div className="h-11 animate-pulse rounded-xl bg-slate-100" />
              </div>
            </div>
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <div className="mt-8 rounded-[1.5rem] border border-dashed border-slate-300 bg-white p-12 text-center">
          <p className="text-lg font-black text-slate-900">لا توجد قطع مطابقة حالياً</p>
          <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-slate-500">
            جرّبي تغيير البحث أو الفلاتر، أو أرسلي استفساراً وسنخبرك بما يتوفر من بقية الفئات.
          </p>
          {emptyStateAppointmentLink ? (
            <a
              href={emptyStateAppointmentLink}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex min-h-12 items-center justify-center rounded-xl bg-slate-950 px-6 py-3 text-sm font-black text-white transition hover:bg-slate-800"
            >
              إرسال استفسار
            </a>
          ) : null}
        </div>
      ) : (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {sorted.map((dress, index) => (
            <InventoryCard
              key={dress.id}
              dress={dress}
              profile={profile}
              index={index}
              onZoom={setZoomed}
              saved={shortlist.has(dress.code)}
              onToggleSave={(item) => shortlist.toggle(item.code)}
              allDresses={dresses}
              isNew={newArrivalCodes.has(dress.code)}
            />
          ))}
        </div>
      )}

      {zoomed ? (
        <QuickView
          dress={zoomed}
          profile={profile}
          onClose={closeZoom}
          saved={shortlist.has(zoomed.code)}
          onToggleSave={(item) => shortlist.toggle(item.code)}
        />
      ) : null}

      {/* Shortlist bar — only once she has picked something. */}
      {shortlist.codes.length > 0 ? (
        <div className="fixed inset-x-3 bottom-[6.5rem] z-40 mx-auto max-w-3xl rounded-[1.5rem] border border-white/10 bg-[#0b0b12]/95 p-3 shadow-2xl backdrop-blur-md sm:bottom-6 lg:inset-x-6">
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-400 text-slate-950">
              <Heart aria-hidden="true" className="h-4 w-4 fill-current" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-black text-white">
                {shortlist.codes.length} قطعة في اختياراتك
              </p>
              <p className="truncate text-[0.7rem] text-slate-400">
                {savedDresses.map((dress) => dress.name).join(' · ') || 'اختياراتك محفوظة على جهازك'}
              </p>
            </div>

            <label className="flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 py-2">
              <CalendarDays aria-hidden="true" className="h-4 w-4 text-amber-300" />
              <span className="sr-only">تاريخ المناسبة</span>
              <input
                type="date"
                value={eventDate}
                onChange={(event) => setEventDate(event.target.value)}
                className="bg-transparent text-xs font-bold text-white outline-none [color-scheme:dark]"
              />
            </label>

            <div className="mr-auto flex items-center gap-2">
              <Button type="button" variant="quiet" size="sm" onClick={shortlist.clear} className="rounded-xl px-3 py-2 text-xs text-slate-400 hover:text-white">
                مسح
              </Button>
              {shortlistLink ? (
                <a
                  href={shortlistLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-l from-amber-300 to-amber-500 px-5 py-2.5 text-sm font-black text-slate-950 shadow-lg shadow-amber-900/30 transition hover:brightness-105"
                >
                  <MessageCircle aria-hidden="true" className="h-4 w-4" />
                  أرسليها عبر واتساب
                </a>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
