# Interface Migration Plan

**Status:** IMPLEMENTED BUT NOT VERIFIED for the full architecture; the first safe milestone below is implemented. Remaining milestones are NOT STARTED unless marked otherwise. Browser/device-only evidence is BLOCKED BY OWNER OR EXTERNAL ACTION in this workspace.

## Migration principles

- Work directly on `main` only, with one bounded commit per vertical milestone.
- Never reset or rewrite current data/routes; keep additive compatibility paths.
- Migrate one complete user journey, not a folder at a time.
- Preserve command functions, persistence engine, audit, financial semantics, auth, RLS, and public/private projections.
- Remove old code only after import search, route smoke, command tests, and full regression pass.
- Each milestone must end with `typecheck`, `lint`, `npm test`, `build`, route/DOM evidence, and a clean tree.

## Priority order

| Priority | Milestone | Status | User-visible outcome | Scope | Acceptance |
|---:|---|---|---|---|---|
| 0 | Restore phone touch and basic public contact reliability | VERIFIED COMPLETE | forms scroll/tap on phone; public actions no longer depend on hover; contact data is consistent | `Modal`, public inventory controls, profile defaults/legacy repair, targeted tests | mobile regression, profile/print tests, `786/786`, typecheck/lint/build |
| 1 | Establish canonical page foundations | IMPLEMENTED BUT NOT VERIFIED | the app shell and representative inventory page now share a consistent frame, header action slot, button semantics, and recoverable state action without behavior change | `PageContainer`, PageHeader action/status slots, Button/IconButton, FormActions, ErrorState, Modal close action, representative inventory header | typecheck/lint/full test/build passed; browser/device rendered pass remains external |
| 2 | Migrate representative reservation journey end-to-end | IMPLEMENTED BUT NOT VERIFIED | reservation index and wizard now use the shared filter/action/error foundations with ordered validation and recovery | reservation index, `CreateReservationModal`, `Stepper`, `SearchableSelect`, `ValidationSummary`, `Button` | reservation happy/blocked/idempotency/rollback + DOM/static render passed; browser/device journey remains external |
| 3 | Migrate delivery/return/service risk path | NOT STARTED | daily high-risk physical workflow is a clear queue and safe detail sheet | delivery-return, condition photos, service queue, late fee/deposit status | delivery/return/service/finance/audit/rollback + mobile camera fallback |
| 4 | Migrate inventory and customer indexes | NOT STARTED | browse cards/operations list/detail have explicit hierarchy and phone actions | inventory, accessories, customers, detail links, view mode | lifecycle/archive/code/image/customer history tests + responsive evidence |
| 5 | Split admin settings safely | NOT STARTED | admin finds profile, documents, accounts, and data safety without long scroll | conceptual sections/nested routes with `/preferences` compatibility | admin/staff permission, backup/restore/reset, deep-link/redirect tests |
| 6 | Standardize financial ledgers and reconciliation | NOT STARTED | payment/sale/expense/daily close semantics visible and comparable | `DataTable`, `KeyValueList`, reconciliation layout | full financial regression, print, daily-close, mobile table strategy |
| 7 | Reports and audit decision surfaces | NOT STARTED | reports answer decisions; audit reads as timeline; no vanity cards | report/inventory performance/audit | report source reconciliation, export, accessible table/chart equivalence |
| 8 | Public storefront content hierarchy refinement | NOT STARTED | shorter phone journey with category → catalogue → CTA and accessible detail | public sections, filters, shortlist, piece detail | anonymous public projection/privacy, route, CTA, phone/tablet/desktop |
| 9 | Remove obsolete wrappers/duplicate patterns | NOT STARTED | smaller maintainable interface layer | only proven dead components after graph/test audit | `git grep`, route smoke, full suite/build |

## Milestone 0 — implemented change set

### Outcome

- `Modal` no longer sets `document.body.style.touchAction = 'none'`, which previously blocked sheet/form touch behavior on mobile browsers.
- Modal scroll region explicitly allows vertical touch scrolling with `touch-pan-y`.
- Public save/zoom card actions are visible on touch devices instead of depending on hover.
- Public contact defaults are now Oman-only address, the supplied Oman phone, and the supplied email.
- A narrow legacy-seed repair applies only to the known old contact values so the current cloud/public projection is corrected at read time without overriding future owner-entered values.
- Existing standalone public piece pages, address/map fields, and front-door behavior are retained.

### Changed files

