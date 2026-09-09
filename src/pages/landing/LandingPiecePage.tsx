import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowRight, Heart, MessageCircle, RotateCcw } from 'lucide-react';
import { getDressSecurityDepositAmount } from '../../features/dresses/dress.types';
import { getShowroomProfile } from '../../features/preferences/showroomProfile.service';
import { INVENTORY_ITEM_TYPE_LABELS } from '../../shared/domain/dressConstants';
import { formatMoneyOMR } from '../../shared/utils/format';
import { loadLandingInventory, type LandingDress } from './landingDress.repository';
import { loadPublicShowroomProfile } from './landingProfile.repository';
import { landingShowroomProfile, type LandingShowroomProfile } from './landingContent';
import { getNewArrivals, isLastOfCategory } from './landingFlags';
import {
  buildAppointmentInquiryMessage,
  buildLandingWhatsAppLink,
  buildQuickInquiryMessage,
} from './landingWhatsapp';
import { useShortlist } from './useShortlist';
import { piecePath } from './piecePath';
import { DressPhoto } from './components/DressPhoto';
import { LandingHeader } from './components/LandingHeader';
import { LandingFooter } from './components/LandingFooter';
import { LandingPrice } from './components/LandingInventory';
import { Reveal } from './components/Reveal';

/**
 * A standalone public page for a single catalogue piece (`/piece/:code`).
 *
 * The storefront used to be one long page: a visitor could not send her
 * sister or the showroom a link to *the* dress — only to the whole catalogue.
 * Every piece now has its own shareable address, yet the page stays public
 * and reads through the very same anonymous catalogue projection as the
 * landing grid; there is no second data path to disagree with the storefront.
 *
 * A piece that left the display (sold, archived, re-coded) never renders a
 * dead screen: the visitor gets an honest explanation and a way back to the
 * live catalogue, and the journey still ends where it always ends — a
 * prepared WhatsApp message naming the exact piece code.
 */
function getShowroomProfileSafely(): LandingShowroomProfile {
  try {
    return getShowroomProfile();
  } catch {
    return { ...landingShowroomProfile };
  }
}

