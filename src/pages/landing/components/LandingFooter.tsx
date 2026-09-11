import type { LandingProfile } from './types';

export function LandingFooter({ profile }: { profile: LandingProfile }) {
  const year = new Date().getFullYear();
  return (
    <footer className="bg-[#FFFCF8] py-8 text-[11px] text-[#8B8680]">
      <div className="mx-auto max-w-[1600px] px-6 sm:px-8 lg:px-10">
        <div className="flex flex-col gap-3 border-t border-[#E8E2D9] pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="text-[13px] font-bold tracking-tight text-black">{profile.brandName}</span>
            <span className="h-3 w-px bg-black/10" />
            <span>© {year} · صحار</span>
            <a href="/login" className="hover:text-black">دخول إدارة المعرض</a>
          </div>
          <div className="flex gap-4">
            <a href="/privacy" className="hover:text-black">الخصوصية</a>
            <a href="/terms" className="hover:text-black">الشروط</a>
            <span className="flex items-center gap-1.5"><span className="h-1 w-1 rounded-full bg-emerald-500" /> مباشر</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
