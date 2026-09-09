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

// =============================================================================
// BUTTON PRIMITIVES
// =============================================================================

/** Primary action button - filled dark */
export const PRIMARY_BUTTON_CLASS_NAME =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2';

/** Secondary button - outlined */
export const SECONDARY_BUTTON_CLASS_NAME =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2';

/** Compact primary button - for toolbars */
export const COMPACT_PRIMARY_BUTTON_CLASS_NAME =
  'inline-flex min-h-11 items-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2';

/** Compact secondary button - for toolbars */
export const COMPACT_SECONDARY_BUTTON_CLASS_NAME =
  'inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2';

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

/** Status badge map - use with STATUS_STYLES records */
export type BadgeTone = 'default' | 'success' | 'warning' | 'danger' | 'info';

// =============================================================================
// CONTAINER PRIMITIVES
// =============================================================================

/** Grid layout for summary cards */
export const SUMMARY_GRID_CLASS_NAME = 'grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4';

/** Two-column grid for cards */
export const CARD_GRID_CLASS_NAME = 'grid gap-4 xl:grid-cols-2';

// =============================================================================
// TYPOGRAPHY PRIMITIVES
// =============================================================================

/** Section heading with accent bar */
export const SECTION_HEADING_CLASS_NAME = 'flex items-center gap-2 text-base font-bold text-slate-950 sm:text-lg';
