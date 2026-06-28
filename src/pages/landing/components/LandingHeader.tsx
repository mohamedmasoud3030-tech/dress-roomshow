import type { LandingProfile } from './types';

export function LandingHeader({ profile }: { profile: LandingProfile }) {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-bold text-violet-700">{profile.shortTagline}</p>
            <h1 className="mt-1 text-2xl font-black text-slate-950 sm:text-3xl">{profile.brandName}</h1>
          </div>
          <nav className="flex flex-wrap gap-2 text-sm font-bold text-slate-700">
            <a href="#available-dresses" className="rounded-full px-3 py-2 transition hover:bg-stone-100">المعروض</a>
            <a href="#categories" className="rounded-full px-3 py-2 transition hover:bg-stone-100">الفئات</a>
            <a href="#about" className="rounded-full px-3 py-2 transition hover:bg-stone-100">من نحن</a>
            <a href="#services" className="rounded-full px-3 py-2 transition hover:bg-stone-100">الخدمات</a>
            <a href="#faq" className="rounded-full px-3 py-2 transition hover:bg-stone-100">الأسئلة الشائعة</a>
            <a href="#contact" className="rounded-full px-3 py-2 transition hover:bg-stone-100">تواصل معنا</a>
          </nav>
        </div>
      </div>
    </header>
  );
}