export function LandingPiecePage() {
  const { code = '' } = useParams();
  const [profile, setProfile] = useState<LandingShowroomProfile>(() => getShowroomProfileSafely());
  const [dresses, setDresses] = useState<LandingDress[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const shortlist = useShortlist();

  useEffect(() => {
    let cancelled = false;
    void loadPublicShowroomProfile()
      .then((loaded) => {
        if (!cancelled) setProfile(loaded);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const result = await loadLandingInventory();
        if (cancelled) return;
        setDresses(result.dresses);
        setLoadError(null);
      } catch {
        if (cancelled) return;
        setDressError();
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    function setDressError() {
      setDresses([]);
      setLoadError('تعذر تحميل بيانات القطعة حالياً. جرّبي التحديث أو تواصلي معنا مباشرة.');
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const wanted = code.trim().toLowerCase();
  const dress = useMemo(
    () => dresses.find((item) => item.code.trim().toLowerCase() === wanted) ?? null,
    [dresses, wanted],
  );
  const related = useMemo(
    () =>
      dress
        ? dresses.filter((item) => item.code !== dress.code && item.category === dress.category).slice(0, 4)
        : [],
    [dresses, dress],
  );
  const newArrivalCodes = useMemo(
    () => new Set(getNewArrivals(dresses).map((item) => item.code)),
    [dresses],
  );

  return (
    <div className="min-h-screen bg-[#faf8f4] text-slate-900" dir="rtl">
      <LandingHeader profile={profile} />

      <main className="mx-auto max-w-7xl px-4 pb-24 pt-24 sm:px-6 sm:pt-28 lg:px-8">
        {loading ? (
          <LoadingSkeleton />
        ) : loadError ? (
          <PieceLoadError message={loadError} />
        ) : !dress ? (
          <PieceMissing code={code} />
        ) : (
          <PieceDetails
            dress={dress}
            dresses={dresses}
            profile={profile}
            isNew={newArrivalCodes.has(dress.code)}
            saved={shortlist.has(dress.code)}
            onToggleSave={() => shortlist.toggle(dress.code)}
            related={related}
          />
        )}
      </main>

      <LandingFooter profile={profile} />
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div aria-busy="true" aria-label="جارٍ تحميل القطعة" className="grid gap-10 lg:grid-cols-2">
      <div className="aspect-[3/4] animate-pulse rounded-[2rem] bg-slate-200/70" />
      <div className="space-y-4">
        <div className="h-4 w-32 animate-pulse rounded-lg bg-slate-200/70" />
        <div className="h-9 w-2/3 animate-pulse rounded-lg bg-slate-200/70" />
        <div className="h-24 w-full animate-pulse rounded-lg bg-slate-200/70" />
        <div className="h-32 w-full animate-pulse rounded-2xl bg-slate-200/70" />
      </div>
    </div>
  );
}

function PieceLoadError({ message }: { message: string }) {
  return (
    <div className="mx-auto max-w-lg rounded-[2rem] border border-rose-200 bg-white p-8 text-center shadow-sm">
      <p className="text-lg font-black text-slate-950">تعذّر تحميل القطعة</p>
      <p className="mt-2 text-sm leading-7 text-slate-600">{message}</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-black text-white transition hover:bg-slate-800"
        >
          <RotateCcw aria-hidden="true" className="h-4 w-4" />
          تحديث الصفحة
        </button>
        <Link
          to="/landing"
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-300 px-5 text-sm font-black text-slate-700 transition hover:bg-slate-50"
        >
          العودة للمعروض
        </Link>
      </div>
    </div>
  );
}

function PieceMissing({ code }: { code: string }) {
  return (
    <div className="mx-auto max-w-lg rounded-[2rem] border border-slate-200 bg-white p-8 text-center shadow-sm">
      <p className="text-lg font-black text-slate-950">هذه القطعة لم تعد في المعروض الحالي</p>
      <p className="mt-2 text-sm leading-7 text-slate-600">
        القطعة <span dir="ltr" className="font-bold">{code}</span> غير متاحة الآن — ربما حُجزت أو
        بيعت أو تغيّر كودها. المعروض الحي بانتظارك، وكل قطعة فيه برابطها الخاص.
      </p>
      <Link
        to="/landing"
        className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-slate-950 px-5 text-sm font-black text-white transition hover:bg-slate-800"
      >
        <ArrowRight aria-hidden="true" className="h-4 w-4" />
        تصفحي المعروض الحالي
      </Link>
    </div>
  );
}

function PieceDetails({
  dress,
  dresses,
  profile,
  isNew,
  saved,
  onToggleSave,
  related,
}: {
  dress: LandingDress;
  dresses: readonly LandingDress[];
  profile: LandingShowroomProfile;
  isNew: boolean;
  saved: boolean;
  onToggleSave: () => void;
  related: LandingDress[];
}) {
  const typeLabel = INVENTORY_ITEM_TYPE_LABELS[dress.itemType ?? 'dress'];
  const bookingItem = { code: dress.code, name: dress.name, size: dress.size, color: dress.color };
  const appointmentLink = buildLandingWhatsAppLink(profile, buildAppointmentInquiryMessage(bookingItem));
  const inquiryLink = buildLandingWhatsAppLink(profile, buildQuickInquiryMessage(bookingItem));

  return (
    <>
      <nav aria-label="مسار التنقل" className="flex flex-wrap items-center gap-2 text-xs font-bold text-slate-500">
        <Link to="/landing" className="transition hover:text-slate-900">
          المعروض
        </Link>
        <span aria-hidden="true">/</span>
        <span>{dress.category}</span>
        <span aria-hidden="true">/</span>
        <span dir="ltr" className="text-slate-900">
          {dress.code}
        </span>
      </nav>

      <div className="mt-8 grid items-start gap-10 lg:grid-cols-[0.95fr_1.05fr]">
        <Reveal>
          <div className="relative overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white shadow-sm">
            <DressPhoto
              brand={profile.brandName}
              src={dress.images[0]}
              alt={dress.name}
              className="aspect-[3/4] w-full"
              fallbackLabel={dress.category}
            />
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
          </div>
        </Reveal>

        <Reveal delay={120}>
          <p className="text-xs font-black tracking-[0.15em] text-amber-600">
            {typeLabel} · {dress.category}
          </p>
          <h1 className="mt-2 text-3xl font-black leading-tight text-slate-950 sm:text-4xl">
            {dress.name}
          </h1>
          <p className="mt-4 text-sm leading-8 text-slate-600">
            {dress.description || 'قطعة متاحة حالياً داخل المعرض ويمكن معاينتها وتجربتها خلال الموعد.'}
          </p>

          <dl className="mt-6 grid grid-cols-3 gap-3">
            <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/70">
              <dt className="text-[0.7rem] font-bold text-slate-500">المقاس</dt>
              <dd className="mt-1 font-black text-slate-900" dir="ltr">
                {dress.size}
              </dd>
            </div>
            <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/70">
              <dt className="text-[0.7rem] font-bold text-slate-500">اللون</dt>
              <dd className="mt-1 font-black text-slate-900">{dress.color}</dd>
            </div>
            <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/70">
              <dt className="text-[0.7rem] font-bold text-slate-500">الكود</dt>
              <dd className="mt-1 font-black text-slate-900" dir="ltr">
                {dress.code}
              </dd>
            </div>
          </dl>
          {isLastOfCategory(dress, dresses) ? (
            <p className="mt-3 w-fit rounded-lg bg-amber-50 px-2.5 py-1.5 text-[0.7rem] font-bold text-amber-800">
              القطعة الوحيدة في فئتها حالياً
            </p>
          ) : null}

          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <p className="text-[0.7rem] font-bold text-amber-800">السعر</p>
            <LandingPrice dress={dress} size="lg" />
            {dress.isForRent && getDressSecurityDepositAmount(dress) > 0 ? (
              <p className="mt-1 text-xs text-amber-900">
                التأمين {formatMoneyOMR(getDressSecurityDepositAmount(dress))}
              </p>
            ) : null}
          </div>

          <div className="mt-6 space-y-2">
            {appointmentLink || inquiryLink ? (
              <>
                {appointmentLink ? (
                  <a
                    href={appointmentLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex min-h-14 w-full items-center justify-center gap-2.5 rounded-2xl bg-slate-950 px-6 text-sm font-black text-white transition hover:bg-slate-800"
                  >
                    <MessageCircle aria-hidden="true" className="h-4 w-4" />
                    احجزي موعد لتجربة هذه القطعة
                  </a>
                ) : null}
                <div className="flex gap-2">
                  {inquiryLink ? (
                    <a
                      href={inquiryLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 text-sm font-black text-emerald-800 transition hover:bg-emerald-100"
                    >
                      <MessageCircle aria-hidden="true" className="h-4 w-4" />
                      استفسار سريع
                    </a>
                  ) : null}
                  <button
                    type="button"
                    onClick={onToggleSave}
                    aria-pressed={saved}
                    className={`flex min-h-12 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-black transition ${
                      saved
                        ? 'bg-amber-400 text-slate-950 hover:bg-amber-300'
                        : 'border border-slate-300 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Heart aria-hidden="true" className={`h-4 w-4 ${saved ? 'fill-current' : ''}`} />
                    {saved ? 'في اختياراتك' : 'احفظيها'}
                  </button>
                </div>
                <p className="text-center text-[0.7rem] leading-6 text-slate-500">
                  يؤكد المعرض الموعد وتوفر القطعة بعد استلام الطلب — ويمكنك مشاركة رابط هذه الصفحة
                  كما هو.
                </p>
              </>
            ) : (
              <p className="rounded-xl bg-stone-100 px-4 py-3 text-center text-[0.7rem] font-semibold leading-6 text-slate-500">
                أضيفي رقم واتساب في إعدادات المعرض لتفعيل أزرار الحجز والاستفسار.
              </p>
            )}
          </div>

          <Link
            to="/landing"
            className="mt-6 inline-flex items-center gap-2 text-xs font-black text-slate-500 transition hover:text-slate-900"
          >
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
            العودة للمعروض الكامل
          </Link>
        </Reveal>
      </div>

      {related.length > 0 ? (
        <section aria-label="قطع مشابهة" className="mt-20">
          <Reveal>
            <h2 className="text-lg font-black text-slate-950">قطع مشابهة من فئة {dress.category}</h2>
          </Reveal>
          <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {related.map((item, index) => (
              <Reveal key={item.code} delay={Math.min(index * 70, 210)}>
                <Link
                  to={piecePath(item.code)}
                  aria-label={`صفحة ${item.name}`}
                  className="group block overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:border-amber-300 hover:shadow-xl"
                >
                  <DressPhoto
                    brand={profile.brandName}
                    src={item.images[0]}
                    alt={item.name}
                    className="aspect-[4/5] w-full transition duration-700 group-hover:scale-105"
                    fallbackLabel={item.category}
                  />
                  <div className="space-y-3 p-4">
                    <p className="text-[0.7rem] font-bold text-amber-700">
                      {INVENTORY_ITEM_TYPE_LABELS[item.itemType ?? 'dress']} · {item.category}
                    </p>
                    <h3 className="text-sm font-black leading-6 text-slate-950">{item.name}</h3>
                    <LandingPrice dress={item} />
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}
