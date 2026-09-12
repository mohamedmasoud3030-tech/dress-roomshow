import type { ReactNode } from 'react';
import {
  DESTRUCTIVE_SECTION_ID,
  getPreferencesSection,
  preferencesSectionHeadingId,
  type PreferencesSectionId,
} from './preferencesSections';

/**
 * One anchored, focusable group of settings cards (UX-M2).
 *
 * `tabIndex={-1}` is what lets a tab press land the keyboard on the group it
 * opened instead of leaving focus on the link at the top of the page. The
 * element is never tab-reachable itself — it is only a focus target — and
 * `outline-none` keeps that programmatic focus from drawing a ring.
 */
export function PreferencesSectionGroup({ id, children }: { id: PreferencesSectionId; children: ReactNode }) {
  const section = getPreferencesSection(id);
  const isDestructive = id === DESTRUCTIVE_SECTION_ID;
  return (
    <section
      id={id}
      tabIndex={-1}
      aria-labelledby={preferencesSectionHeadingId(id)}
      className="scroll-mt-28 space-y-4 outline-none"
    >
      <div>
        <h2
          id={preferencesSectionHeadingId(id)}
          className={isDestructive ? 'text-base font-black text-rose-900' : 'text-base font-black text-slate-900'}
        >
          {section.label}
        </h2>
        <p className={`mt-1 text-sm ${isDestructive ? 'text-rose-800' : 'text-slate-500'}`}>{section.description}</p>
      </div>
      {children}
    </section>
  );
}
