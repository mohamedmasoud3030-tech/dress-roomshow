import { readCollection, writeCollection } from '../../services/localDatabase';
import type { LandingShowroomProfile, LandingCategory, LandingService, LandingFaqItem, LandingStep, LandingContact } from '../../pages/landing/landingContent';
import { landingShowroomProfile } from '../../pages/landing/landingContent';

const COLLECTION = 'showroom-profile';

export type { LandingShowroomProfile, LandingCategory, LandingService, LandingFaqItem, LandingStep, LandingContact };

export function getShowroomProfile(): LandingShowroomProfile {
  const stored = readCollection<Partial<LandingShowroomProfile>>(COLLECTION, []);
  if (stored.length === 0) return { ...landingShowroomProfile };
  return { ...landingShowroomProfile, ...stored[0] };
}

export function saveShowroomProfile(profile: LandingShowroomProfile): LandingShowroomProfile {
  writeCollection(COLLECTION, [profile]);
  return profile;
}

export function resetShowroomProfile(): LandingShowroomProfile {
  writeCollection(COLLECTION, []);
  return { ...landingShowroomProfile };
}
