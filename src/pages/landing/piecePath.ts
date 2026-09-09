/**
 * The public storefront address for a single catalogue piece.
 *
 * One canonical builder so cards, the quick view and the page itself can
 * never disagree about where a piece lives (`/piece/:code`, public like the
 * rest of the storefront — a visitor has no account to gate it behind).
 */
export function piecePath(code: string): string {
  return `/piece/${encodeURIComponent(code.trim())}`;
}
