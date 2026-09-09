/**
 * Shared form design system constants.
 * 
 * ONE canonical design system for all form primitives.
 * Use these instead of inline Tailwind classes for consistency.
 */

// =============================================================================
// FOCUS & INTERACTION
// =============================================================================

/** Amber focus ring - standard interactive element focus state */
export const AMBER_FOCUS_RING_CLASS_NAME =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2';

// =============================================================================
// FORM FIELD PRIMITIVES
// =============================================================================

/** Standard form input control base styles */
export const FORM_FIELD_CLASS_NAME =
  'min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 transition placeholder:text-slate-400 focus-visible:border-amber-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/30';

/** Form field with stone/light background (for nested forms) */
export const FORM_FIELD_LIGHT_CLASS_NAME =
  'min-h-11 w-full rounded-xl border border-slate-200 bg-stone-50 px-3 py-2 text-sm text-slate-950 transition placeholder:text-slate-400 focus-visible:border-amber-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/30';

/** Stacked form field (with top margin) */
export const STACKED_FORM_FIELD_CLASS_NAME = `mt-1 ${FORM_FIELD_CLASS_NAME}`;

/** Form field in invalid/error state */
export const FORM_FIELD_INVALID_CLASS_NAME =
  'min-h-11 w-full rounded-xl border border-rose-400 bg-rose-50/60 px-3 py-2 text-sm text-slate-950 transition placeholder:text-slate-400 focus-visible:border-rose-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/30';

// =============================================================================
// FORM LABELS
// =============================================================================

/** Form field label */
export const FORM_LABEL_CLASS_NAME = 'mb-1.5 block text-sm font-bold text-slate-700';

/** Stacked form label (no bottom margin) */
export const STACKED_FORM_LABEL_CLASS_NAME = 'block text-sm font-bold text-slate-700';

/** Form error message */
export const FORM_ERROR_CLASS_NAME = 'mt-1 text-xs font-medium text-rose-700';
