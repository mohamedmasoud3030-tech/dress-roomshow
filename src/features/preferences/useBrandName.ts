import { useEffect, useState } from 'react';
import { getShowroomProfile } from './showroomProfile.service';
import { landingShowroomProfile } from '../../pages/landing/landingContent';

/**
 * The showroom's name, from one place only.
 *
 * The owner edits it on the settings screen, so every surface that states the
 * brand — the browser tab, the app header, the login screen, message template
 * placeholders, printed contracts and invoices — reads it from here instead of
 * carrying its own copy. Renaming the showroom must never mean editing code.
 */
export const DEFAULT_BRAND_NAME = landingShowroomProfile.brandName;

/** Fired after the profile is saved so open screens can pick the name up. */
export const PROFILE_CHANGED_EVENT = 'lena:showroom-profile-changed';

export function getBrandName(): string {
  try {
    const name = getShowroomProfile().brandName?.trim();
    return name.length > 0 ? name : DEFAULT_BRAND_NAME;
  } catch {
    // A corrupt local profile must not take a screen down.
    return DEFAULT_BRAND_NAME;
  }
}

export function useBrandName(): string {
  const [brandName, setBrandName] = useState(getBrandName);

  useEffect(() => {
    const refresh = () => setBrandName(getBrandName());
    window.addEventListener(PROFILE_CHANGED_EVENT, refresh);
    window.addEventListener('storage', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      window.removeEventListener(PROFILE_CHANGED_EVENT, refresh);
      window.removeEventListener('storage', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, []);

  return brandName;
}
