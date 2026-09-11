import type { Dress } from '../../../features/dresses/dress.types';
import type { LandingProfile } from './types';
import { DressPhoto } from './DressPhoto';
import { buildAppointmentInquiryMessage, buildLandingWhatsAppLink } from '../landingWhatsapp';

type Props = {
  profile: LandingProfile;
  dresses: Dress[];
  rentableCount: number;
  saleCount: number;
};

export function LandingHero({ profile, dresses }: Props) {
  const appointmentLink = buildLandingWhatsAppLink(profile, buildAppointmentInquiryMessage());
  const heroDress = dresses.find((d) => d.images[0]) ?? dresses[0];

  return (
    <section id="top" className="relative bg-[#0A0A0A] text-[#FFFCF8]">
      <div className="relative mx-auto grid max-w-[1600px] grid-cols-1 lg:grid-cols-[1.05fr_0.95fr]">
        {/* Copy - compact */}
        <div className="flex flex-col justify-center px-6 pb-10 pt-[88px] sm:px-8 sm:pb-12 sm:pt-[96px] lg:px-10 lg:pb-14 xl:px-12">
          <div className="flex items-center gap-2">
            <span className="h-px w-6 bg-[#C9A86A]" />
            <span className="text-[10px] tracking-[0.18em] text-[#C9A86A]">{profile.brandName} · صحار</span>
          </div>

          <h1 className="mt-5 max-w-[16ch] text-[32px] font-[300] leading-[1.05] tracking-[-0.03em] sm:text-[42px] lg:text-[48px]">
            {profile.heroTitle}
          </h1>

          <p className="mt-4 max-w-[36ch] text-[13px] font-[300] leading-[1.7] text-white/55">
            {profile.heroDescription}
          </p>

          <div className="mt-7 flex items-center gap-3">
            {appointmentLink ? (
              <a href={appointmentLink} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 items-center justify-center rounded-full bg-white px-5 text-[12px] font-medium text-[#0A0A0A] hover:bg-white/90">
                حجز موعد
              </a>
            ) : null}
            <a href="#available-dresses" className="inline-flex h-9 items-center justify-center rounded-full border border-white/15 px-5 text-[12px] text-white/70 hover:border-white/25 hover:text-white">
              المعروض · {dresses.length}
            </a>
          </div>
        </div>

        {/* Visual - compact */}
        <div className="relative flex items-center justify-center bg-[#0E0E0E] px-6 py-8 sm:px-8 lg:px-10 lg:py-10">
          <div className="relative w-full max-w-[440px] aspect-[4/5] overflow-hidden bg-[#141414]">
            {heroDress?.images[0] ? (
              <DressPhoto brand={profile.brandName} src={heroDress.images[0]} alt={heroDress.name} className="h-full w-full object-cover" priority />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-white/20 text-[11px] tracking-[0.2em]">{profile.brandName}</div>
            )}
            <div className="absolute inset-0 border border-white/10 pointer-events-none m-2" />
          </div>
        </div>
      </div>
    </section>
  );
}
