import { Clock, Instagram, Mail, MapPin, Phone } from 'lucide-react';
import type { LandingProfile } from './types';

const FOOTER_LINKS = [
  { href: '#available-dresses', label: 'المعروض' },
  { href: '#categories', label: 'الفئات' },
  { href: '#services', label: 'الخدمات' },
  { href: '#about', label: 'قصتنا' },
  { href: '#faq', label: 'الأسئلة الشائعة' },
  { href: '#contact', label: 'تواصلي معنا' },
];

export function LandingFooter({ profile }: { profile: LandingProfile }) {
  const instagramHandle = profile.contact.instagram.replace(/^@/, '');
  const year = new Date().getFullYear();

  return (
    <footer className="mt-24 border-t border-white/10 bg-[#0b0b12] text-slate-300 sm:mt-32">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr_1fr]">
          <div>
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-amber-300 to-amber-500 shadow-lg shadow-amber-900/30">
                <img src="/favicon.svg" alt="" aria-hidden="true" className="h-7 w-7" />
              </span>
              <div>
                <p className="text-base font-black text-white">{profile.brandName}</p>
                <p className="mt-0.5 text-xs font-semibold text-amber-300/90">
                  {profile.shortTagline}
                </p>
              </div>
            </div>
            <p className="mt-5 max-w-sm text-sm leading-7 text-slate-400">
              {profile.aboutDescription.slice(0, 160)}…
            </p>
          </div>

          <nav aria-label="روابط الصفحة">
            <p className="text-xs font-black tracking-[0.2em] text-amber-300">تصفحي</p>
            <ul className="mt-4 space-y-2.5">
              {FOOTER_LINKS.map((link) => (
                <li key={link.href}>
                  <a href={link.href} className="text-sm font-semibold transition hover:text-white">
                    {link.label}
                  </a>
                </li>
              ))}
              <li>
                <a
                  href="/login"
                  className="mt-1 inline-block text-sm font-semibold text-slate-500 transition hover:text-white"
                >
                  دخول إدارة المعرض
                </a>
              </li>
            </ul>
          </nav>

          <div>
            <p className="text-xs font-black tracking-[0.2em] text-amber-300">تواصلي</p>
            <ul className="mt-4 space-y-3 text-sm">
              <li className="flex items-start gap-2.5">
                <Phone aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
                <a
                  href={`tel:${profile.contact.phone.replace(/\s+/g, '')}`}
                  className="underline-offset-4 transition hover:text-white hover:underline"
                  dir="ltr"
                >
                  {profile.contact.phone}
                </a>
              </li>
              <li className="flex items-start gap-2.5">
                <Mail aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
                <a
                  href={`mailto:${profile.contact.email}`}
                  className="break-all underline-offset-4 transition hover:text-white hover:underline"
                  dir="ltr"
                >
                  {profile.contact.email}
                </a>
              </li>
              {profile.contact.instagram ? (
                <li className="flex items-start gap-2.5">
                  <Instagram aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
                  <a
                    href={`https://instagram.com/${instagramHandle}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline-offset-4 transition hover:text-white hover:underline"
                    dir="ltr"
                  >
                    {profile.contact.instagram}
                  </a>
                </li>
              ) : null}
              <li className="flex items-start gap-2.5">
                <Clock aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
                <span>{profile.contact.workingHours}</span>
              </li>
              <li className="flex items-start gap-2.5">
                <MapPin aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
                <span className="leading-7">{profile.contact.address}</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-white/10 pt-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} {profile.brandName} — جميع الحقوق محفوظة.
          </p>
          <div className="flex flex-wrap gap-3">
            <a href="/privacy" className="underline hover:text-white">الخصوصية</a>
            <a href="/terms" className="underline hover:text-white">الشروط</a>
            <a href="/setup" className="underline hover:text-white">تأسيس المعرض</a>
            <span>المعروض يحدّث تلقائياً من مخزون المعرض.</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
