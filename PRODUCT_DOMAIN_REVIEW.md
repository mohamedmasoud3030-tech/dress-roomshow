# Product Domain Review — LENA

> 2026-08-20 · Branch `arena/01a01f12-lenadress` · Companion to `PRODUCT_EXPERIENCE_SCORECARD.md`,
> `PRODUCT_DECISIONS.md`, `PRODUCT_UX_ROADMAP.md`.
> Method: prior rendered audit (`docs/archive/PRODUCT_EXPERIENCE_AUDIT.md`, 2026-08-17, real Chromium) treated as
> leads; every claim re-verified in this session against current code and the live preview build.
> Domain expectations cross-checked against industry sources (citations inline).
> Sandbox honesty note: no interactive browser is available here; fixes were verified by HTTP smoke,
> source-contract and behavioral tests. Visual confirmation on real devices stays in the M10 session.

## 1. What the product is

LENA is an **operations system for one occasion-wear showroom** (dresses + accompanying
accessories, rental AND sale), wrapping a public read-only catalogue (`/landing`) around an
internal multi-role console: inventory lifecycle, customers, reservations, appointments,
delivery/return inspection, payments ledger, expenses, daily closing, reports, audit,
waitlist, reminders, stocktake, service queue.

The central domain job (from `docs/BUSINESS_MODEL.md`, the source of truth) is keeping five
views consistent at all times: physical truth, commercial truth, financial truth,
operational truth, control truth.

### Domain alignment verdict

