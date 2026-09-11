import type { LandingProfile } from './types';

export function LandingAboutServices({ profile }: { profile: LandingProfile }) {
  return (
    <section id="about" className="bg-white py-10 sm:py-12">
      <div className="mx-auto max-w-[1600px] px-6 sm:px-8 lg:px-10">
        <div className="flex flex-col gap-4 border-y border-[#E8E2D9] py-8 sm:flex-row sm:items-center sm:justify-between sm:gap-8">
          <h2 className="text-[13px] font-medium tracking-[0.08em] text-black">{profile.aboutTitle}</h2>
          <p className="max-w-[56ch] text-[12px] font-light leading-[1.7] text-[#8B8680]">{profile.aboutDescription.slice(0, 160)}…</p>
          <p className="text-[11px] tracking-[0.08em] text-black">{profile.brandName} · صحار</p>
        </div>
      </div>
    </section>
  );
}
