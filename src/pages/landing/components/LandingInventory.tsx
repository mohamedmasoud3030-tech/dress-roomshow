import { useCallback, useEffect, useState } from 'react';
import { Filter, MessageCircle, Search, Sparkles, X, ZoomIn } from 'lucide-react';
import type { Dress } from '../../../features/dresses/dress.types';
import { INVENTORY_ITEM_TYPE_LABELS } from '../../../shared/domain/dressConstants';
import { formatMoneyOMR } from '../../../shared/utils/format';
import {
  buildAppointmentInquiryMessage,
  buildLandingWhatsAppLink,
  buildQuickInquiryMessage,
} from '../landingWhatsapp';
import { DressPhoto } from './DressPhoto';
import { Reveal } from './Reveal';
import type { InventoryCategoryFilter, LandingProfile, LandingUsageFilter } from './types';

function getLandingDressPriceLabel(dress: Dress): string {
  if (dress.isForRent && dress.isForSale) {
    return `إيجار ${formatMoneyOMR(dress.rentalPrice)} · بيع ${formatMoneyOMR(dress.salePrice)}`;
  }
  if (dress.isForRent) return `إيجار ${formatMoneyOMR(dress.rentalPrice)}`;
  if (dress.isForSale) return `بيع ${formatMoneyOMR(dress.salePrice)}`;
  return 'السعر يحدد عند المعاينة';
}

type Props = {
  profile: LandingProfile;
  dresses: Dress[];
  loading: boolean;
  loadError?: string | null;
  search: string;
  onSearchChange: (value: string) => void;
  selectedCategory: InventoryCategoryFilter;
  onCategoryChange: (value: InventoryCategoryFilter) => void;
  usageFilter: LandingUsageFilter;
  onUsageChange: (value: LandingUsageFilter) => void;
  inventoryCategories: readonly InventoryCategoryFilter[];
};

