import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowRight, Heart, MessageCircle, RotateCcw } from 'lucide-react';
import { Button } from '../../components/shared/Button';
import { getDressSecurityDepositAmount } from '../../features/dresses/dress.types';
import { getShowroomProfile } from '../../features/preferences/showroomProfile.service';
import { INVENTORY_ITEM_TYPE_LABELS } from '../../shared/domain/dressConstants';
import { formatMoneyOMR } from '../../shared/utils/format';
import { loadLandingInventory, type LandingDress } from './landingDress.repository';
import { loadPublicShowroomProfile } from './landingProfile.repository';
import { landingShowroomProfile, type LandingShowroomProfile } from './landingContent';
import { getNewArrivals } from './landingFlags';
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
      .then((loaded) => { if (!cancelled) setProfile(loaded); })
      .catch(() => undefined);
    return () => { cancelled = true; };
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
        setDresses([]);
        setLoadError('تعذر تحميل بيانات القطعة حالياً. جرّبي التحديث أو تواصلي معنا مباشرة.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, []);

  const wanted = code.trim().toLowerCase();
  const dress = useMemo(() => dresses.find((item) => item.code.trim().toLowerCase() === wanted) ?? null, [dresses, wanted]);
  const related = useMemo(() => (dress ? dresses.filter((item) => item.code !== dress.code && item.category === dress.category).slice(0, 4) : []), [dresses, dress]);
  const newArrivalCodes = useMemo(() => new Set(getNewArrivals(dresses).map((item) => item.code)), [dresses]);

  return (
    <div className="min-h-screen bg-[#FFFCF8] text-[#0A0A0A] antialiased" dir="rtl">
      <LandingHeader profile={profile} />
      <main className="mx-auto max-w-[1600px] px-6 pb-24 pt-24 sm:px-8 sm:pt-28 lg:px-10">
        {loading ? <LoadingSkeleton /> : loadError ? <PieceLoadError message={loadError} /> : !dress ? <PieceMissing code={code} /> : <PieceDetails dress={dress} dresses={dresses} profile={profile} isNew={newArrivalCodes.has(dress.code)} saved={shortlist.has(dress.code)} onToggleSave={() => shortlist.toggle(dress.code)} related={related} />}
      </main>
      <LandingFooter profile={profile} />
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div aria-busy="true" className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="aspect-[3/4] animate-pulse bg-[#F5F1EB]" />
      <div className="space-y-4">
        <div className="h-4 w-32 animate-pulse bg-[#F5F1EB]" />
        <div className="h-9 w-2/3 animate-pulse bg-[#F5F1EB]" />
        <div className="h-24 w-full animate-pulse bg-[#F5F1EB]" />
      </div>
    </div>
  );
}

function PieceLoadError({ message }: { message: string }) {
  return (
    <div className="mx-auto max-w-[480px] border border-[#E8E2D9] bg-white p-10 text-center">
      <p className="text-[18px] font-[500] tracking-[-0.01em] text-[#0A0A0A]">تعذّر تحميل القطعة</p>
      <p className="mt-3 text-[13px] font-[300] leading-[1.7] text-[#8B8680]">{message}</p>
      <div className="mt-8 flex justify-center gap-3">
        <Button type="button" onClick={() => window.location.reload()} className="h-11 rounded-full bg-[#0A0A0A] px-6 text-[12px] font-medium text-white"><RotateCcw className="h-4 w-4" />تحديث</Button>
        <Link to="/landing" className="inline-flex h-11 items-center justify-center rounded-full border border-[#E8E2D9] px-6 text-[12px] font-medium text-[#0A0A0A]">المعروض</Link>
      </div>
    </div>
  );
}

function PieceMissing({ code }: { code: string }) {
  return (
    <div className="mx-auto max-w-[480px] border border-[#E8E2D9] bg-white p-10 text-center">
      <p className="text-[18px] font-[500] tracking-[-0.01em] text-[#0A0A0A]">هذه القطعة لم تعد في المعروض الحالي</p>
      <p className="mt-3 text-[13px] font-[300] leading-[1.7] text-[#8B8680]">القطعة <span dir="ltr" className="font-medium text-[#0A0A0A]">{code}</span> لم تعد في المعروض الحالي — ربما بيعت أو تغيّر كودها. المعروض الحي بانتظارك.</p>
      <Link to="/landing" className="mt-8 inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#0A0A0A] px-6 text-[12px] font-medium text-white"><ArrowRight className="h-4 w-4" />تصفحي المعروض الحالي</Link>
    </div>
  );
}

