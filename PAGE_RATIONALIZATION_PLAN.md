# Page Rationalization Plan

**Status:** VERIFIED COMPLETE (decision plan). No route is removed in this milestone. All changes are additive or compatible-first.

## Recommended information architecture

### Primary navigation

1. **الرئيسية** — dashboard/work queue.
2. **المخزون والخدمة** — dresses, accessories, availability, service, stocktake, inventory performance.
3. **العميلات والحجوزات** — customers, reservations, appointments, waitlist, reminders.
4. **التسليم والمال** — delivery/return, sales, payments, expenses, daily closing.
5. **التقارير والرقابة** — reports, inventory performance shortcut, audit log.
6. **الإعدادات** — admin-only hub; backup, showroom profile, templates, printing, accounts.
7. **صفحة المعرض العامة** — public preview, outside the private shell.

The current routes remain stable. This is an information grouping recommendation, not a destructive URL rewrite.

## Keep

| Route/surface | Evidence | Roles and impact | Dependencies/risk | Verification |
|---|---|---|---|---|
| `/`, `/landing`, `/piece/:code`, `/login` | front-door and router tests; customer entry is now separate from staff login | preserves anonymous customer journey and staff return route | auth probe, public projection, SPA rewrite | `front-door`, `app-router`, `landing-profile`, public curl |
| `/inventory`, `/inventory/:code`, `/designs/:code` | different identities: physical piece, design, collection | staff needs browse and inspect without losing immutable codes | dress/design services, history links | route, inventory, design, barcode, lifecycle tests |
| `/availability` | date-derived availability is not the same as inventory state | prevents promising a physically present but period-conflicted item | availability engine/reservation buffer | availability/search/conflict suites |
| `/customers` | identity/history is a real operator task | keeps customer context available to reservation/payment flows | archive-not-delete, privacy | customer/search/conduct/measurement tests |
| `/reservations` | commitment and period workflow is distinct | preserves booking wizard and contract | payments, inventory, overlap, audit | reservation/workflow/contract tests |
| `/delivery-return` | high-risk physical transition deserves a dedicated work queue | reduces accidental state changes | service/condition photos/fees | fulfillment/delivery/return suites |
| `/payments`, `/expenses`, `/daily-closing`, `/sales` | separate financial semantics and reconciliation boundaries | avoids combining liabilities, revenue, expenses, and sale returns | financial services and reports | finance/reconciliation/close/sale tests |
| `/service`, `/stocktake` | physical state transitions differ from catalog editing | operational staff get focused queues | inventory/service/scan | service/stocktake/scanner tests |
| `/audit-log` | chronological accountability is not a dashboard metric | preserves audit evidence | server-authoritative append-only state | audit/cloud authority tests |
| `/preferences` | admin-only governance boundary | prevents staff exposure to reset/account/backup | `RequireAdmin`, RPC/RLS, backup | auth/authority/backup tests |
| Mobile bottom navigation and More sheet | current code has one navigation source and phone quick actions | one-hand access to reservations, delivery, payments | z-index, safe-area, focus | shell/mobile DOM tests + device pass when browser exists |

## Merge (conceptual, not URL-breaking)

| Proposed merge | Evidence | User impact | Technical dependency/risk | Migration/verification |
|---|---|---|---|---|
| **Reports + Inventory Performance** under one “Reports & decisions” hub, while keeping `/inventory-performance` as a route | both are analytical/read-only; performance is currently a separate nav item under inventory | fewer places to look for management answers | report services and exports differ; do not merge data models | add hub/index with links first; keep old path; verify exports and source reconciliation |
| **Appointments + Reminders + Waitlist** as a customer follow-up workspace, while retaining direct routes | all are future/current customer demand queues but have distinct state transitions | one follow-up entry point reduces missed calls | reminder templates/WhatsApp and waitlist conversion must remain separate commands | create grouped navigation/landing section; route smoke and workflow tests |
| **Showroom profile + message templates + print settings** as “Public & documents” section inside preferences | all are owner-controlled identity/output settings | clearer admin mental model | do not combine save commands or rollback boundaries | tabs/section navigation only; separate forms and commands |
| **Backup/cloud copies/storage health** as “Data safety” section | same risk domain | admin understands restore capacity and backup in one place | restore/reset must remain visibly destructive and distinct | preserve current actions; introduce subsection anchors first |

## Split

