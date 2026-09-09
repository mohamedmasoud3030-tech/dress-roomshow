import { Check } from 'lucide-react';
import type { Dress } from '../../../features/dresses/dress.types';
import type { LandingProfile } from './types';
import { DressPhoto } from './DressPhoto';
import { Reveal } from './Reveal';

const PROMISES = [
  'صور حقيقية لكل قطعة معروضة، لا صور من الإنترنت',
  'موعد تجربة منظم داخل المعرض دون ازدحام',
  'تنظيف وصيانة بعد كل إيجار قبل عرض القطعة',
  'أسعار الإيجار والبيع والتأمين واضحة قبل الزيارة',
];

/** The showroom's story, told next to real pieces from its own catalogue. */
export function LandingAboutServices({ profile, dresses }: { profile: LandingProfile; dresses: Dress[] }) {
  const photos = dresses.filter((dress) => dress.images[0]);

  return (
    <section id="about" className="mt-24 scroll-mt-24 sm:mt-32">
      <div className="grid items-center gap-10 lg:grid-cols-[1fr_1fr] lg:gap-16">
        <Reveal>
          <div>
            <p className="text-xs font-black tracking-[0.2em] text-amber-600">قصتنا</p>
            <h2 className="mt-3 text-3xl font-black leading-snug text-slate-950 sm:text-4xl">
              {profile.aboutTitle}
            </h2>
            <p className="mt-5 text-sm leading-8 text-slate-600 sm:text-base">
              {profile.aboutDescription}
            </p>

            <ul className="mt-7 space-y-3">
              {PROMISES.map((promise) => (
                <li key={promise} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                    <Check aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={3} />
                  </span>
                  <span className="text-sm font-semibold leading-7 text-slate-700">{promise}</span>
                </li>
              ))}
            </ul>

            <div className="mt-8 flex items-center gap-4 border-r-4 border-amber-400 pr-4">
              <p className="text-lg font-black text-slate-950">{profile.brandName}</p>
              <p className="text-xs font-bold text-slate-500">{profile.shortTagline}</p>
            </div>
          </div>
        </Reveal>

        <Reveal delay={120}>
          <div className="relative">
            <div aria-hidden="true" className="absolute -left-4 -top-4 h-32 w-32 rounded-full bg-amber-200/40 blur-2xl" />
            <div className="relative grid grid-cols-5 gap-3 sm:gap-4">
              <div className="col-span-3">
                <div className="overflow-hidden rounded-[1.5rem] shadow-xl shadow-slate-900/10">
                  <DressPhoto
                    src={photos[0]?.images[0]}
                    alt={photos[0]?.name ?? 'قطعة من تشكيلة المعرض'}
                    className="aspect-[3/4] w-full object-cover"
                    fallbackLabel={photos[0]?.category ?? 'التشكيلة'}
                  />
                </div>
              </div>
              <div className="col-span-2 space-y-3 sm:space-y-4">
                <div className="overflow-hidden rounded-[1.5rem] shadow-lg shadow-slate-900/10">
                  <DressPhoto
                    src={photos[1]?.images[0]}
                    alt={photos[1]?.name ?? 'قطعة من تشكيلة المعرض'}
                    className="aspect-square w-full object-cover"
                    fallbackLabel={photos[1]?.category ?? 'التشكيلة'}
                  />
                </div>
                <div className="overflow-hidden rounded-[1.5rem] ring-2 ring-amber-300">
                  <DressPhoto
                    src={photos[2]?.images[0]}
                    alt={photos[2]?.name ?? 'قطعة من تشكيلة المعرض'}
                    className="aspect-square w-full object-cover"
                    fallbackLabel={photos[2]?.category ?? 'التشكيلة'}
                  />
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