function PieceDetails({
  dress,
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
      <nav aria-label="مسار التنقل" className="flex items-center gap-2 text-[11px] font-medium tracking-[0.04em] text-[#8B8680]">
        <Link to="/landing" className="hover:text-[#0A0A0A]">المعروض</Link>
        <span>/</span>
        <span>{dress.category}</span>
        <span>/</span>
        <span dir="ltr" className="text-[#0A0A0A]">{dress.code}</span>
      </nav>

      <div className="mt-10 grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-16">
        <div className="relative bg-[#F5F1EB]">
          <DressPhoto brand={profile.brandName} src={dress.images[0]} alt={dress.name} className="aspect-[3/4] w-full object-cover" fallbackLabel={dress.category} />
          <div className="absolute right-4 top-4 flex gap-2">
            {isNew ? <span className="rounded-full bg-white px-3 py-1 text-[10px] font-medium tracking-[0.06em] text-[#0A0A0A] shadow-sm">جديد</span> : null}
            {dress.isForRent ? <span className="rounded-full bg-[#0A0A0A] px-3 py-1 text-[10px] font-medium tracking-[0.06em] text-white">إيجار</span> : null}
            {dress.isForSale && !dress.isForRent ? <span className="rounded-full bg-white px-3 py-1 text-[10px] font-medium tracking-[0.06em] text-[#0A0A0A] shadow-sm">بيع</span> : null}
          </div>
        </div>

        <div>
          <p className="text-[11px] font-medium tracking-[0.15em] text-[#8B8680]">{typeLabel} · {dress.category}</p>
          <h1 className="mt-4 text-[32px] font-[300] leading-[0.95] tracking-[-0.03em] text-[#0A0A0A] sm:text-[40px]">{dress.name}</h1>
          <p className="mt-6 text-[14px] font-[300] leading-[1.8] text-[#8B8680]">{dress.description || 'قطعة متاحة حالياً داخل المعرض ويمكن معاينتها وتجربتها خلال الموعد.'}</p>

          <div className="mt-8 grid grid-cols-3 gap-[1px] bg-[#E8E2D9] p-[1px]">
            <div className="bg-white p-5"><p className="text-[10px] font-medium tracking-[0.12em] text-[#8B8680]">المقاس</p><p className="mt-2 text-[14px] font-[500] text-[#0A0A0A]" dir="ltr">{dress.size}</p></div>
            <div className="bg-white p-5"><p className="text-[10px] font-medium tracking-[0.12em] text-[#8B8680]">اللون</p><p className="mt-2 text-[14px] font-[500] text-[#0A0A0A]">{dress.color}</p></div>
            <div className="bg-white p-5"><p className="text-[10px] font-medium tracking-[0.12em] text-[#8B8680]">الكود</p><p className="mt-2 text-[14px] font-[500] text-[#0A0A0A]" dir="ltr">{dress.code}</p></div>
          </div>

          <div className="mt-6 border border-[#E8E2D9] bg-[#FAF6F0] p-6">
            <p className="text-[10px] font-medium tracking-[0.12em] text-[#8B8680]">السعر</p>
            <div className="mt-3"><LandingPrice dress={dress} size="lg" /></div>
            {dress.isForRent && getDressSecurityDepositAmount(dress) > 0 ? <p className="mt-2 text-[12px] font-[300] text-[#8B8680]">تأمين {formatMoneyOMR(getDressSecurityDepositAmount(dress))}</p> : null}
          </div>

          <div className="mt-8 space-y-3">
            {appointmentLink ? <a href={appointmentLink} target="_blank" rel="noopener noreferrer" className="flex h-[48px] w-full items-center justify-center gap-2 rounded-full bg-[#0A0A0A] text-[13px] font-medium tracking-[0.02em] text-white hover:bg-[#0A0A0A]/90"><MessageCircle className="h-4 w-4" />حجز موعد لتجربة هذه القطعة</a> : null}
            <div className="flex gap-2">
              {inquiryLink ? <a href={inquiryLink} target="_blank" rel="noopener noreferrer" className="flex h-[48px] flex-1 items-center justify-center gap-2 rounded-full border border-[#E8E2D9] bg-white text-[13px] font-medium tracking-[0.02em] text-[#0A0A0A] hover:bg-[#0A0A0A]/5"><MessageCircle className="h-4 w-4" />استفسار سريع</a> : null}
              <button type="button" onClick={onToggleSave} className={`flex h-[48px] flex-1 items-center justify-center gap-2 rounded-full border text-[13px] font-medium tracking-[0.02em] ${saved ? 'border-[#0A0A0A] bg-[#0A0A0A] text-white' : 'border-[#E8E2D9] bg-white text-[#0A0A0A] hover:bg-[#0A0A0A]/5'}`}><Heart className={`h-4 w-4 ${saved ? 'fill-current' : ''}`} />{saved ? 'في اختياراتك' : 'احفظيها'}</button>
            </div>
            <Link to="/landing" className="flex h-[44px] w-full items-center justify-center gap-2 text-[12px] font-medium tracking-[0.04em] text-[#8B8680] hover:text-[#0A0A0A]"><ArrowRight className="h-4 w-4" />العودة للمعروض الكامل</Link>
          </div>
        </div>
      </div>

      {related.length > 0 ? (
        <section className="mt-24 border-t border-[#E8E2D9] pt-16">
          <h2 className="text-[20px] font-[500] tracking-[-0.02em] text-[#0A0A0A]">قطع مشابهة من فئة {dress.category}</h2>
          <div className="mt-8 grid grid-cols-2 gap-[1px] bg-[#E8E2D9] p-[1px] sm:grid-cols-4">
            {related.map((item) => (
              <Link key={item.code} to={piecePath(item.code)} className="group bg-[#FFFCF8]">
                <div className="aspect-[4/5] overflow-hidden bg-[#F5F1EB]"><DressPhoto brand={profile.brandName} src={item.images[0]} alt={item.name} className="h-full w-full object-cover transition-all duration-[1.2s] group-hover:scale-[1.05]" fallbackLabel={item.category} /></div>
                <div className="p-4"><p className="text-[11px] font-medium tracking-[0.08em] text-[#8B8680]">{item.category}</p><h3 className="mt-1.5 text-[13px] font-[500] leading-[1.3] tracking-[-0.01em] text-[#0A0A0A]">{item.name}</h3><div className="mt-3"><LandingPrice dress={item} /></div></div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}
