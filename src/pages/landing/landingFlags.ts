import type { Dress } from '../../features/dresses/dress.types';
import type { LandingDress } from './landingDress.repository';

/**
 * How recently a piece must have changed to count as "new", and how many
 * pieces are put in the spotlight.
 *
 * A window alone is not enough: in a catalogue that was refreshed in one go,
 * every piece is recent and the badge stops meaning anything. A count alone is
 * not enough either: a showroom that has not touched its catalogue in months
 * should not be told it has new arrivals. Both conditions apply.
 */
export const NEW_ARRIVAL_WINDOW_DAYS = 90;
export const NEW_ARRIVAL_LIMIT = 4;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * A piece is "new" when the catalogue record changed recently — which covers
 * both genuinely new stock and a piece that just came back from service or got
 * its photos published. It is derived from `updated_at`, never hand-flagged, so
 * the badge can never contradict the inventory.
 */
export function isNewArrival(
  dress: LandingDress,
  now: number = Date.now(),
  windowDays: number = NEW_ARRIVAL_WINDOW_DAYS,
): boolean {
  if (!dress.updatedAt) return false;
  const updated = Date.parse(dress.updatedAt);
  if (Number.isNaN(updated)) return false;
  return now - updated <= windowDays * DAY_MS;
}

/**
 * The pieces the storefront should put under "وصل حديثاً": the most recently
 * changed ones, but only while they are genuinely recent.
 */
export function getNewArrivals(
  dresses: readonly LandingDress[],
  limit: number = NEW_ARRIVAL_LIMIT,
  now: number = Date.now(),
): LandingDress[] {
  return dresses
    .filter((dress) => isNewArrival(dress, now))
    .sort((a, b) => Date.parse(b.updatedAt ?? '') - Date.parse(a.updatedAt ?? ''))
    .slice(0, limit);
}

/**
 * The only piece of its category currently on display — a real scarcity signal
 * for a visitor choosing between categories, with nothing invented behind it.
 */
export function isLastOfCategory(dress: Dress, dresses: readonly Dress[]): boolean {
  if (!dress.category) return false;
  return dresses.filter((item) => item.category === dress.category).length === 1;
}
