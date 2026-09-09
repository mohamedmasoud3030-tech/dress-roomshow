import { readCollection, writeCollection } from '../../services/localDatabase';
import type { LandingShowroomProfile, LandingCategory, LandingService, LandingFaqItem, LandingStep, LandingContact } from '../../pages/landing/landingContent';
import { landingShowroomProfile, migrateLegacyShowroomContact } from '../../pages/landing/landingContent';

const COLLECTION = 'showroom-profile';

/**
 * Tell every open screen that the showroom identity changed. Imported lazily
 * through `window` so this service keeps working in Node tests.
 */
function announceProfileChange(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event('lena:showroom-profile-changed'));
}

export type { LandingShowroomProfile, LandingCategory, LandingService, LandingFaqItem, LandingStep, LandingContact };

export function getShowroomProfile(): LandingShowroomProfile {
  const stored = readCollection<Partial<LandingShowroomProfile>>(COLLECTION, []);
  if (stored.length === 0) return { ...landingShowroomProfile };
  return migrateLegacyShowroomContact({ ...landingShowroomProfile, ...stored[0] });
}

export function saveShowroomProfile(profile: LandingShowroomProfile): LandingShowroomProfile {
  writeCollection(COLLECTION, [profile]);
  announceProfileChange();
  return profile;
}

export function resetShowroomProfile(): LandingShowroomProfile {
  writeCollection(COLLECTION, []);
  announceProfileChange();
  return { ...landingShowroomProfile };
}
