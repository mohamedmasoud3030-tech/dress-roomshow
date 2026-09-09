import { ArrowLeft, Sparkles } from 'lucide-react';
import { formatMoneyOMR } from '../../../shared/utils/format';
import type { LandingDress } from '../landingDress.repository';
import type { LandingProfile } from './types';
import { DressPhoto } from './DressPhoto';
import { Reveal } from './Reveal';
import { buildAppointmentInquiryMessage, buildLandingWhatsAppLink } from '../landingWhatsapp';

/**
 * A horizontal rail of what just landed.
 *
 * Rendered only when the catalogue genuinely contains recent pieces, so an
 * established showroom with nothing new this month is not given an empty shelf.
 */
export function LandingNewArrivals({
  profile,
  dresses,
  onSelect,
}: {
  profile: LandingProfile;
  dresses: LandingDress[];
  onSelect: (dress: LandingDress) => void;
}) {
  if (dresses.length === 0) return null;

  return (
    <section className="mt-24 sm:mt-32">
      <Reveal>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black tracking-[0.2em] text-amber-600">وصل حديثاً</p>
            <h2 className="mt-2 text-3xl font-black text-slate-950 sm:text-4xl">
              جديد المعرض هذا الشهر
            </h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              أحدث ما أُضيف أو عاد من الصيانة وأصبح جاهزاً للتجربة.
            </p>
          </div>
          <span className="inline-flex items-center gap-2 self-start rounded-full bg-amber-50 px-4 py-2 text-xs font-black text-amber-800 sm:self-auto">
            <Sparkles aria-hidden="true" className="h-3.5 w-3.5" />
            {dresses.length} قطعة جديدة
          </span>
        </div>
      </Reveal>

      <div className="mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-3 [scrollbar-width:thin]">
        {dresses.map((dress, index) => {
          const link = buildLandingWhatsAppLink(
            profile,
            buildAppointmentInquiryMessage({
              code: dress.code,
              name: dress.name,
              size: dress.size,
              color: dress.color,
            }),
          );
          return (
            <Reveal key={dress.id} delay={index * 60} className="w-[78%] shrink-0 snap-start sm:w-[46%] lg:w-[31%]">
              <article className="group flex h-full flex-col overflow-hidden rounded-[1.5rem] border border-slate-200/80 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:border-amber-300 hover:shadow-xl">
                <div className="relative">
                  <DressPhoto
            brand={profile.brandName}
                    src={dress.images[0]}
                    alt={dress.name}
                    className="aspect-[4/5] w-full transition duration-[900ms] group-hover:scale-105"
                    fallbackLabel={dress.category}
                  />
                  <span className="absolute right-3 top-3 rounded-full bg-amber-400 px-3 py-1 text-[0.65rem] font-black text-slate-950">
                    جديد
                  </span>
                </div>
                <div className="flex flex-1 flex-col gap-3 p-5">
                  <div>
                    <h3 className="text-base font-black leading-snug text-slate-950">{dress.name}</h3>
                    <p className="mt-1 text-[0.7rem] font-bold text-amber-700">
                      {dress.category} · مقاس <span dir="ltr">{dress.size}</span>
                    </p>
                  </div>
                  <p className="text-sm font-black text-slate-950">
                    {dress.isForRent
                      ? `إيجار ${formatMoneyOMR(dress.rentalPrice)}`
                      : `بيع ${formatMoneyOMR(dress.salePrice)}`}
                  </p>
                  <div className="mt-auto flex gap-2">
                    <button
                      type="button"
                      onClick={() => onSelect(dress)}
                      className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl border border-slate-300 px-3 py-2.5 text-xs font-black text-slate-700 transition hover:bg-slate-50"
                    >
                      شاهديها في المعروض
                      <ArrowLeft aria-hidden="true" className="mr-1 h-3.5 w-3.5" />
                    </button>
                    {link ? (
                      <a
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl bg-slate-950 px-3 py-2.5 text-xs font-black text-white transition hover:bg-slate-800"
                      >
                        احجزي موعد
                      </a>
                    ) : null}
                  </div>
                </div>
              </article>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}