| Current overloaded surface | Split target | Why | Roles/impact | Risk/dependency | Verification |
|---|---|---|---|---|---|
| `PreferencesPage` | `preferences/profile`, `preferences/operations`, `preferences/data-safety`, `preferences/accounts` conceptual sections | current page mixes branding, backup, storage, printing, templates, accounts, reset | admin can complete one task without a 400-line scroll; staff unaffected | all currently share `/preferences` and admin gate; split only after compatible nested routes/redirects | render each section, save/reload, reset/restore guard, admin permission |
| `CustomersPage` inline conduct + measurements expansion | customer record detail route or drawer with tabs: Overview, Measurements, Conduct, History | identity list should not become a full record editor for every row | faster scanning for staff; preserves related history | no current customer route; add `/customers/:id` only with legacy fallback | customer search, measurements, conduct, back/refresh |
| `ReservationsPage` list/calendar/details | reservation detail route or sheet | list is for choosing; detail is for commitment actions and money | reduces overloaded list rows | stable reservation number and deep link needed | open from dashboard/notifications, print contract, browser back |
| `SalesLedgerPage` invoice/return details | sale detail route/sheet | sale return and print are high consequence | clearer audit/financial context | sale IDs and service route | invoice, return, service inspection, close reconciliation |
| `ReportsPage` into report families | only if current report density grows | current report page can be a hub, not a single giant report | keeps decisions focused | report exports and filters | report source reconciliation |

## Move (navigation only; route compatibility preserved)

| Move | From | To | Rationale | Safety |
|---|---|---|---|---|
| Inventory performance shortcut | inventory group | reports/decisions group, retain `/inventory-performance` | management decision, not daily stock editing | use same navigation item with old URL |
| Waitlist/reminders | customer/reservation group | customer follow-up subsection | same customer-demand follow-up task | no URL change |
| Daily closing | financial group | end-of-day operations group at top of finance | deadline-sensitive workflow | retain `/daily-closing` and dashboard link |
| Stocktake | inventory group | inventory control subsection | not an everyday browse action | retain route and mobile More link |
| Public page preview | shell footer/navigation | keep footer/More as a secondary link | not part of private daily work | `/landing` remains public |

## Replace

| Current pattern | Replacement | Evidence | Risk | Verification |
|---|---|---|---|---|
| Large forms that hand-assemble labels/errors | `FormField` family + `FormActions` + field-level error/summary | `FormField.tsx` already supplies IDs, `aria-invalid`, hints, alerts; pages still mix patterns | accidental validation behavior change | migrate one representative reservation/customer flow first; compare commands and tests |
| Detail-heavy dialogs | detail route/sheet for customer, reservation, sale, dress | current details exist inside pages/modals; phone keyboard/scroll risk | back-link/deep-link changes | add route while modal remains fallback; route DOM smoke |
| Hover-only public card actions | touch-visible actions | current defect observed/fixed in `LandingInventory` | visual density on desktop | touch test, keyboard focus test, card click journey |
| Unbounded generic metric grids | decision summaries with source links | dashboard/report criteria forbid vanity metrics | operators may lose a useful count if removed too fast | keep only cards with action destination; dashboard tests |
| Native table shrink-to-phone | explicit table strategy per dataset | financial/ledger comparisons require density; inventory/public browse do not | different views must stay semantically identical | viewport tests when browser available; jsdom contract for priority fields |

## Remove after migration

| Candidate | Decision | Why not now | Exit criteria |
|---|---|---|---|
| Dead/re-export architecture modules | remove only when import graph and tests confirm no consumer | current deep clean already removed many; future removal is unrelated to IA | no imports, no saved-data key, full tests green |
| Duplicate local profile/public fallback paths | reduce after cloud/public projection is proven current | public page must work for anonymous visitor and offline/fallback behavior | public profile projection live, migration status verified, fallback tests |
| Unused `ViewModeToggle` mode on a page where it adds no decision | per-route review, not global deletion | cards/list is useful for inventory/accessories/customers | route owner confirms no stored preference/consumer |
| Old preference sub-sections after nested routes | keep compatibility component until redirects and saved links are verified | admin bookmarks may exist | replacement route, redirect, route smoke, no consumer |

## Redirect policy

- `/` keeps its dual behavior: anonymous → `/landing`; signed-in → dashboard.
- `/landing` remains canonical public collection URL.
- `/piece/:code` remains canonical public piece URL.
- `/inventory/:code` remains private physical item detail; it must not be confused with `/piece/:code`.
- Any future nested preference routes redirect to `/preferences` with a section anchor until route-specific pages are proven.
- `/designs/:code` and `/inventory/:code` are never silently redirected into one another because their identity and permissions differ.
- Removed/renamed navigation items must retain a `NotFound` recovery path and a compatible redirect test.

## No-go decisions

- Do not merge payments, expenses, daily closing, and deposits into one generic “finance” form.
- Do not merge appointments with reservations at the data/command level.
- Do not remove the public page or require a customer account in v1.
- Do not remove the audit log, backup/restore, or admin permission gate.
- Do not split every component into a route merely to mirror the source folder structure.