- `src/components/shared/Modal.tsx`
- `src/pages/landing/components/LandingInventory.tsx`
- `src/pages/landing/landingContent.ts`
- `src/features/preferences/showroomProfile.service.ts`
- `src/pages/landing/landingProfile.repository.ts`
- targeted regression tests under `tests/`

### Evidence

- `npm test`: 786 tests passed, 0 failed.
- `npm run typecheck`: passed.
- `npm run lint`: passed.
- `npm run build`: passed.
- Git commit: `7708b00` on `main`, pushed to `origin/main`.
- Real browser/touch visual pass: BLOCKED BY OWNER OR EXTERNAL ACTION because Chromium system libraries are unavailable in this workspace.
- Production Vercel refresh: BLOCKED BY OWNER OR EXTERNAL ACTION because the manual deployment secret/tooling is absent and GitHub→Vercel auto-deploy is not connected. The repository change is complete; the production host may still serve the previous build.

## Milestone 1 — foundations

**Status: IMPLEMENTED BUT NOT VERIFIED**

### Implemented change set

1. Added `PageContainer` with `standard`, `wide`, and `narrow` widths plus safe-area/bottom spacing.
2. Extended `PageHeader` with backwards-compatible `actions` and `status` slots.
3. Added forwarded-ref `Button` and `IconButton` primitives with variants, touch-safe sizes, focus ring, disabled/loading semantics, and accessible icon labels.
4. Migrated shared `FormActions`, `ErrorState`, and the `Modal` close action to the canonical button semantics.
5. Migrated inventory, delivery/return, customers, and accessories page action groups to the `PageHeader` action slot without changing commands, routes, permissions, or data writes.
6. Added regression coverage for the shell frame, action/status slots, loading semantics, form action usage, reservation and operational action surfaces, and safe-area behavior.

### Changed files

- `src/app/shell/AppShell.tsx`
- `src/components/shared/PageContainer.tsx`
- `src/components/shared/PageHeader.tsx`
- `src/components/shared/Button.tsx`
- `src/components/shared/FormField.tsx`
- `src/components/shared/Modal.tsx`
- `src/components/shared/StateViews.tsx`
- `src/features/dresses/DressesPage.tsx`
- `src/features/delivery-return/DeliveryReturnPage.tsx`
- `src/features/delivery-return/DeliveryReturnModal.tsx`
- `src/features/customers/CustomersPage.tsx`
- `src/features/accessories/AccessoriesPage.tsx`
- `tests/mobile-polish-regression.test.mjs`

### Evidence

- `npm test`: 787 tests passed, 0 failed.
- `npm run typecheck`: passed.
- `npm run lint`: passed.
- `npm run build`: passed.
- No route, permission, service, persistence, or financial command contract was changed.
- Browser/device rendered verification: **BLOCKED BY OWNER OR EXTERNAL ACTION** because Chromium/system libraries are unavailable in this workspace.

### Remaining implementation work

1. Extend the foundation to the remaining route families and filter/reset contracts.
2. Complete browser/device verification for the foundation and reservation journey when the external runtime becomes available.

### Acceptance

- Every migrated route has one `main`/heading, one visible primary action, and consistent state copy.
- No business service imports from shared UI.
- Existing route/command tests unchanged and green.

## Milestone 2 — reservation journey

**Status: IMPLEMENTED BUT NOT VERIFIED**

### Implemented change set

- Kept `/reservations`, reservation services, command boundaries, idempotency, conflict checks, print contract, and nested add flows unchanged.
- Migrated the reservation index header/actions and filters to `PageHeader`, `Button`, `FilterBar`, `SearchFilter`, and `SelectFilter`.
- Preserved search/status/timing filters in the URL and added an explicit clear-filters action.
- Added `ValidationSummary` for long-form errors while retaining inline field errors.
- Added schema-level cross-field date validation in addition to step validation.
- Added first-invalid focus after a failed final submit.
- Added line validation before review: missing line, duplicate item, invalid values, and rental price above the item price are blocked before the commit step.
- Migrated wizard actions, add-item actions, cancel, and line removal to canonical button semantics with loading/double-submit protection.

### Changed files

- `src/features/reservations/ReservationsPage.tsx`
- `src/features/reservations/CreateReservationModal.tsx`
- `src/components/shared/ValidationSummary.tsx`
- `tests/mobile-polish-regression.test.mjs`
- `SHARED_COMPONENT_ARCHITECTURE.md`

