import { useEffect, useState } from 'react';
import { CalendarDays, Menu, X } from 'lucide-react';
import { IconButton } from '../../../components/shared/Button';
import type { LandingProfile } from './types';
import { buildAppointmentInquiryMessage, buildLandingWhatsAppLink } from '../landingWhatsapp';

const NAV_LINKS = [
  { href: '#available-dresses', label: 'المعروض' },
  { href: '#categories', label: 'الفئات' },
  { href: '#services', label: 'الخدمات' },
  { href: '#about', label: 'قصتنا' },
  { href: '#faq', label: 'الأسئلة الشائعة' },
  { href: '#contact', label: 'تواصلي معنا' },
];

export function LandingHeader({ profile }: { profile: LandingProfile }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const appointmentLink = buildLandingWhatsAppLink(profile, buildAppointmentInquiryMessage());

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled || menuOpen
          ? 'border-b border-white/10 bg-[#0b0b12]/95 backdrop-blur-md'
          : 'border-b border-transparent bg-transparent'
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <a href="#top" className="flex min-w-0 items-center gap-3">
          <span className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-amber-300 to-amber-600 shadow-lg shadow-amber-900/30">
            <img src="/favicon.svg" alt="" aria-hidden="true" className="h-7 w-7" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[0.95rem] font-black leading-tight text-white">
              {profile.brandName}
            </span>
            <span className="block truncate text-[0.7rem] font-semibold text-amber-300/90">
              {profile.shortTagline}
            </span>
          </span>
        </a>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="تنقل صفحة العرض">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-full px-3.5 py-2 text-sm font-bold text-slate-300 transition hover:bg-white/10 hover:text-white"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {appointmentLink ? (
            <a
              href={appointmentLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-l from-amber-300 to-amber-500 px-4 py-2.5 text-sm font-black text-slate-950 shadow-lg shadow-amber-900/25 transition hover:brightness-105"
            >
              <CalendarDays aria-hidden="true" className="h-4 w-4" />
              <span className="hidden sm:inline">احجزي موعد تجربة</span>
              <span className="sm:hidden">موعد</span>
            </a>
          ) : null}

          <IconButton
            type="button"
            variant="quiet"
            size="sm"
            onClick={() => setMenuOpen((open) => !open)}
            label={menuOpen ? 'إغلاق القائمة' : 'فتح القائمة'}
            aria-expanded={menuOpen}
            className="h-11 w-11 rounded-xl border border-white/15 p-0 text-white hover:bg-white/10 lg:hidden"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </IconButton>
        </div>
      </div>

      {menuOpen ? (
        <nav
          className="border-t border-white/10 bg-[#0b0b12]/98 px-4 py-3 backdrop-blur-md lg:hidden"
          aria-label="تنقل صفحة العرض"
        >
          <div className="flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="rounded-xl px-4 py-3 text-sm font-bold text-slate-200 transition hover:bg-white/10 hover:text-white"
              >
                {link.label}
              </a>
            ))}
          </div>
        </nav>
      ) : null}
    </header>
  );
}
