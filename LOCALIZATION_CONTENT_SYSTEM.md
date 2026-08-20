# Localization & Content System — LENA

> 2026-08-20 · Branch `arena/01a01f12-lenadress`. Governs language policy, terminology,
> formatting, content ownership, and the translation workflow for the whole product.
> Enforcement: `tests/localization-policy.test.mjs` + `tests/product-ux-copy.test.mjs`
> (both in the mandatory gate).

## 1. Supported-locale policy

- **Canonical and only UI locale: `ar-OM` (Arabic, Oman), RTL.** Single-locale by decision,
  not by omission: the operator base is one Omani showroom; adding a locale doubles copy
  maintenance for zero measured demand (`PRODUCT_DECISIONS.md` PD-2 family).
- **No i18n framework is introduced.** Hardcoded Arabic copy in components is the
  architecture; consistency is enforced by the glossary (§3) + source-contract tests, which
  is strictly cheaper than a key-extraction layer at one locale. Revisit ONLY if a second
  language is approved (owner decision — question is prepared in the roadmap).
- **LTR islands:** technical/brand values (barcodes, `{{tokens}}`, phone numbers, emails,
  WhatsApp links, sizes like `M/L/38`, codes like `RSV-000123`) render with `dir="ltr"`,
  never translated, never shaped by Arabic context.
- `index.html` (`lang="ar" dir="rtl"`), PWA manifest (`lang: 'ar'`, `dir: 'rtl'`), and
  per-route Arabic `document.title` («… | LENA») are pinned by test.

## 2. Voice

Arabic copy addresses the operator as a **singular female imperative** («أدخلي»، «اختاري»،
«احفظي»، «راجعي») — the counter operator is a woman (zal evidence: existing copy, roles named
«المديرة»/«الموظفة»). Errors state what happened and the next action, in one breath, without
technical terms. Forbidden in UI copy: English error fragments, stack traces, «خطأ 500»-style
codes, and جمع المذكر السالم forms («المستخدمون»).

## 3. Canonical glossary (binding)

| Canonical term | Use for | Banned variants |
| --- | --- | --- |
| **العميلات** | the customer base everywhere (nav, pages, reminders, exports) | العملاء، الزبائن، الزبونات |
| **الحجز / الحجوزات** | reservation entity | الوعد، الطلب (داخل النظام) |
| **التسليم والاسترجاع** | handover journeys | الإرجاع وحده لاسم الصفحة |
| **إقفال اليومية** | day-close ritual | الإغلاق اليومي، إغلاق الصندوق |
| **دفعة الحجز** | booking advance (ADR-0002) | عربون، دفعة أولى |
| **التأمين المسترد / التأمين المحتجز** | refundable deposit liability vs retained part | الضمان، الكفالة |
| **المتبقي من الإيجار** | outstanding rental balance | الباقي، المتبقي من المبلغ |
| **رسوم التأخير / رسوم التلف** | assessed fees | غرامة (بدون نوع) |
| **المخزون** | pieces on the full physical lifecycle (incl. independently-rented non-dresses) | القطع كاسم صفحة |
| **الملحقات** | accompanying pieces family (طرح، تيجان، أحزمة…) | الإكسسوارات كاسم صفحة (تبقى «فئة» داخلية) |
| **المتاح في فترة** | availability search | التوفر |
| **طابور الخدمة / الجرد الدوري / سجل التدقيق / قائمة الانتظار / التذكيرات** | these exact page names | synonyms anywhere in nav |
| **جهة / جهات الاتصال** | contact info on the public page | وسائل التواصل الاجتماعي |

New copy MUST pass this table; `product-ux-copy` proves «العميلات» already.

## 4. Formatting rules (measured, 2026-08-20)

- **Currency — canonical:** `formatMoneyOMR` (`src/shared/utils/format.ts`), 3 fraction
  digits (OMR is 3-decimal), yields «٤٥٫٠٠٠ ر.ع.» under ar-OM CLDR defaults. 32 call sites
  already conform. Legacy alias `formatOmaniRial` (`lib/utils.ts`, 1 usage) — **roadmap:
  re-point its single caller, then delete; no new usage.**
- **Digits:** ar-OM CLDR shapes Arabic-Indic digits (٤٥٫٠٠٠) in formatted output; the test
  accepts either shaping so an ICU upgrade cannot silently flip the contract. Input fields
  stay digits-agnostic (numeric keyboards on mobile; no forced shaping).
