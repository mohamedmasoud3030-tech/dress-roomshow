import { Clock, Instagram, Mail, MapPin, MessageCircle, Phone } from 'lucide-react';
import { buildAppointmentInquiryMessage, buildLandingWhatsAppLink } from '../landingWhatsapp';
import type { LandingProfile } from './types';
import { Reveal } from './Reveal';

function ContactRow({
  icon: Icon,
  label,
  children,
  tone = 'amber',
}: {
  icon: typeof Phone;
  label: string;
  children: React.ReactNode;
  tone?: 'amber' | 'emerald';
}) {
  const toneClass = tone === 'emerald' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700';
  return (
    <div className="flex items-start gap-4 rounded-2xl p-4 transition hover:bg-slate-50">
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${toneClass}`}>
        <Icon aria-hidden="true" className="h-5 w-5" />
      </span>
      <span className="min-w-0">
        <span className="block text-[0.7rem] font-bold text-slate-500">{label}</span>
        <span className="mt-1 block">{children}</span>
      </span>
    </div>
  );
}

export function LandingContact({ profile }: { profile: LandingProfile }) {
  const appointmentLink = buildLandingWhatsAppLink(profile, buildAppointmentInquiryMessage());
  const primaryPhoneHref = `tel:${profile.contact.phone.replace(/\s+/g, '')}`;
  const primaryEmailHref = `mailto:${profile.contact.email}`;
  const instagramHandle = profile.contact.instagram.replace(/^@/, '');
  const mapsHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    profile.contact.address,
  )}`;

  return (
    <section id="contact" className="mt-24 scroll-mt-24 sm:mt-32">
      <Reveal>
        <div className="overflow-hidden rounded-[2rem] bg-[#0b0b12] text-white">
          <div className="grid lg:grid-cols-[0.95fr_1.05fr]">
            {/* Invitation */}
            <div className="relative overflow-hidden p-8 sm:p-10 lg:p-12">
              <div aria-hidden="true" className="pointer-events-none absolute inset-0">
                <div className="absolute -bottom-20 -right-16 h-64 w-64 rounded-full bg-amber-500/20 blur-[100px]" />
              </div>
              <div className="relative">
                <p className="text-xs font-black tracking-[0.2em] text-amber-300">تواصلي معنا</p>
                <h2 className="mt-3 text-3xl font-black sm:text-4xl">يسعدنا تجهيز إطلالتك</h2>
                <p className="mt-4 text-sm leading-8 text-slate-300">
                  أرسلي طلب الموعد عبر واتساب وسنؤكد لكِ الوقت وتوفر القطعة، أو اتصلي بنا خلال
                  ساعات العمل لأي استفسار.
                </p>

                {appointmentLink ? (
                  <a
                    href={appointmentLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-8 inline-flex min-h-14 items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-l from-amber-300 to-amber-500 px-7 py-4 text-sm font-black text-slate-950 shadow-xl shadow-amber-900/30 transition hover:-translate-y-0.5"
                  >
                    <MessageCircle aria-hidden="true" className="h-4 w-4" />
                    احجزي موعدك عبر واتساب
                  </a>
                ) : (
                  <p className="mt-8 rounded-2xl border border-white/15 bg-white/5 p-4 text-sm text-slate-300">
                    أضيفي رقم واتساب من إعدادات المعرض ليظهر زر الحجز هنا.
                  </p>
                )}

                <div className="mt-10 flex items-center gap-2 text-xs font-bold text-slate-400">
                  <Clock aria-hidden="true" className="h-4 w-4 text-amber-300" />
                  {profile.contact.workingHours}
                </div>
              </div>
            </div>

            {/* Details */}
            <div className="border-t border-white/10 bg-white/[0.03] p-4 sm:p-8 lg:border-r lg:border-t-0">
              <div className="grid gap-1">
                <ContactRow icon={Phone} label="الهاتف">
                  <a
                    href={primaryPhoneHref}
                    className="block text-base font-black text-white underline-offset-4 hover:underline"
                    dir="ltr"
                  >
                    {profile.contact.phone}
                  </a>
                  {profile.contact.alternatePhones?.map((phone) => (
                    <a
                      key={phone}
                      href={`tel:${phone.replace(/\s+/g, '')}`}
                      className="mt-0.5 block text-sm text-slate-400 underline-offset-4 hover:underline"
                      dir="ltr"
                    >
                      {phone}
                    </a>
                  ))}
                </ContactRow>

                {profile.contact.whatsapp ? (
                  <ContactRow icon={MessageCircle} label="واتساب" tone="emerald">
                    {appointmentLink ? (
                      <a
                        href={appointmentLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-base font-black text-white underline-offset-4 hover:underline"
                        dir="ltr"
                      >
                        {profile.contact.whatsapp}
                      </a>
                    ) : (
                      <span className="block text-base font-black text-white" dir="ltr">
                        {profile.contact.whatsapp}
                      </span>
                    )}
                  </ContactRow>
                ) : null}

                <ContactRow icon={Mail} label="البريد الإلكتروني">
                  <a
                    href={primaryEmailHref}
                    className="block break-all text-sm font-bold text-white underline-offset-4 hover:underline"
                    dir="ltr"
                  >
                    {profile.contact.email}
                  </a>
                  {profile.contact.alternateEmail ? (
                    <a
                      href={`mailto:${profile.contact.alternateEmail}`}
                      className="mt-0.5 block break-all text-xs text-slate-400 underline-offset-4 hover:underline"
                      dir="ltr"
                    >
                      {profile.contact.alternateEmail}
                    </a>
                  ) : null}
                </ContactRow>

                {profile.contact.instagram ? (
                  <ContactRow icon={Instagram} label="إنستجرام">
                    <a
                      href={`https://instagram.com/${instagramHandle}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-sm font-bold text-white underline-offset-4 hover:underline"
                      dir="ltr"
                    >
                      {profile.contact.instagram}
                    </a>
                  </ContactRow>
                ) : null}

                <ContactRow icon={MapPin} label="العنوان">
                  <span className="block text-sm font-semibold leading-7 text-white">
                    {profile.contact.address}
                  </span>
                  <a
                    href={mapsHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1.5 inline-block text-xs font-black text-amber-300 underline-offset-4 hover:underline"
                  >
                    افتحي الموقع على الخريطة
                  </a>
                </ContactRow>
              </div>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
