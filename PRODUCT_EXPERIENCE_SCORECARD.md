# Product Experience Scorecard — LENA

> 2026-08-20 · Branch `arena/01a01f12-lenadress`.
> Baseline for comparison: rendered audit scorecard 2026-08-17 (`docs/archive/PRODUCT_EXPERIENCE_AUDIT.md` §4).
> Scores here are **evidence-indexed**: each row cites the artifact that proves it in this repo.
> Rows marked ◔ still owe a real-device/browser confirmation (M10); none is claimed beyond evidence.

## Scoreboard (out of 10)

| المجال | 17 أغسطس | **اليوم** | الدليل الحاكم |
| --- | ---: | ---: | --- |
| وضوح القيمة | 8 | **9** | Landing copy + hero CTA + bounded fetch; `landing-inventory` suite 14/14 |
| الانطباع الأول | 8 | **9** | PX-01 closed — no unapproved fallback contacts (DEF-024..031); preview smoke 200s |
| التنقل | 6 | **8** | 5 day-shaped groups vs 20 flat links (`navigation.ts`); bottom bar = 4 counter actions |
| سهولة التعلم | 6 | **7** | Empty-dashboard onboarding + in-wizard prerequisite creation (PX-02 closed); ◔ checklist pending |
| إتمام المهمة الأساسية | 6 | **8** | Reservation wizard + inline customer/dress creation; suites `workflows`, `sales-close` green |
| الجودة البصرية | 8 | **8** | Unchanged design system; no regression permitted by `ui-contract`/`mobile-polish` suites |
| الاتساق | 7 | **9** | «العميلات» unified everywhere incl. dashboard/reminders/nav-group (this pass); shared primitives |
| استخدام الهاتف | 7 | **8** | Sticky WhatsApp CTA + safe areas; ◔ landing length on 390px (UX-M4) |
| العربية وRTL | 8 | **9** | `dir="ltr"` token chips; click-to-insert; localization system doc this session (Stage 2) |
| الوصول | 6 | **8** | Login `main` landmark; skip-link; permission denial `role="alert"`; contrast fixes; ◔ axe re-run |
| الثقة | 6 | **9** | PIN throttle (M11), errors card (M7), server copies (M1), gauge (M2), reset flow, denial card |
| اكتمال المنتج | 6 | **8** | MFA/retention are owner-console (M4–M6) not product gaps; support surface pending (UX-M3) |

**التقييم العام الآن: 8.4/10 كنظام تشغيل للمعرض، و7.5/10 كمنتج يعمل لمستخدمة جديدة بلا تدريب.**
(كان 7 و6 في 17 أغسطس — أغلقت DEF-024..031 وجولتا هذه الجلسة أربعًا من أكبر ست فجوات.)

## Launch blockers (what stops real-customer exposure)

| # | المانع | الحالة | الجهة |
| --- | --- | --- | --- |
| B1 | Real-device evidence (camera scan, printing, PWA install, 390/360 css) | **مفتوح** | جلسة M10 — أجهزة المعرض |
| B2 | Live Supabase drill (restore from server copy, login throttling evidence) | **مفتوح** | M10 + M4/M6 بموافقة المالكة |
| B3 | Public profile governance (owner publishes approved contacts) | مغلق تقنيًا | تبقى خطوة مالكة: تعبئة الملف المعتمد في الإعدادات |
| B4 | Account recovery path | مغلق (نسيت كلمة المرور + شرح التفعيل) | — |

**لا مانع انطلاق برمجي متبقٍ داخل الكود.** كل الموانع المتبقية خارج الكود (أجهزة/حساب/موافقة) —
وهذا مطابق لما تسمح به قواعد الإصدار في المستودع (لا `5.06` قبل RUNTIME_QA).

## Severity-graded open UX items (post-fix)

| ID | الشدة | العنصر | الحالة |
| --- | --- | --- | --- |
| UX-M1 | متوسط | Setup checklist على dashboard فارغ | Roadmap |
| UX-M2 | متوسط | تقسيم صفحة الإعدادات إلى مجموعات/tabs | **شُحن 2026-09-12** — `tests/preferences-sections.test.mjs` (5) |
| UX-M3 | متوسط | سطح «عن التطبيق والدعم» داخل النظام | Roadmap |
| UX-M4 | متوسط | اختصار landing على الهاتف (FAQ collapse) | **شُحن 2026-09-12** — `tests/landing-mobile-length.test.mjs` (6)؛ الالتقاط على جهاز حقيقي يبقى 4.02 ◔ |
| UX-S2 | منخفض | «محفوظ على الخادم ✓» بعد العمليات المالية | **شُحن 2026-09-12** — `tests/cloud-save-ack.test.mjs` (7) |
| UX-L3 | منخفض | Undo/recover للأرشفة أكثر وضوحًا | Roadmap |
| ~~PX-*~~ | — | كل عيوب 17 أغسطس الأربعة High + الخمسة quick wins | **مغلقة ومثبتة في الكود** |

> صفوف UX-M1/UX-M3 ما زالت تقول «Roadmap» وهي مشحونة منذ 2026-08-20 (تأريخ قديم لم يُحدَّث)؛ لم تُعدَّل هنا لأن هذه الجلسة لم تتحقق منهما.

## Evidence register (what proves the numbers)

- Suites: `ui-contract`, `mobile-polish`, `landing-inventory` (14), `workflows`, `sales-close`,
  `pwa`, `device-pin` (9), `system-errors-summary` (3), `product-ux-copy` (this pass) — 737 total green.
- Source: `navigation.ts`, `RequireAdmin.tsx`, `CreateReservationModal.tsx`, `LoginPage.tsx`,
  `MessageTemplatesEditor.tsx`, `DashboardPage.tsx`, `AppShell.tsx`, preview HTTP smoke (200s,
  `lang="ar" dir="rtl"`).
- Rendered (17 Aug, Chromium 1440/390): zero horizontal overflow; bottom-bar rhythm; wizard steps.
- NOT re-verified visually today (no browser in sandbox) → every ◔ row above lands in M10.
