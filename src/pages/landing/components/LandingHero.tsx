import { ArrowDown, CalendarDays, ShieldCheck, Sparkles, Stars } from 'lucide-react';
import type { Dress } from '../../../features/dresses/dress.types';
import type { LandingProfile } from './types';
import { DressPhoto } from './DressPhoto';
import { Reveal } from './Reveal';
import { buildAppointmentInquiryMessage, buildLandingWhatsAppLink } from '../landingWhatsapp';

type Props = {
  profile: LandingProfile;
  dresses: Dress[];
  rentableCount: number;
  saleCount: number;
};

/**
 * The shop window.
 *
 * Built as a boutique front page: real catalogue photography on a dark stage,
 * the showroom's own headline, and honest live numbers about what is actually
 * available. No stock imagery — every photo here comes from the inventory the
 * operator manages in the app.
 */
export function LandingHero({ profile, dresses, rentableCount, saleCount }: Props) {
  const appointmentLink = buildLandingWhatsAppLink(profile, buildAppointmentInquiryMessage());
  const photos = dresses.filter((dress) => dress.images[0]).slice(0, 3);

  const stats = [
    { value: dresses.length, label: 'قطعة معروضة الآن' },
    { value: rentableCount, label: 'جاهزة للإيجار' },
    { value: saleCount, label: 'متاحة للبيع' },
  ];

  return (
    <section id="top" className="relative overflow-hidden bg-[#0b0b12] text-white">
      {/* Stage lighting — warm gold, never a busy pattern. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -right-32 -top-40 h-[30rem] w-[30rem] rounded-full bg-amber-500/20 blur-[120px]" />
        <div className="absolute -bottom-40 -left-24 h-[26rem] w-[26rem] rounded-full bg-amber-400/10 blur-[120px]" />
        <div className="absolute inset-y-0 left-1/2 hidden w-px bg-gradient-to-b from-transparent via-white/10 to-transparent lg:block" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 pb-16 pt-28 sm:px-6 sm:pt-32 lg:px-8 lg:pb-24 lg:pt-40">
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
          {/* Copy */}
          <Reveal>
            <p className="inline-flex items-center gap-2 rounded-full border border-amber-300/30 bg-amber-300/10 px-4 py-1.5 text-xs font-extrabold text-amber-200">
              <Stars aria-hidden="true" className="h-3.5 w-3.5" />
              {profile.shortTagline}
            </p>

            <h1 className="mt-6 text-[2.1rem] font-black leading-[1.25] tracking-tight sm:text-5xl lg:text-[3.6rem] lg:leading-[1.18]">
              <span className="bg-gradient-to-l from-white via-amber-100 to-amber-300 bg-clip-text text-transparent">
                {profile.heroTitle}
              </span>
            </h1>

            <p className="mt-5 max-w-xl text-[0.95rem] leading-8 text-slate-300 sm:text-base">
              {profile.heroDescription}
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              {appointmentLink ? (
                <a
                  href={appointmentLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex min-h-14 items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-l from-amber-300 to-amber-500 px-7 py-4 text-sm font-black text-slate-950 shadow-xl shadow-amber-900/30 transition duration-300 hover:-translate-y-0.5 hover:shadow-amber-900/50"
                >
                  <CalendarDays aria-hidden="true" className="h-4 w-4" />
                  احجزي موعد تجربة
                </a>
              ) : null}
              <a
                href="#available-dresses"
                className="group inline-flex min-h-14 items-center justify-center gap-2.5 rounded-2xl border border-white/20 bg-white/5 px-7 py-4 text-sm font-black text-white backdrop-blur transition duration-300 hover:-translate-y-0.5 hover:bg-white/10"
              >
                <Sparkles aria-hidden="true" className="h-4 w-4 text-amber-300" />
                شاهدي المعروض
                <ArrowDown aria-hidden="true" className="h-4 w-4 transition group-hover:translate-y-0.5" />
              </a>
            </div>

            {/* Live numbers straight from the catalogue */}
            <dl className="mt-10 grid max-w-lg grid-cols-3 gap-3 sm:gap-5">
              {stats.map((stat) => (
                <div key={stat.label} className="border-r-2 border-amber-400/40 pr-3 sm:pr-4">
                  <dt className="text-2xl font-black text-amber-300 sm:text-4xl">{stat.value}</dt>
                  <dd className="mt-1 text-[0.7rem] font-bold leading-5 text-slate-400 sm:text-xs">
                    {stat.label}
                  </dd>
                </div>
              ))}
            </dl>

            <p className="mt-8 inline-flex items-center gap-2 text-xs font-semibold text-slate-400">
              <ShieldCheck aria-hidden="true" className="h-4 w-4 text-emerald-400" />
              المعروض محدّث لحظياً من مخزون المعرض
            </p>
          </Reveal>

          {/* Photo stage */}
          <Reveal delay={120} className="relative">
            <div className="grid grid-cols-5 gap-3 sm:gap-4">
              <div className="col-span-3 space-y-3 sm:space-y-4">
                <div className="overflow-hidden rounded-[1.75rem] ring-1 ring-white/15">
                  <DressPhoto
                    src={photos[0]?.images[0]}
                    alt={photos[0]?.name ?? 'فستان من معروض المعرض'}
                    className="aspect-[3/4] w-full transition duration-700 hover:scale-[1.04]"
                    fallbackLabel={photos[0]?.category ?? 'المعروض'}
                  />
                </div>
              </div>
              <div className="col-span-2 space-y-3 sm:space-y-4">
                <div className="overflow-hidden rounded-[1.75rem] ring-1 ring-white/15">
                  <DressPhoto
                    src={photos[1]?.images[0]}
                    alt={photos[1]?.name ?? 'قطعة من معروض المعرض'}
                    className="aspect-[4/5] w-full transition duration-700 hover:scale-[1.04]"
                    fallbackLabel={photos[1]?.category ?? 'المعروض'}
                  />
                </div>
                <div className="overflow-hidden rounded-[1.75rem] ring-1 ring-amber-300/30">
                  <DressPhoto
                    src={photos[2]?.images[0]}
                    alt={photos[2]?.name ?? 'قطعة من معروض المعرض'}
                    className="aspect-[4/5] w-full transition duration-700 hover:scale-[1.04]"
                    fallbackLabel={photos[2]?.category ?? 'المعروض'}
                  />
                </div>
              </div>
            </div>

            {/* Floating promise card */}
            <div className="absolute -bottom-6 right-0 hidden rounded-2xl border border-white/15 bg-white/10 p-4 shadow-2xl backdrop-blur-md sm:block">
              <p className="text-xs font-bold text-amber-200">زيارة منظمة</p>
              <p className="mt-1 text-sm font-black text-white">جرّبي القطعة قبل القرار</p>
              <p className="mt-1 text-[0.7rem] text-slate-300">بموعد مسبق ودون ازدحام</p>
            </div>
          </Reveal>
        </div>
      </div>

      {/* Bottom fade into the cream body */}
      <div aria-hidden="true" className="h-16 bg-gradient-to-b from-[#0b0b12] to-[#faf8f4]" />
    </section>
  );
}
