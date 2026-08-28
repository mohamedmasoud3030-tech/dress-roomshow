/**
 * Shared UI design system constants.
 * 
 * ONE canonical design system for all visual primitives.
 * Use these instead of inline Tailwind classes for consistency.
 * 
 * Color palette:
 * - Primary: Amber (accent, actions)
 * - Neutral: Slate (text, borders)
 * - Tones: Emerald (success), Amber (warning), Rose (danger), Sky (info), Cyan (neutral info)
 */

// =============================================================================
// CARD PRIMITIVES
// =============================================================================

/** Standard card with subtle border - use for content sections */
export const CARD_CLASS_NAME = 'rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5';

/** Card with no border - use for inset/nested content */
export const CARD_FLAT_CLASS_NAME = 'rounded-2xl bg-white p-4 shadow-sm sm:p-5';

/** Compact card variant for dense layouts */
export const CARD_COMPACT_CLASS_NAME = 'rounded-2xl border border-slate-200 bg-white p-3 shadow-sm';

/** Highlighted card variant - use for selected/active state */
export const CARD_HIGHLIGHT_CLASS_NAME = 'rounded-2xl border border-amber-400 bg-white p-4 shadow-sm ring-2 ring-amber-300 sm:p-5';

// =============================================================================
// BUTTON PRIMITIVES
// =============================================================================

/** Primary action button - filled dark */
export const PRIMARY_BUTTON_CLASS_NAME =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2';

/** Secondary button - outlined */
export const SECONDARY_BUTTON_CLASS_NAME =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2';

/** Ghost button - minimal, for tertiary actions */
export const GHOST_BUTTON_CLASS_NAME =
  'inline-flex min-h-10 items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-slate-500 transition hover:bg-stone-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2';

/** Danger button - destructive actions */
export const DANGER_BUTTON_CLASS_NAME =
  'inline-flex min-h-10 items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-slate-500 transition hover:bg-rose-50 hover:text-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2';

/** Small primary button variant */
export const SMALL_PRIMARY_BUTTON_CLASS_NAME =
  'inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-slate-950 px-3 text-xs font-bold text-white transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2';

/** Small secondary button variant */
export const SMALL_SECONDARY_BUTTON_CLASS_NAME =
  'inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-xs font-bold text-slate-700 transition hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2';

/** Compact primary button - for toolbars */
export const COMPACT_PRIMARY_BUTTON_CLASS_NAME =
  'inline-flex min-h-11 items-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2';

/** Compact secondary button - for toolbars */
export const COMPACT_SECONDARY_BUTTON_CLASS_NAME =
  'inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2';

/** Icon-only button for toolbars */
export const ICON_BUTTON_CLASS_NAME =
  'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-stone-100 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2';

// =============================================================================
// INPUT PRIMITIVES
// =============================================================================

/** Standard search/filter input field */
export const SEARCH_INPUT_CLASS_NAME =
  'h-12 w-full rounded-xl border border-slate-200 bg-stone-50 pr-11 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus-visible:border-amber-500 focus-visible:ring-2 focus-visible:ring-amber-500/30';

/** Standard select field for filters */
export const SELECT_INPUT_CLASS_NAME =
  'h-12 w-full rounded-xl border border-slate-200 bg-stone-50 px-3 text-sm text-slate-950 outline-none transition focus-visible:border-amber-500 focus-visible:ring-2 focus-visible:ring-amber-500/30';

// =============================================================================
// ALERT/INFO BOX PRIMITIVES
// =============================================================================

/** Alert box base styles */
export const ALERT_BASE_CLASS_NAME = 'rounded-xl px-4 py-3 text-sm font-bold';

/** Success/positive alert */
export const ALERT_SUCCESS_CLASS_NAME = 'border border-emerald-200 bg-emerald-50 text-emerald-800';

/** Warning alert */
export const ALERT_WARNING_CLASS_NAME = 'border border-amber-200 bg-amber-50 text-amber-900';

/** Danger/error alert */
export const ALERT_DANGER_CLASS_NAME = 'border border-rose-200 bg-rose-50 text-rose-800';

/** Info alert */
export const ALERT_INFO_CLASS_NAME = 'border border-sky-200 bg-sky-50 text-sky-800';

