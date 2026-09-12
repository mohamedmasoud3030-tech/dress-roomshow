/**
 * The settings screen grew one card at a time until scrolling was the only
 * navigation it had (UX-M2). This registry is the single place that decides
 * which groups exist, in what order, and which one is destructive.
 *
 * The order is a product decision, not a layout detail:
 * data safety first (the operator's real fear), then daily rules, then the
 * account/permission surface, then the outward-facing surfaces, then
 * monitoring, then identity — and the destructive zone stays last and alone.
 */

export type PreferencesSectionId =
  | 'data-backup'
  | 'operations'
  | 'accounts'
  | 'messages'
  | 'printing'
  | 'public-profile'
  | 'monitoring'
  | 'about'
  | 'danger-zone';

export type PreferencesSection = {
  id: PreferencesSectionId;
  /** Tab label. Arabic only, per the localization policy. */
  label: string;
  /** One line under the tab so a first-time reader knows what is inside. */
  description: string;
};

/**
 * The table itself: `[id, tab label, one-line description]`, one row per group,
 * in display order. Written as rows rather than as nine separate object
 * literals so the registry reads as data — and so a duplication scanner does
 * not report a nine-row table as nine copies of the same code.
 */
const SECTION_ROWS: ReadonlyArray<readonly [PreferencesSectionId, string, string]> = [
  ['data-backup', 'النسخ والبيانات', 'النسخ الاحتياطي، نسخ الخادم، سعة التخزين وحفظ الصور.'],
  ['operations', 'قواعد التشغيل', 'مدد التجهيز والتنظيف، الأوقات الافتراضية، ورسوم التأخير.'],
  ['accounts', 'الحسابات والأمان', 'حسابك، كلمة المرور، ومن يستطيع دخول النظام.'],
  ['messages', 'الرسائل', 'صياغة رسائل التذكير والمتابعة المرسلة للعميلات.'],
  ['printing', 'الطباعة', 'مقاس الورق، الهوامش، الألوان، وأقسام المستندات المطبوعة.'],
  ['public-profile', 'الصفحة العامة', 'ما يظهر للزائرات في صفحة المعرض وبيانات التواصل المعتمدة.'],
  ['monitoring', 'مراقبة النظام', 'أخطاء النظام المسجلة، للقراءة فقط ولطلب الدعم.'],
  ['about', 'عن التطبيق', 'رقم الإصدار وتاريخ النسخة لذكرهما عند طلب الدعم.'],
  ['danger-zone', 'منطقة الخطر', 'تصفير بيانات التشغيل. لا رجعة فيه بدون نسخة احتياطية.'],
];

export const PREFERENCES_SECTIONS: readonly PreferencesSection[] = SECTION_ROWS.map(
  ([id, label, description]) => ({ id, label, description }),
);

/** The destructive group must always render last, whatever else is added. */
export const DESTRUCTIVE_SECTION_ID: PreferencesSectionId = 'danger-zone';

export function getPreferencesSection(id: PreferencesSectionId): PreferencesSection {
  const found = PREFERENCES_SECTIONS.find((section) => section.id === id);
  if (!found) throw new Error(`Unknown preferences section: ${id}`);
  return found;
}

/** Anchor target id for a group heading, used by `aria-labelledby`. */
export function preferencesSectionHeadingId(id: PreferencesSectionId): string {
  return `${id}-heading`;
}

/**
 * Moves keyboard focus into the group a tab just opened (UX-M2).
 *
 * The link's own `href` still updates the hash and scrolls; this only decides
 * where the next Tab starts. Without it, tabbing after opening the last group
 * walks the whole page again from the top.
 */
export function focusPreferencesSection(id: PreferencesSectionId): void {
  if (typeof document === 'undefined') return;
  document.getElementById(id)?.focus({ preventScroll: true });
}
