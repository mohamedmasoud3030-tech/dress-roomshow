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

export function mergePublicShowroomProfile(value: unknown): LandingShowroomProfile {
  if (!isRecord(value)) return { ...landingShowroomProfile };
  const contact = isRecord(value.contact) ? value.contact : {};
  return {
    ...landingShowroomProfile,
    ...value,
    contact: { ...landingShowroomProfile.contact, ...contact },
    categories: Array.isArray(value.categories) ? value.categories as LandingShowroomProfile['categories'] : landingShowroomProfile.categories,
    services: Array.isArray(value.services) ? value.services as LandingShowroomProfile['services'] : landingShowroomProfile.services,
    steps: Array.isArray(value.steps) ? value.steps as LandingShowroomProfile['steps'] : landingShowroomProfile.steps,
    faq: Array.isArray(value.faq) ? value.faq as LandingShowroomProfile['faq'] : landingShowroomProfile.faq,
  } as LandingShowroomProfile;
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