The canonical model **matches how this industry actually operates** — verified against
current practice: per-item availability calendars with buffer days blocked between bookings
(cleaning/condition turnaround) [2](https://www.lowcode.agency/blog/how-to-build-a-fashion-rental-marketplace), [4](https://www.lowcode.agency/blog/how-to-build-a-dress-rental-marketplace);
returns that do NOT become rentable until inspection/cleaning decisions are recorded
("returned → inspected → cleaned → available") [5](https://www.guideflow.com/blog/costume-rental-software);
deposit hold → release-or-retain-on-damage as a first-class flow, kept separate from rental
revenue [2](https://www.lowcode.agency/blog/how-to-build-a-fashion-rental-marketplace), [4](https://www.lowcode.agency/blog/how-to-build-a-dress-rental-marketplace);
double-booking prevention at item level [3](https://worldmetrics.org/best/clothing-rental-software/);
late/damage fees [1](https://reservety.com/dress-rental-software/); utilization and
profitability reporting to see which items earn and which sit idle [5](https://www.guideflow.com/blog/costume-rental-software).

**Conclusion: the domain model is correct and unusually deep. LENA's remaining product gaps
are experience gaps (guidance, feedback, terminology, density), not missing business
concepts.** Nothing in the domain requires actors, statuses, or lifecycle stages that LENA
lacks; every research-backed stage (intake, reservation, buffer, delivery, return,
inspection, service, re-availability, closing) exists in the canonical state machines.

## 2. Roles and their jobs

| Role | Evidence | Primary jobs |
| --- | --- | --- |
| **زائرة عامة** (public visitor) | `/landing`, no auth | Discover the showroom, browse approved pieces, request a visit via WhatsApp/appointment intent. |
| **موظفة (staff)** | `RequireAuth` + role≠admin routes | Daily counter work: reservations → delivery → payments → return; register customers/dresses; appointments; waitlist; reminders; stocktake. |
| **مديرة (admin/owner)** | `RequireAdmin` on `/preferences`, RLS admin policies | Everything staff does + backups/server copies, reset, account lifecycle, message templates, print settings, public profile, system-errors count, snapshot gauge, PIN policy. |
| **دعم فني (support, implicit)** | `SystemErrorsSummary` copy directs here; console access | Reads `client_error_events` rows in Supabase console on escalation. |

Role boundaries are enforced twice (route guards + server RLS/RPC role checks — verified in
migrations 0016/0017 usage across tests). A staff member opening `/preferences` directly now
gets an explicit «هذه الصفحة للمديرة فقط» screen (verified in `RequireAdmin.tsx`).

## 3. Journey map (current state, verified)

### 3.1 Public visitor — DISCOVERY → TRUST → CONTACT
- Hero value statement clear («اختاري إطلالتك من المعرض قبل الزيارة»); categories → pieces →
  services → visit steps → FAQ → contact; sticky WhatsApp CTA on mobile (verified).
- Landing fetch is timeout-bounded (12 s) with a fail-closed Arabic error (M3, verified).
- Residue: page remains long on 390px; FAQ not collapsible on mobile (roadmap UX-M4).
- **Boundary held:** no customer/financial data on the public surface (verified: repository
  reads only approved showroom-profile + public inventory fields; RLS anon has no table reads).

### 3.2 New staff — FIRST THIRTY MINUTES
Login → device PIN setup → empty dashboard with two explicit first steps (add item, add
customer) → optional password reset exists on login → account activation is admin-created
(explained on the login card).
- Booking prerequisites are no longer a dead end: wizard step 1 shows «لا توجد عميلات مسجلات
  بعد» + «إضافة عميلة الآن والعودة للحجز» (verified in `CreateReservationModal.tsx`).
- Residue: no progress checklist («أتممتِ 1 من 3») after the empty dashboard — roadmap UX-M1.

### 3.3 Returning staff — THE 80% DAY (counter rhythm)
Mobile bottom bar exposes exactly the four counter actions: الرئيسية، حجوزات، تسليم،
مدفوعات (verified in `navigation.ts`). Desktop sidebar groups 20 destinations into 5
day-shaped groups. Reservations wizard = 4 steps; delivery/return merges inspection +
deposit settlement; daily closing reconciles per payment method; blocked days refuse edits.
- Residue: no visible «محفوظ على الخادم» acknowledgment after writes — success is silent
  when the network is fine (roadmap UX-S2).
- PIN now re-asks after every full reload (by design); throttle added 2026-08-20 (M11).
  A configurable re-lock policy remains a **rejected** idea unless devices prove friction.

### 3.4 Admin — CONTROL PLANE
Preferences page now also carries: cloud server-copy list/restore (M1), snapshot-size gauge
(M2), system-errors count (M7), PIN settings, danger-zone reset. The page is long; tabbed
sub-navigation is the accepted roadmap item (UX-M2) — **not** quick-win material (IA change).

### 3.5 Edge states — all six audited dimensions
- **Empty data:** dashboard/customers/inventory/reservations empty states explain the next
  step (verified across suites + prior rendered audit).
- **Slow network:** cloud gate publishes syncing state; landing bounded fetch; SW never
  caches API data (privacy boundary, verified: no runtimeCaching).
- **Errors:** `UserFacingErrorAlert` shared; persistence failures show an amber banner with
  the real message; error boundary per-route keyed by path.
- **Cancellation/undo:** destructive actions confirm explicitly; append-only ledger corrects
  via reversal movements. Undo for archive remains discoverability-limited (roadmap UX-L3).
- **Expired session / permission:** RequireAuth redirect; RequireAdmin explicit denial card.
- **Offline:** PWA shell offline-capable; writes are local-first with cloud sync; status
  banner covers offline/local-only/error states.

## 4. Missing expectations (what the domain normally has that LENA still lacks in UX)

1. **Progress sense for the new operator** — a 3-step setup checklist state on the dashboard
   (inventory → customer → first reservation) with persistence. Research basis: first-value
   onboarding is the single biggest activation lever in vertical operating tools.
2. **Server-acknowledge feedback** — «حُفظ على الخادم ✓» after money-touching writes.
3. **Settings sub-navigation** — the admin control plane needs tabs (roadmap, not blocking).
4. **Canonical item-family boundary** — «المخزون» vs «الملحقات» overlap confuses where a
   bag/veil is registered (PX-09). Decision recorded; helper copy shipped this pass.
5. **Terminology completion** — «العملاء» leaked in 3 surfaces vs canonical «العميلات»
   (shipped this pass).
6. **Support/about surface inside the app** — version + how to reach support beyond the
   errors card hint (roadmap UX-M3).
7. **Staff account activation journey** — needs live Supabase (DEF-009, owner-session).

### Explicitly NOT missing (checked, present)
Deposit liability separation, booking-advance semantics, late/damage fees, inspection gate
before re-availability, day-close lock, audit-with-operation, waitlist→reservation handoff,
appointment reminders, barcode/labels/printing, measurements, sale invoices + sale returns.

## 5. Feature review — unnecessary / duplicated / badly prioritized?

- **No feature to remove.** Every route maps to a `BUSINESS_MODEL` department or a verified
  control need (audit, backups). Removing anything now would be taste, not evidence.
- **Duplication-risk pairs (monitor, document, don't merge yet):** المخزون/الملحقات
  (PX-09, copy shipped); availability search vs reservations (deliberate — deep link kept);
  inventory-performance vs reports (deliberate destination while usage is low).
- **Priority critique:** «إقفال اليومية» is correctly prominent (money truth); «سجل التدقيق»
  correctly admin-flavored; public-profile editing is correctly admin-only.

## 6. Information-asks review

- Reservation asks: customer → item → dates → money — correct order (commercial decision
  needs identity and dates before pricing).
- Dress intake asks name/type/category/color/size + 4 prices + photos in one screen —
  dense but single-owner-acceptable; splitting is roadmap UX-M5 (no data loss).
- Templates ask for raw `{{token}}` syntax from a non-technical owner — fixed this pass
  with click-to-insert chips + existing live preview.

## 7. Terminology / money / dates / audit expectations

- Money: append-only ledger, ADR-0002 separation (rental_payment / booking_advance /
  security_deposit_* / late_fee / damage_fee / refund / sale / expense) — exemplary for the
  domain; bilingual Arabic labels canonically defined in BUSINESS_MODEL §2.4.
- Dates: business-date semantics for closing; Omani locale rendering in UI.
- Statuses: canonical physical lifecycle + reservation lifecycle in §3 — complete vs domain.
- Audit: operation-embedded entries — present; `client_error_events` now admin-visible (M7).

## 8. Coherence verdict

The product reads as one system, not generated screens — one shell, one navigation source
(`navigation.ts`), one modal/form vocabulary (`Modal`, `FORM_LABEL_CLASS_NAME`, focusRing),
one brand (ivory/gold/navy), one error/alert component. Trust signals: PIN gate (+throttle),
audit log, backups + server copies, blocked-day protection, permission denial card.
Trust residue risks: settings density, silent cloud success, and (pre-fix) mixed «العملاء» —
the last is closed this pass.
