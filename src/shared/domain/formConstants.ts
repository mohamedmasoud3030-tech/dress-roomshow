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

/** Rose focus ring - danger actions focus state */
export const ROSE_FOCUS_RING_CLASS_NAME =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2';

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

/** Required field asterisk indicator */
export const REQUIRED_ASTERISK_CLASS_NAME = 'mr-1 text-rose-600';

/** Form error message */
export const FORM_ERROR_CLASS_NAME = 'mt-1 text-xs font-medium text-rose-700';

/** Form hint message */
export const FORM_HINT_CLASS_NAME = 'mt-1 text-xs text-slate-500';

// =============================================================================
// FORM ACTIONS
// =============================================================================

/** Form action bar */
export const FORM_ACTIONS_CLASS_NAME = 'flex flex-col-reverse gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end';

/** Cancel button in form */
export const FORM_CANCEL_BUTTON_CLASS_NAME =
  'min-h-11 rounded-xl border border-slate-300 px-5 py-2 text-sm font-bold text-slate-700 transition hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2';

/** Submit button in form */
export const FORM_SUBMIT_BUTTON_CLASS_NAME =
  'min-h-11 rounded-xl bg-slate-950 px-5 py-2 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2';

// =============================================================================
// HELPER FUNCTION
// =============================================================================

/**
 * Get the appropriate form field class based on validity state.
 * @param invalid - Whether the field has an error
 * @param useLightBackground - Use lighter background variant
 * @returns The appropriate class string
 */
export function getFormFieldClassName(invalid = false, useLightBackground = false): string {
  if (invalid) return FORM_FIELD_INVALID_CLASS_NAME;
  return useLightBackground ? FORM_FIELD_LIGHT_CLASS_NAME : FORM_FIELD_CLASS_NAME;
}
