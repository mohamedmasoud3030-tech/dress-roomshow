import { buildWhatsAppLink, MessagingError } from '../../platform/messaging/whatsapp';
import type { LandingProfile } from './components/types';

type LandingBookingItem = {
  code: string;
  name: string;
  size?: string;
  color?: string;
};

/**
 * Every "book an appointment" / "quick inquiry" action on the public landing
 * page used to link to `/appointments`, a route gated behind staff login
 * (`RequireAuth`). A visiting customer has no account, so every one of those
 * buttons silently redirected her to `/login` — the page's entire call to
 * action was broken.
 *
 * The landing page is a public storefront, not a back-office screen. There is
 * no customer-facing booking backend to build here without a much larger
 * project, so the correct fix is the same hand-off the rest of the app
 * already uses for customer contact: a prepared WhatsApp message the
 * showroom owner receives and replies to directly.
 */
/**
 * Returns `null` when the showroom has not published a usable WhatsApp number.
 *
 * The public storefront is the one screen a visitor sees before any staff
 * member has signed in, and it renders before the owner has necessarily
 * filled in her contact details. Building the link unconditionally meant a
 * profile with an empty number threw during render and took the entire
 * storefront down — so the call to action must be optional, not fatal.
 */
export function buildLandingWhatsAppLink(profile: LandingProfile, message: string): string | undefined {
  try {
    return buildWhatsAppLink(profile.contact.whatsapp, message);
  } catch (error) {
    if (error instanceof MessagingError) return undefined;
    throw error;
  }
}

export function buildAppointmentInquiryMessage(item?: LandingBookingItem, eventDate?: string): string {
  const dateLine = eventDate ? ` تاريخ المناسبة المطلوب: ${eventDate}.` : '';
  if (item) {
    const details = [
      `الكود: ${item.code}`,
      item.size ? `المقاس: ${item.size}` : null,
      item.color ? `اللون: ${item.color}` : null,
    ].filter(Boolean).join('، ');
    return `مرحباً، أرغب في طلب موعد لتجربة "${item.name}" (${details}).${dateLine} أرجو تأكيد الموعد وتوفر القطعة لتاريخ المناسبة.`;
  }
  return `مرحباً، أرغب في طلب موعد لزيارة المعرض وتجربة إحدى القطع المعروضة.${dateLine} أرجو تأكيد الوقت المناسب.`;
}

/**
 * One message carrying the whole shortlist, so a visitor who shortlisted five
 * pieces does not have to send five separate enquiries — and the showroom
 * receives a single, readable request it can answer in one reply.
 */
export function buildShortlistMessage(items: LandingBookingItem[], eventDate?: string): string {
  if (items.length === 0) {
    return 'مرحباً، عندي استفسار عن المعروض الحالي في المعرض.';
  }
  const lines = items
    .map((item, index) => {
      const details = [item.size ? `المقاس ${item.size}` : null, item.color ? item.color : null]
        .filter(Boolean)
        .join('، ');
      return `${index + 1}) ${item.name} — ${item.code}${details ? ` (${details})` : ''}`;
    })
    .join('\n');
  const dateLine = eventDate ? `\nتاريخ المناسبة المطلوب: ${eventDate}` : '';
  return `مرحباً، أود الاستفسار عن توفر هذه القطع لتاريخ مناسبتي:\n${lines}${dateLine}\n\nأرجو تأكيد التوفر والموعد المناسب للتجربة.`;
}

export function buildQuickInquiryMessage(item?: LandingBookingItem): string {
  if (item) {
    return `مرحباً، عندي استفسار عن "${item.name}" (الكود: ${item.code}) المعروض لديكم.`;
  }
  return 'مرحباً، عندي استفسار عن المعروض الحالي في المعرض.';
}