### Evidence

- Reservation/UI targeted tests: passed.
- `npm run typecheck`: passed.
- `npm run lint`: passed.
- Full `npm test`: 787 tests passed, 0 failed.
- `npm run build`: passed.
- Browser/device rendered journey: **BLOCKED BY OWNER OR EXTERNAL ACTION** because Chromium/system libraries are unavailable in this workspace.

### Acceptance

- Customer → dates → items → summary has ordered validation and preserved context.
- Overlap, invalid period, payment/advance, duplicate submit, forced rollback remain under existing service/command contracts.
- Contract print and history still reference stable reservation/item snapshots.


## Milestone 3 — delivery/return/service

### Implementation

- Create queue item primitives for due tasks and state badges.
- Put required payment gate, condition evidence, accessory checklist, and late-fee decision in an ordered task flow.
- Keep service routing after physical return/sale return; never make item available prematurely.
- Use camera component with permission denied and manual fallback states.

### Acceptance

- Staff can complete delivery/return from queue without guessing state.
- Photos/fees/deposit liability/audit/history/report rollback remain consistent.
- Mobile keyboard/camera scroll and retry behavior verified on device.

## Milestone 4 — inventory/customers

### Implementation

- Inventory/accessories: card browse + operational list, detail links, clear lifecycle action menu.
- Customers: compact identity list + detail sheet/route for measurements/conduct/history.
- Keep `/inventory/:code` and add customer detail only if route compatibility is covered.
- Use `DataTable` only for comparison, not public visual browse.

### Acceptance

- Codes/barcodes/IDs never change or reuse.
- Archive/delete permissions and references are unchanged.
- Public catalogue is not exposed to private customer history.

## Milestone 5 — admin settings split

### Implementation

- Keep `/preferences` as compatibility parent and admin gate.
- Add conceptual section navigation first; only then add nested routes if the runtime and deep-link rewrite support are proven.
- Group as Public & documents, Operations, Accounts, Data safety.
- Put reset/restore/account role changes in isolated guarded zone.

### Acceptance

- Staff cannot see or call admin operations.
- Existing preference saves, cloud copies, restore, image migration, print, profile, templates, account management, reset all persist and audit.
- Old `/preferences` bookmarks continue to work.

## Milestone 6 — ledgers/reconciliation

### Implementation

- Introduce `DataTable` with priority columns and phone transformation.
- Migrate payments first, then sales/expenses, then daily close.
- Keep financial labels and calculations in feature/finance services.
- Add detail drawers for source movement and linked business event.

### Acceptance

- Total rows reconcile to source movements and daily close.
- Deposit liability never appears as rental revenue.
- Phone displays summary then expandable details without losing comparison ability.

## Milestone 7 — reports/audit

### Implementation

- Define report question/period/conclusion at top.
- Give charts text/table equivalent and threshold explanation.
- Render audit as activity feed with export and source links.

### Acceptance

- No chart-only information; all totals have source meaning.
- Audit is append-only and actor/time/entity readable.

## Milestone 8 — public storefront

### Implementation

- Keep public route/data projection and no customer account.
- Shorten phone reading order through collapsible secondary sections only after public content analytics or device review; do not hide catalogue/CTA.
- Make filter/search/results and shortlist state accessible and touch-first.

### Acceptance

- Anonymous visitor can browse, open `/piece/:code`, shortlist, and hand off to WhatsApp without private data.
- Phone, tablet, laptop, wide desktop reading order is intentional.

## Safe migration checklist per milestone

- [ ] Confirm git status; preserve unrelated changes.
- [ ] Read owning services/types/tests before editing UI.
- [ ] Capture baseline route/DOM behavior with existing tests.
- [ ] Implement shared foundation before page duplication.
- [ ] Keep old route and command signatures.
- [ ] Add state/permission/keyboard/mobile tests.
- [ ] Run affected tests, `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`.
- [ ] Review complete diff for secrets, direct storage writes, broken role gates, and route drift.
- [ ] Push one bounded commit; only then mark the milestone VERIFIED COMPLETE.

## External blockers

- A real device/browser session is required for pixel/touch/keyboard/camera/print/PWA evidence.
- Production Vercel deployment remains external because the current workspace lacks the manual deployment secret/tooling and the repository has no Vercel workflow.
- No owner approval is required for the routine IA/component decisions above. Approval is required only before changing target market/policy, destructive production data, or production deployment credentials.
