export function LandingValueStrip() {
  return (
    <div className="border-y border-[#E8E2D9]/80 bg-white">
      <div className="mx-auto max-w-[1600px] px-6 sm:px-8 lg:px-10">
        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 py-3 text-[11px] tracking-[0.08em] text-[#8B8680] sm:justify-between sm:py-3.5">
          <span className="flex items-center gap-2"><span className="h-px w-4 bg-[#0A0A0A]/20" /> صور حقيقية لكل قطعة</span>
          <span className="flex items-center gap-2"><span className="h-px w-4 bg-[#0A0A0A]/20" /> تجربة بموعد خاص</span>
          <span className="flex items-center gap-2"><span className="h-px w-4 bg-[#0A0A0A]/20" /> أسعار واضحة قبل الزيارة</span>
          <span className="hidden items-center gap-2 sm:flex"><span className="h-1 w-1 rounded-full bg-emerald-500" /> {new Date().getFullYear()} · متاح الآن</span>
        </div>
      </div>
    </div>
  );
}