/** Neutral info alert */
export const ALERT_NEUTRAL_CLASS_NAME = 'border border-slate-200 bg-slate-50 text-slate-700';

/** Alert styles record for dynamic usage */
export const ALERT_STYLES = {
  success: ALERT_SUCCESS_CLASS_NAME,
  warning: ALERT_WARNING_CLASS_NAME,
  danger: ALERT_DANGER_CLASS_NAME,
  info: ALERT_INFO_CLASS_NAME,
  neutral: ALERT_NEUTRAL_CLASS_NAME,
} as const;

// =============================================================================
// BADGE/PRIORITY INDICATORS
// =============================================================================

/** Standard badge - pill shape with ring */
export const BADGE_CLASS_NAME = 'rounded-full px-2.5 py-0.5 text-[11px] font-bold ring-1';

/** Large badge variant */
export const BADGE_LARGE_CLASS_NAME = 'rounded-full px-3 py-1 text-xs font-bold ring-1';

/** Status badge map - use with STATUS_STYLES records */
export type BadgeTone = 'default' | 'success' | 'warning' | 'danger' | 'info';

/** Status badge tone configurations */
export const BADGE_TONES: Record<BadgeTone, string> = {
  default: 'bg-stone-100 text-slate-700 ring-slate-200',
  success: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  warning: 'bg-amber-50 text-amber-800 ring-amber-200',
  danger: 'bg-rose-50 text-rose-800 ring-rose-200',
  info: 'bg-sky-50 text-sky-800 ring-sky-200',
};

// =============================================================================
// CONTAINER PRIMITIVES
// =============================================================================

/** Filter bar container */
export const FILTER_BAR_CLASS_NAME = 'rounded-2xl border border-slate-200 bg-white p-4 shadow-sm';

/** Grid layout for summary cards */
export const SUMMARY_GRID_CLASS_NAME = 'grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4';

/** Two-column grid for cards */
export const CARD_GRID_CLASS_NAME = 'grid gap-4 xl:grid-cols-2';

/** Three-column grid for cards */
export const CARD_GRID_THREE_CLASS_NAME = 'grid gap-4 sm:grid-cols-2 2xl:grid-cols-3';

// =============================================================================
// LIST ITEM PRIMITIVES
// =============================================================================

/** Standard list row item */
export const LIST_ROW_CLASS_NAME =
  'flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 transition hover:bg-stone-50';

/** List row with highlight state */
export const LIST_ROW_HIGHLIGHT_CLASS_NAME =
  'flex items-center gap-3 rounded-xl border border-amber-400 bg-white p-3 ring-2 ring-amber-300 transition hover:bg-stone-50';

/** Compact list item */
export const LIST_ITEM_CLASS_NAME = 'flex items-center gap-2 rounded-xl bg-stone-50 p-3';

// =============================================================================
// TYPOGRAPHY PRIMITIVES
// =============================================================================

/** Section heading with accent bar */
export const SECTION_HEADING_CLASS_NAME = 'flex items-center gap-2 text-base font-bold text-slate-950 sm:text-lg';

/** Section accent bar (use with SECTION_HEADING_CLASS_NAME) */
export const SECTION_ACCENT_CLASS_NAME = 'h-4 w-1 rounded-full bg-amber-500';

/** Label text */
export const LABEL_CLASS_NAME = 'text-xs font-bold text-slate-400';

/** Value text (bold) */
export const VALUE_CLASS_NAME = 'mt-1 text-lg font-extrabold text-slate-950';

/** Secondary value text */
export const VALUE_SECONDARY_CLASS_NAME = 'mt-1 text-sm font-semibold text-slate-800';

// =============================================================================
// MISC PRIMITIVES
// =============================================================================

/** Divider/separator */
export const DIVIDER_CLASS_NAME = 'border-t border-slate-100';

/** Focus ring for interactive elements */
export const FOCUS_RING_CLASS_NAME = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2';

/** Info text (secondary) */
export const INFO_TEXT_CLASS_NAME = 'text-xs text-slate-500';

/** Hint text */
export const HINT_TEXT_CLASS_NAME = 'mt-1 text-xs text-slate-500';
