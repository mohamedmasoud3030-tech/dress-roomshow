import type { Dress } from '../../../features/dresses/dress.types';
import type { landingShowroomProfile } from '../landingContent';

export type LandingUsageFilter = 'all' | 'rent' | 'sale';
export type InventoryCategoryFilter = 'all' | Dress['category'];
export type LandingProfile = typeof landingShowroomProfile;
