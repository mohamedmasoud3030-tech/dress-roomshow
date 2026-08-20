# Product Decisions — LENA

> 2026-08-20 · Branch `arena/01a01f12-lenadress`.
> Each entry: context → one decisive recommendation (no option lists) → decisive reason →
> reversibility. Assumptions are labeled and default to the conservative, reversible choice.

## PD-1 — LENA is a showroom operating system, not a shopfront builder
- **Decision:** the product's center of gravity stays the internal console; `/landing` remains a
  read-only, owner-governed catalogue feeding WhatsApp/visit intent. No public checkout, no
  online payment, no marketplace multi-tenant direction.
- **Decisive reason:** the money truth (deposits as liabilities, day-close reconciliation,
  inspection gates) only stays correct when humans at the counter execute it; industry practice
  for single boutiques is deposit-handled-at-visit with software managing availability +
  lifecycle [1](https://reservety.com/dress-rental-software/), [5](https://www.guideflow.com/blog/costume-rental-software).
- **Reversible:** yes — landing is a pure presentation slice; nothing internal depends on it.

## PD-2 — Canonical customer term is «العميلات»
- **Decision:** every internal surface (navigation, pages, reminders, exports) says «العميلات».
  Executed this pass in `DashboardPage`, `RemindersPage`, and the navigation group label.
- **Decisive reason:** the clientele is women and the page title already said «إدارة العميلات»;
  mixed terms read as two different entities to a new staff member.
- **Reversible:** copy-only, one glossary line in `LOCALIZATION_CONTENT_SYSTEM.md`.

## PD-3 — Inventory vs Accessories boundary (PX-09)
- **Decision (copy now, structure never without owner date-backed pressure):**
  «المخزون» = pieces managed on the full physical lifecycle with photos/size (dresses and any
  piece rented or sold independently). «الملحقات» = accompanying pieces attached to reservations
  (veils, crowns, belts, bags, gloves, jewellery) on the lighter catalogue. Helper copy shipped
  under «نوع العنصر» in the add-dress form.
- **Decisive reason:** both modules share the allocator/barcode/finance machinery by design;
  merging data models now is risk without a measured complaint. The confusion is at the entry
  point, so the entry point is where the fix goes.
- **Reversible:** helper text only; zero schema/behavior change.
- **Assumption (A-3):** operators are not currently double-registering the same physical piece
  in both modules. If the owner session shows they are, revisit with a single-register flow.

## PD-4 — Templates are edited by non-technical hands
- **Decision:** placeholder chips are click-to-insert buttons (Arabic labels, `dir="ltr"`
  tokens) that append into the last-focused message at the caret; live preview stays.
  Executed this pass.
- **Decisive reason:** a mistyped `{{token}}` ships a broken message to a real customer under
  the showroom's name — the costliest class of copy error for a small brand.
- **Reversible:** pure UI addition; raw text remains editable.

## PD-5 — No on-request PIN relaxation
- **Decision:** PIN re-ask after full reload stays; re-lock policy does NOT become a setting now.
  The M11 throttle (5 tries → escalating lock) makes the strict posture safe from abuse.
- **Decisive reason:** softening a lock by preference adds a security knob the owner must
  understand and police; friction is unproven (zero real-device hours yet). Re-evaluate ONLY
  with M10 device-session friction notes.
- **Reversible:** yes, a policy switch can be added later without data migration.

## PD-6 — Public contact data is owner-published, never app-invented
- **Decision:** fallback contacts stay empty; the landing shows only what the admin approved in
  the public profile (already enforced post-DEF-024; re-verified). The owner's remaining task is
  filling the approved profile — a one-time settings visit.
- **Decisive reason:** an invented phone number is a trust defect that no copy can paper over
  (PX-01). Verified industry parallel: listings publish only verified contact channels
  [2](https://www.lowcode.agency/blog/how-to-build-a-fashion-rental-marketplace).
- **Reversible:** n/a (data governance).

## PD-7 — Error visibility stops at count-level for the owner (M7), row-level stays with support
- **Decision:** the admin sees total + latest timestamp + guidance; browsing rows stays in the
  Supabase console on the support side.
- **Decisive reason:** the counter UI must not become a second log viewer (maintained forever);
  the owner needs to know *that* errors accumulate and *when the last one was*, not stack traces.
- **Reversible:** component is additive and isolated.

## Reversible assumptions register

| # | Assumption | Why safe | Falsifier |
| --- | --- | --- | --- |
| A-1 | WhatsApp remains the conversion channel (no web bookings) | Landing copy promises nothing beyond inquiry | Owner announces online booking demand |
| A-2 | One admin + up-to-one-device counter rhythm | Auth model + PIN are device-local | Staff count grows → revisit sessions/MFA (M6) |
| A-3 | No double registration across المخزون/الملحقات | Shared machinery keeps both views correct | Owner session evidence → single-register flow |
| A-4 | «العميلات» wording fits the brand voice | Already dominant in page titles/copy | Owner prefers «الزبونات» etc. — one glossary edit |
| A-5 | Daily closing is the money checkpoint (not shift-based) | BUSINESS_MODEL §2.8 canonical | Multi-shift operation appears → shift closing spec |