function InventoryCard({
  dress,
  profile,
  onZoom,
  index,
}: {
  dress: Dress;
  profile: LandingProfile;
  onZoom: (dress: Dress) => void;
  index: number;
}) {
  const typeLabel = INVENTORY_ITEM_TYPE_LABELS[dress.itemType ?? 'dress'];
  const bookingItem = { code: dress.code, name: dress.name, size: dress.size, color: dress.color };
  const appointmentLink = buildLandingWhatsAppLink(profile, buildAppointmentInquiryMessage(bookingItem));
  const inquiryLink = buildLandingWhatsAppLink(profile, buildQuickInquiryMessage(bookingItem));

  return (
    <Reveal delay={Math.min(index * 70, 350)}>
      <article className="group h-full overflow-hidden rounded-[1.5rem] border border-slate-200/80 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:border-amber-300 hover:shadow-2xl hover:shadow-slate-900/10">
        <div className="relative overflow-hidden">
          <DressPhoto
            src={dress.images[0]}
            alt={dress.name}
            className="aspect-[3/4] w-full transition duration-[900ms] group-hover:scale-105"
            fallbackLabel={dress.category}
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent opacity-0 transition duration-300 group-hover:opacity-100"
          />

          <div className="absolute right-3 top-3 flex flex-col gap-1.5">
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

          <button
            type="button"
            onClick={() => onZoom(dress)}
            className="absolute bottom-3 left-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/90 text-slate-900 opacity-0 shadow-lg backdrop-blur transition duration-300 hover:bg-white group-hover:opacity-100 focus-visible:opacity-100"
            aria-label={`تكبير صورة ${dress.name}`}
          >
            <ZoomIn aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <div>
            <p className="text-[0.7rem] font-bold text-amber-700">
              {typeLabel} · {dress.category}
            </p>
            <h3 className="mt-1.5 text-lg font-black leading-snug text-slate-950">{dress.name}</h3>
            <p className="mt-1.5 text-xs leading-6 text-slate-500">
              {dress.description || 'قطعة متاحة حالياً ويمكن معاينتها وتجربتها خلال الموعد داخل المعرض.'}
            </p>
          </div>

          <div className="flex flex-wrap gap-2 text-[0.7rem] font-bold">
            <span className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-slate-700">
              المقاس <span dir="ltr">{dress.size}</span>
            </span>
            <span className="rounded-lg bg-slate-100 px-2.5 py-1.5 text-slate-700">
              {dress.color}
            </span>
          </div>

          <div className="flex items-end justify-between gap-3 border-t border-slate-100 pt-4">
            <div>
              <p className="text-[0.65rem] font-bold text-slate-500">السعر</p>
              <p className="mt-1 text-sm font-black text-slate-950">
                {getLandingDressPriceLabel(dress)}
              </p>
              {dress.isForRent && dress.depositAmount > 0 ? (
                <p className="mt-1 text-[0.65rem] text-slate-500">
                  التأمين {formatMoneyOMR(dress.depositAmount)}
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
}: {
  dress: Dress;
  profile: LandingProfile;
  onClose: () => void;
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
            src={dress.images[0]}
            alt={dress.name}
            className="aspect-[3/4] w-full md:aspect-auto md:h-full"
            fallbackLabel={dress.category}
          />
          <div className="relative p-6 sm:p-8">
            <button
              type="button"
              onClick={onClose}
              className="absolute left-4 top-4 flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700 transition hover:bg-slate-200"
              aria-label="إغلاق"
            >
              <X aria-hidden="true" className="h-5 w-5" />
            </button>

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
              <p className="mt-1 text-base font-black text-slate-950">
                {getLandingDressPriceLabel(dress)}
              </p>
              {dress.isForRent && dress.depositAmount > 0 ? (
                <p className="mt-1 text-xs text-amber-900">
                  التأمين {formatMoneyOMR(dress.depositAmount)}
                </p>
              ) : null}
            </div>

            <div className="mt-6 grid gap-2 sm:grid-cols-2">
              {appointmentLink ? (
                <a
                  href={appointmentLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-h-12 items-center justify-center rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white transition hover:bg-slate-800"
                >
                  احجزي موعد تجربة
                </a>
              ) : null}
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
}: Props) {
  const [zoomed, setZoomed] = useState<Dress | null>(null);
  const closeZoom = useCallback(() => setZoomed(null), []);

  const headerAppointmentLink = buildLandingWhatsAppLink(profile, buildAppointmentInquiryMessage());
  const emptyStateAppointmentLink = buildLandingWhatsAppLink(profile, buildQuickInquiryMessage());

  return (
    <section id="available-dresses" className="mt-20 scroll-mt-24 sm:mt-24">
      <Reveal>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black tracking-[0.2em] text-amber-600">المعروض الآن</p>
            <h2 className="mt-2 text-3xl font-black text-slate-950 sm:text-4xl">
              قطع جاهزة للطلب
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600">
              كل ما ترينه هنا متاح فعلياً في المعرض. اختاري القطعة وأرسلي طلب الموعد، وسيتم
              تأكيد التوفر لتاريخ مناسبتك.
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
          <div className="grid gap-3 lg:grid-cols-[1fr_200px_200px]">
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
              <span className="sr-only">فلتر الفئة</span>
              <Filter
                aria-hidden="true"
                className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              />
              <select
                value={selectedCategory}
                onChange={(event) => onCategoryChange(event.target.value as InventoryCategoryFilter)}
                className="h-12 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 pr-10 pl-3 text-sm outline-none transition focus-visible:border-amber-500 focus-visible:bg-white focus-visible:ring-4 focus-visible:ring-amber-500/15"
              >
                {inventoryCategories.map((category) => (
                  <option key={category} value={category}>
                    {category === 'all' ? 'كل الفئات' : category}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="sr-only">فلتر الخدمة</span>
              <select
                value={usageFilter}
                onChange={(event) => onUsageChange(event.target.value as LandingUsageFilter)}
                className="h-12 w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none transition focus-visible:border-amber-500 focus-visible:bg-white focus-visible:ring-4 focus-visible:ring-amber-500/15"
              >
                <option value="all">إيجار وبيع</option>
                <option value="rent">للإيجار فقط</option>
                <option value="sale">للبيع فقط</option>
              </select>
            </label>
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
      ) : dresses.length === 0 ? (
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
          {dresses.map((dress, index) => (
            <InventoryCard
              key={dress.id}
              dress={dress}
              profile={profile}
              index={index}
              onZoom={setZoomed}
            />
          ))}
        </div>
      )}

      {zoomed ? <QuickView dress={zoomed} profile={profile} onClose={closeZoom} /> : null}
    </section>
  );
}