- **Dates/times:** device-local rendering in Asia/Muscat (shop devices), ISO storage; every
  `toLocale*`/`Intl.*` call site passes `'ar-OM'` literally — enforced whole-tree by test.
  Short-date preset: `formatDate` (`lib/utils.ts`). Date-time preset lives in
  `DeliveryReturnPage.formatDateTime` — **roadmap: promote it to shared and adopt at the
  remaining inline sites when those files are next touched** (not bundled today, AGENTS §14).
- **Time zone:** business-date semantics for closing are canonical (BUSINESS_MODEL §2.8);
  no server-TZ conversion in UI. Device clock is the shop clock; document any anomaly to support.
- **Pluralization:** no `Intl.PluralRules` dependency today. User-facing counts hand-phrase
  Arabic agreement («تبقّت محاولة/محاولات» pattern in the PIN gate). Rule: when a count is
  user-facing, prefer a phrasing correct for 0/1/2/≥3 — never raw `${n} قطعة` at sentence ends.
- **Names/addresses:** stored and rendered verbatim (user-generated); no transliteration,
  no case-folding for Arabic; Latin names keep their script via bidi algorithm defaults.
- **Numbers in sentences:** Arabic sentence + `dir="ltr"` island for codes/phones.

## 5. Mixed-direction (bidi) rules

- Inline LTR values MUST be isolated: `dir="ltr"` on the element (landing contact links are
  the exemplar — pinned by test).
- Template tokens: `<span dir="ltr">{{token}}</span>` — pinned by test.
- Barcodes/codes under Arabic labels: `dir="ltr"`. Phone numbers in `tel:`/`wa.me` hrefs keep
  digits+`+` only, display text isolated.

## 6. RTL layout policy

- **New code uses logical properties** (`ps/pe/ms/me/start/end`, `text-start/end`).
- Existing 30 physical-property classes (`pr-*`, `mr-*`, `lg:pr-72`…) were placed with
  RTL awareness and render correctly on 390/1440 (verified visually 2026-08-17, zero
  overflow). They are **frozen, not refactored**: a mass conversion is churn without user
  value today; if an LTR locale is ever approved, the migration of this register becomes
  part of that milestone — until then, touching them risks regressions for taste.

## 7. Content ownership (who may change what)

| Content class | Examples | Owner | Change path |
| --- | --- | --- | --- |
| **Interface copy** (dev-owned) | buttons, empty states, errors, nav labels | agent/dev | code + glossary check + gate |
| **Business-managed content** | public showroom profile (contacts, services, FAQ), message templates, print templates | المديرة | Preferences screens; no CMS needed — she edits rarely and directly in-app. **Decision: no CMS.** A CMS would add infrastructure for a monthly-at-most edit; the in-app editors with live preview already are the CMS for this scale. |
| **User-generated content** | customer names/notes, reservation notes, photos | operators | domain workflows; never "translated" or normalized |
| **Legal/risk wording** | cancellation/deposit advice in reminders | owner-approved text | Defaults ship conservative (no refund promises beyond typed policy); no machine translation ever authors these — PD-6 family |

## 8. Translation/copy workflow

1. Need identified (support note, owner request, new feature).
2. Draft in glossary voice; check banned variants table.
3. Ship behind the two content suites; if the term is new, add it to §3 in the same diff.
4. Owner review happens on the live preview (Arabic report); corrections are one-line edits.

## 9. QA matrix (what the gate proves)

| Check | Suite |
| --- | --- |
| Single formatting locale (ar-OM), zero ar-EG, zero arg-less `toLocale*` | `localization-policy` |
| bidi isolation on contacts + tokens | `localization-policy` |
| OMR 3-decimal currency behavior | `localization-policy` (behavioral) |
| html/manifest/title Arabic-first | `localization-policy` |
| Canonical term «العميلات», zero «العملاء» | `product-ux-copy` |
| RTL/no-overflow/touch targets | `ui-contract`, `mobile-polish` (+ rendered audit) |
| Route titles / document language | `localization-policy`, `runtime-env` |

## 10. Residue register (open, prioritized in PRODUCT_UX_ROADMAP)

- L-1: promote one shared `formatDateTime` preset; adopt at remaining inline sites (with file touches).
- L-2: re-point the single `formatOmaniRial` caller to `formatMoneyOMR`; delete the alias.
- L-3: plural phrasing sweep for count-bearing sentences (scheduled with their features).
- L-4 (owner-gated): second-locale question NEVER reopens without an owner yes/no.
