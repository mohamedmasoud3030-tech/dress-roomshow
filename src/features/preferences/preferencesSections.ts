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

export const PREFERENCES_SECTIONS: readonly PreferencesSection[] = [
  {
    id: 'data-backup',
    label: 'النسخ والبيانات',
    description: 'النسخ الاحتياطي، نسخ الخادم، سعة التخزين وحفظ الصور.',
  },
  {
    id: 'operations',
    label: 'قواعد التشغيل',
    description: 'مدد التجهيز والتنظيف، الأوقات الافتراضية، ورسوم التأخير.',
  },
  {
    id: 'accounts',
    label: 'الحسابات والأمان',
    description: 'حسابك، كلمة المرور، ومن يستطيع دخول النظام.',
  },
  {
    id: 'messages',
    label: 'الرسائل',
    description: 'صياغة رسائل التذكير والمتابعة المرسلة للعميلات.',
  },
  {
    id: 'printing',
    label: 'الطباعة',
    description: 'مقاس الورق، الهوامش، الألوان، وأقسام المستندات المطبوعة.',
  },
  {
    id: 'public-profile',
    label: 'الصفحة العامة',
    description: 'ما يظهر للزائرات في صفحة المعرض وبيانات التواصل المعتمدة.',
  },
  {
    id: 'monitoring',
    label: 'مراقبة النظام',
    description: 'أخطاء النظام المسجلة، للقراءة فقط ولطلب الدعم.',
  },
  {
    id: 'about',
    label: 'عن التطبيق',
    description: 'رقم الإصدار وتاريخ النسخة لذكرهما عند طلب الدعم.',
  },
  {
    id: 'danger-zone',
    label: 'منطقة الخطر',
    description: 'تصفير بيانات التشغيل. لا رجعة فيه بدون نسخة احتياطية.',
  },
];

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
