import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import type { LandingProfile } from './types';
import { buildAppointmentInquiryMessage, buildLandingWhatsAppLink } from '../landingWhatsapp';
import { useShortlist } from '../useShortlist';

const NAV_LINKS = [
  { href: '#available-dresses', label: 'المعروض' },
  { href: '#categories', label: 'الفئات' },
  { href: '#new-arrivals', label: 'جديد' },
  { href: '#about', label: 'قصتنا' },
  { href: '#contact', label: 'تواصلي' },
];

export function LandingHeader({ profile }: { profile: LandingProfile }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const shortlist = useShortlist();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  const appointmentLink = buildLandingWhatsAppLink(profile, buildAppointmentInquiryMessage());
  const isOverDark = !scrolled && !menuOpen;

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
          isOverDark
            ? 'border-b border-white/[0.08] bg-transparent'
            : 'border-b border-[#E8E2D9] bg-[#FFFCF8]/80 backdrop-blur-2xl supports-[backdrop-filter]:bg-[#FFFCF8]/70'
        }`}
      >
        {/* Top announcement bar - only when scrolled */}
        <div
          className={`overflow-hidden border-b transition-all duration-500 ${
            scrolled ? 'max-h-10 border-[#E8E2D9] bg-[#0A0A0A] text-[#FFFCF8]' : 'max-h-0 border-transparent'
          }`}
        >
          <div className="mx-auto flex max-w-[1600px] items-center justify-center gap-6 px-6 py-2.5 text-[11px] font-medium tracking-[0.12em]">
            <span className="hidden sm:inline">توصيل واستشارة مجانية داخل مسقط</span>
            <span className="h-3 w-px bg-white/20 hidden sm:block" />
            <span>مواعيد تجربة خاصة بموعد مسبق</span>
          </div>
        </div>

        <div className="mx-auto flex h-[68px] max-w-[1600px] items-center justify-between gap-6 px-6 sm:px-8 lg:px-10">
          {/* Right - Menu + Brand for RTL, actually left visually */}
          <div className="flex items-center gap-8">
            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-expanded={menuOpen}
              aria-label={menuOpen ? 'إغلاق القائمة' : 'فتح القائمة'}
              className={`group flex h-10 w-10 items-center justify-center rounded-full border transition-all duration-300 lg:hidden ${
                isOverDark
                  ? 'border-white/15 bg-white/5 text-white hover:bg-white/10'
                  : 'border-[#0A0A0A]/10 bg-[#0A0A0A]/[0.02] text-[#0A0A0A] hover:bg-[#0A0A0A]/5'
              }`}
            >
              <span className="relative h-3.5 w-4">
                <span
                  className={`absolute left-0 top-0 h-px w-4 bg-current transition-all duration-300 ${
                    menuOpen ? 'translate-y-[6px] rotate-45' : ''
                  }`}
                />
                <span
                  className={`absolute left-0 top-[6px] h-px w-3 bg-current transition-all duration-200 ${
                    menuOpen ? 'opacity-0' : 'opacity-100'
                  }`}
                />
                <span
                  className={`absolute left-0 top-[12px] h-px w-4 bg-current transition-all duration-300 ${
                    menuOpen ? '-translate-y-[6px] -rotate-45' : ''
                  }`}
                />
              </span>
            </button>

            <a href="#top" className="flex items-center gap-3.5">
              <span className={`text-[22px] font-[800] tracking-[-0.02em] transition-colors duration-500 ${isOverDark ? 'text-white' : 'text-[#0A0A0A]'}`}>
                {profile.brandName}
              </span>
              <span className={`hidden h-4 w-px sm:block transition-colors duration-500 ${isOverDark ? 'bg-white/20' : 'bg-[#0A0A0A]/15'}`} />
              <span className={`hidden text-[10px] font-medium tracking-[0.18em] sm:block transition-colors duration-500 ${isOverDark ? 'text-white/60' : 'text-[#8B8680]'}`}>
                EST. OMAN
              </span>
            </a>
          </div>

          {/* Center - Navigation */}
          <nav className="hidden items-center gap-1 lg:flex" aria-label="تنقل">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className={`relative px-5 py-2 text-[13px] font-medium tracking-[0.02em] transition-colors duration-300 ${
                  isOverDark ? 'text-white/70 hover:text-white' : 'text-[#0A0A0A]/60 hover:text-[#0A0A0A]'
                }`}
              >
                {link.label}
              </a>
            ))}
          </nav>

          {/* Left - Actions */}
          <div className="flex items-center gap-2">
            {shortlist.codes.length > 0 ? (
              <a
                href="#available-dresses"
                className={`relative flex h-10 w-10 items-center justify-center rounded-full border text-[11px] font-bold tracking-wide transition-all duration-300 ${
                  isOverDark
                    ? 'border-white/15 bg-white/5 text-white hover:bg-white/10'
                    : 'border-[#0A0A0A]/10 bg-[#0A0A0A]/[0.03] text-[#0A0A0A] hover:bg-[#0A0A0A]/5'
                }`}
                aria-label={`اختياراتك ${shortlist.codes.length}`}
              >
                {shortlist.codes.length}
              </a>
            ) : null}

            {appointmentLink ? (
              <a
                href={appointmentLink}
                target="_blank"
                rel="noopener noreferrer"
                className={`group hidden h-10 items-center gap-2 rounded-full border px-5 text-[12px] font-medium tracking-[0.02em] transition-all duration-300 sm:inline-flex ${
                  isOverDark
                    ? 'border-white bg-white text-[#0A0A0A] hover:bg-white/90'
                    : 'border-[#0A0A0A] bg-[#0A0A0A] text-white hover:bg-[#0A0A0A]/90'
                }`}
              >
                <span>تواصلي</span>
                <span className="transition-transform duration-300 group-hover:translate-x-[-2px]">←</span>
              </a>
            ) : null}

            {appointmentLink ? (
              <a
                href={appointmentLink}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-flex h-10 w-10 items-center justify-center rounded-full border transition-all duration-300 sm:hidden ${
                  isOverDark ? 'border-white bg-white text-[#0A0A0A]' : 'border-[#0A0A0A] bg-[#0A0A0A] text-white'
                }`}
                aria-label="تواصلي عبر واتساب"
              >
                <span className="text-[11px] font-bold">واتساب</span>
              </a>
            ) : null}
          </div>
        </div>
      </header>

      {/* Mobile Fullscreen Menu - Premium */}
      <div
        className={`fixed inset-0 z-[60] bg-[#FFFCF8] transition-all duration-700 ease-[cubic-bezier(0.76,0,0.24,1)] lg:hidden ${
          menuOpen ? 'translate-y-0' : '-translate-y-full'
        }`}
      >
        <div className="flex h-[68px] items-center justify-between border-b border-[#E8E2D9] px-6 sm:px-8">
          <span className="text-[18px] font-[800] tracking-[-0.02em] text-[#0A0A0A]">{profile.brandName}</span>
          <button
            type="button"
            onClick={() => setMenuOpen(false)}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[#0A0A0A]/10 bg-[#0A0A0A]/[0.02] text-[#0A0A0A]"
            aria-label="إغلاق"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex h-[calc(100%-68px)] flex-col">
          <nav className="flex-1 px-6 py-12 sm:px-8">
            <div className="space-y-1">
              {NAV_LINKS.map((link, i) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="group flex items-baseline justify-between border-b border-[#0A0A0A]/[0.06] py-6 last:border-0"
                  style={{ transitionDelay: `${i * 40}ms` }}
                >
                  <span className="text-[32px] font-[300] tracking-[-0.02em] text-[#0A0A0A] transition-colors duration-300 group-hover:text-[#8B8680] sm:text-[40px]">
                    {link.label}
                  </span>
                  <span className="text-[11px] font-medium tracking-[0.15em] text-[#8B8680]">0{i + 1}</span>
                </a>
              ))}
            </div>
          </nav>

          <div className="border-t border-[#E8E2D9] bg-[#0A0A0A] p-6 text-[#FFFCF8] sm:p-8">
            <div className="space-y-6">
              <div>
                <p className="text-[11px] font-medium tracking-[0.15em] text-white/50">تواصلي</p>
                <a href={`tel:${profile.contact.phone}`} dir="ltr" className="mt-3 block text-[18px] font-[400] tracking-[-0.01em]">
                  {profile.contact.phone}
                </a>
                <p className="mt-1 text-[13px] text-white/60">{profile.contact.workingHours}</p>
              </div>
              {appointmentLink ? (
                <a
                  href={appointmentLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-[56px] w-full items-center justify-center rounded-full bg-white text-[14px] font-medium tracking-[0.02em] text-[#0A0A0A]"
                >
                  تواصلي لتجربة خاصة
                </a>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
