import { getSupabaseConfig } from '../../config/env';
import { isSupabaseConfigured } from '../../lib/supabaseClient';
import { getShowroomProfile } from '../../features/preferences/showroomProfile.service';
import {
  landingShowroomProfile,
  type LandingShowroomProfile,
} from './landingContent';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function publicText(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

function publicStringArray(value: unknown, fallback: string[] | undefined): string[] | undefined {
  return Array.isArray(value) && value.every((item) => typeof item === 'string') ? value : fallback;
}

/** Retains only two approved text fields from a public content-card array. */
function publicPairArray<T>(value: unknown, firstKey: string, secondKey: string): T[] | null {
  if (!Array.isArray(value)) return null;
  return value
    .filter(isRecord)
    .map((item) => ({
      [firstKey]: publicText(item[firstKey], ''),
      [secondKey]: publicText(item[secondKey], ''),
    })) as T[];
}

/**
 * Defence in depth for the database allowlist: do not retain unknown keys from
 * a public response in the landing-page model, even if a stale deployment or
 * future migration accidentally returns them.
 */
export function mergePublicShowroomProfile(value: unknown): LandingShowroomProfile {
  if (!isRecord(value)) return { ...landingShowroomProfile };
  const contact = isRecord(value.contact) ? value.contact : {};
  return {
    brandName: publicText(value.brandName, landingShowroomProfile.brandName),
    shortTagline: publicText(value.shortTagline, landingShowroomProfile.shortTagline),
    heroTitle: publicText(value.heroTitle, landingShowroomProfile.heroTitle),
    heroDescription: publicText(value.heroDescription, landingShowroomProfile.heroDescription),
    aboutTitle: publicText(value.aboutTitle, landingShowroomProfile.aboutTitle),
    aboutDescription: publicText(value.aboutDescription, landingShowroomProfile.aboutDescription),
    categories: publicPairArray<LandingShowroomProfile['categories'][number]>(value.categories, 'name', 'description') ?? landingShowroomProfile.categories,
    services: publicPairArray<LandingShowroomProfile['services'][number]>(value.services, 'title', 'description') ?? landingShowroomProfile.services,
    steps: publicPairArray<LandingShowroomProfile['steps'][number]>(value.steps, 'title', 'description') ?? landingShowroomProfile.steps,
    faq: publicPairArray<LandingShowroomProfile['faq'][number]>(value.faq, 'question', 'answer') ?? landingShowroomProfile.faq,
    contact: {
      phone: publicText(contact.phone, landingShowroomProfile.contact.phone),
      alternatePhones: publicStringArray(contact.alternatePhones, landingShowroomProfile.contact.alternatePhones),
      whatsapp: publicText(contact.whatsapp, landingShowroomProfile.contact.whatsapp),
      email: publicText(contact.email, landingShowroomProfile.contact.email),
      alternateEmail: typeof contact.alternateEmail === 'string'
        ? contact.alternateEmail
        : landingShowroomProfile.contact.alternateEmail,
      instagram: publicText(contact.instagram, landingShowroomProfile.contact.instagram),
      address: publicText(contact.address, landingShowroomProfile.contact.address),
      addressLines: publicStringArray(contact.addressLines, landingShowroomProfile.contact.addressLines),
      mapQuery: typeof contact.mapQuery === 'string'
        ? contact.mapQuery
        : landingShowroomProfile.contact.mapQuery,
      workingHours: publicText(contact.workingHours, landingShowroomProfile.contact.workingHours),
    },
  };
}

export async function fetchPublicShowroomProfile({
  getConfig = getSupabaseConfig,
  fetcher = globalThis.fetch,
}: Partial<{ getConfig: typeof getSupabaseConfig; fetcher: typeof fetch }> = {}): Promise<LandingShowroomProfile> {
  const { url, publishableKey } = getConfig();
  const endpoint = new URL('/rest/v1/showroom_public_profile', url);
  endpoint.searchParams.set('select', 'profile');
  endpoint.searchParams.set('id', 'eq.main');
  endpoint.searchParams.set('limit', '1');
  const response = await fetcher(endpoint, {
    headers: { Accept: 'application/json', apikey: publishableKey, Authorization: `Bearer ${publishableKey}` },
  });
  if (!response.ok) throw new Error(`Public showroom profile request failed with status ${response.status}.`);
  const data: unknown = await response.json();
  if (!Array.isArray(data) || !isRecord(data[0]) || !('profile' in data[0])) {
    throw new Error('Public showroom profile response is invalid.');
  }
  return mergePublicShowroomProfile(data[0].profile);
}

export async function loadPublicShowroomProfile(): Promise<LandingShowroomProfile> {
  if (!isSupabaseConfigured()) return getShowroomProfile();
  return fetchPublicShowroomProfile();
}
