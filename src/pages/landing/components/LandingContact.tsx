import type { LandingProfile } from './types';

export function LandingContact({ profile }: { profile: LandingProfile }) {
  const primaryPhoneHref = `tel:${profile.contact.phone.replace(/\s+/g, '')}`;
  const primaryEmailHref = `mailto:${profile.contact.email}`;
  // Keep structured address support for settings editor compatibility
  const addressLines = profile.contact.addressLines ?? [profile.contact.address];
  const mapQuery = profile.contact.mapQuery ?? profile.contact.address;
  const mapsHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`;

  return (
    <section id="contact" className="bg-white py-6">
      <div className="mx-auto max-w-[1600px] px-6 sm:px-8 lg:px-10">
        <div className="flex flex-wrap items-center justify-between gap-3 border-y border-[#E8E2D9] py-3 text-[11px]">
          <div className="flex flex-wrap items-center gap-4">
            <a href={primaryPhoneHref} dir="ltr" className="font-medium text-black hover:text-[#8B8680]">{profile.contact.phone}</a>
            <a href={primaryEmailHref} dir="ltr" className="text-[#8B8680] hover:text-black">{profile.contact.email}</a>
            <span dir="ltr" className="text-[#8B8680]">{profile.contact.whatsapp}</span>
            <span dir="ltr" className="text-[#8B8680]">{profile.contact.instagram}</span>
            <a href={mapsHref} className="text-[#8B8680] hover:text-black">{addressLines[0]} · خريطة</a>
          </div>
          <span className="text-[#8B8680]">{profile.contact.workingHours}</span>
        </div>
      </div>
    </section>
  );
}
