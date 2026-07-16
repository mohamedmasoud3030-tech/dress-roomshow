# LENA v1.0 — Execution Checklist

> **Status:** Active operational queue  
> **Tracking:** GitHub Issue #76  
> **Rule:** The first unchecked, unblocked item in **Current execution queue** is the next agent's assignment.

This file converts the delivery plan into visible execution state. It does not replace `BUSINESS_MODEL.md`, `FINAL_DELIVERY_PLAN.md`, or `TARGET_CODE_ARCHITECTURE.md`.

## Completion marks

- `[x]` means the change is merged into `main`, required CI is green, and the evidence link is recorded.
- `[ ] **IN PROGRESS**` means an active branch or PR exists. It is not complete.
- `[ ] **NEXT**` means this is the first unblocked assignment after the active item.
- `[ ] **PENDING**` means ordered work that must not start before earlier dependencies.
- `[ ] **BLOCKED**` must include the exact blocker and the evidence required to unblock it.

An implementation, local command, draft PR, or written plan is not enough to mark `[x]`.

## Agent takeover protocol

Every agent entering the repository must:

1. start from latest `main` and inspect open PRs and CI;
2. read this checklist before selecting work;
3. continue the existing **IN PROGRESS** PR when it matches the current task;
4. otherwise take the first **NEXT** item without skipping ahead;
5. use one bounded branch and PR;
6. update this checklist in the same PR with state, PR link, exact checks, and remaining work;
7. mark `[x]` only after merge and green CI;
8. leave the next unfinished item explicitly marked **NEXT**.

## Current execution queue

### Phase 0.5A — Architecture guardrails

Completed by [PR #80](https://github.com/mohamedmasoud3030-tech/dress-roomshow/pull/80).  
Merge SHA: `3cf83a47fe87520414e5327251567267ea06f72f`

- [x] **0.5A-01:** Added `@app`, `@modules`, `@engines`, `@platform`, and `@shared` aliases to TypeScript.
  - Evidence: exact mappings exist in `tsconfig.json`.
- [x] **0.5A-02:** Added the same aliases to Vite.
  - Evidence: development and production resolution use the same target roots.
- [x] **0.5A-03:** Added an automated architecture test.
  - Evidence: guarded target roots reject forbidden dependency directions, private cross-module imports, direct runtime/storage access outside `platform`, and imports back into legacy roots.
- [x] **0.5A-04:** Added the architecture test to the default `npm test` gate.
- [x] **0.5A-05:** Recorded the verified mixed-responsibility baseline in `ARCHITECTURE_BASELINE.md`.
- [x] **0.5A-06:** Added this checklist to the mandatory agent reading order and README.
- [x] **0.5A-07:** Final PR head passed Build #181 and Verify #149, including tests, TypeScript, lint, build, and Tauri environment gate.
- [x] **0.5A-08:** Squash-merged PR #80 as `3cf83a47fe87520414e5327251567267ea06f72f`.

**Exit met:** future target-architecture code cannot silently introduce reversed dependencies or direct platform access, and every agent has one visible next task.

### Phase 0.5B — App shell decomposition

Completed by [PR #80](https://github.com/mohamedmasoud3030-tech/dress-roomshow/pull/80).

- [x] **0.5B-01:** Added route/shell characterization coverage before completing the layout migration.
- [x] **0.5B-02:** Moved navigation configuration to `src/app/shell/navigation.ts` without changing labels, paths, or ordering.
- [x] **0.5B-03:** Extracted `useDesktopPersistenceStatus`.
- [x] **0.5B-04:** Extracted `AppHeader`.
- [x] **0.5B-05:** Extracted `DesktopNavigation`.
- [x] **0.5B-06:** Extracted `MobileNavigation` and `MobileMoreMenu`.
- [x] **0.5B-07:** Replaced legacy layout composition with `AppShell`; `src/components/layout/AppLayout.tsx` remains a compatibility export.
- [x] **0.5B-08:** Characterization tests and final CI verified unchanged route composition, navigation order, outlet/error boundary, persistence warning contract, mobile-menu close behavior, and retained RTL/focus classes.
  - Manual phone/tablet/desktop browser evidence remains explicitly tracked in Phase 4 and was not claimed by this refactor PR.

**Exit met:** the app shell composes bounded pieces and contains no showroom business rules.

### Phase 0.5C — Router ownership

- [ ] **NEXT — 0.5C-01:** Extract route configuration and route loading fallback under `src/app/router` while preserving every current URL and 404 behavior.
- [ ] **PENDING — 0.5C-02:** Keep module pages reachable through public entry points; do not migrate module internals in this PR.
- [ ] **PENDING — 0.5C-03:** Verify lazy inventory details, landing page, shell routes, and 404 behavior.

## Phase 1 queue — Data identity, safety, and unified persistence

Do not start these before Phase 0.5A is merged. Shell/router work may proceed only in bounded PRs that do not overlap the same files.

### Persistence/platform foundation

- [ ] **PENDING — 1.01:** Introduce concrete `platform/storage` ports and adapters without changing saved data.
- [ ] **PENDING — 1.02:** Move Tauri/runtime access to `platform/desktop` and `platform/runtime` with compatibility delegates.
- [ ] **PENDING — 1.03:** Introduce the persistence engine and canonical operational collection registry.
- [ ] **PENDING — 1.04:** Register appointments, sales invoices, sale returns, service tasks, audit, preferences, images, and every UI-created entity.
- [ ] **PENDING — 1.05:** Add transaction/snapshot primitives used by migrations, backup, restore, reset, and later workflow commands.

### Legacy data migration

- [ ] **PENDING — 1.06:** Migrate `lena_dresses` exactly once into canonical inventory storage without duplication.
- [ ] **PENDING — 1.07:** Migrate `lena_appointments` exactly once into canonical appointment storage without duplication.
- [ ] **PENDING — 1.08:** Preserve temporary legacy service exports until all callers migrate.
- [ ] **PENDING — 1.09:** Add migration markers, retry behavior, and exact rollback on failure.

### Backup, images, and recovery

- [ ] **PENDING — 1.10:** Version the backup schema and include IndexedDB image blobs.
- [ ] **PENDING — 1.11:** Make export/import asynchronous where image access requires it.
- [ ] **PENDING — 1.12:** Validate the full backup before mutation.
- [ ] **PENDING — 1.13:** Restore the exact prior collections and images after any forced import failure.
- [ ] **PENDING — 1.14:** Keep valid legacy collection-only backups importable.
- [ ] **PENDING — 1.15:** Verify browser reset, restore, and Tauri relaunch with inventory, appointments, invoices, returns, audit, and images.

### Identity and production startup

- [ ] **PENDING — 1.16:** Remove automatic mock fallback data from production startup.
- [ ] **PENDING — 1.17:** Add explicit confirmed demo-data loading and reversible reset.
- [ ] **PENDING — 1.18:** Add immutable customer and inventory references while preserving display snapshots.
- [ ] **PENDING — 1.19:** Replace length-based inventory codes with a monotonic collision-safe allocator.
- [ ] **PENDING — 1.20:** Archive referenced inventory/customers instead of hard-deleting them.

**Phase 1 exit:** no supported operation creates data omitted from backup/restore or desktop persistence, and historical relations do not depend only on mutable phone/code values.

## Phase 2 queue — Atomic workflows and financial correctness

- [ ] **PENDING — 2.01:** Reservation create/cancel command with audit in the same transaction boundary.
- [ ] **PENDING — 2.02:** Payment, refund, fee, adjustment, and deposit-settlement commands.
- [ ] **PENDING — 2.03:** Delivery and return commands with inventory/service transitions.
- [ ] **PENDING — 2.04:** Canonical sale invoice and sale-line return/refund commands; quick sale becomes a one-line invoice.
- [ ] **PENDING — 2.05:** Expense posting command.
- [ ] **PENDING — 2.06:** Daily close and explicit reopen commands.
- [ ] **PENDING — 2.07:** Forced-failure tests after every write boundary proving exact rollback.
- [ ] **PENDING — 2.08:** Separate rental revenue, sale revenue, deposit liability, fees, expenses, net cash movement, and recognized profitability.
- [ ] **PENDING — 2.09:** Reconcile operational records, reports, daily close, audit, and printed documents for the same scenarios.

## Phase 3 queue — Selective capability recovery

- [ ] **PENDING — 3.01:** Reservation calendar rebuilt against current public APIs.
- [ ] **PENDING — 3.02:** Printable rental contract through documents/printing boundaries.
- [ ] **PENDING — 3.03:** Inspection, laundry, tailoring, maintenance, and damage service queue.
- [ ] **PENDING — 3.04:** Reachable sales ledger and sale-return history.
- [ ] **PENDING — 3.05:** Remaining barcode label/lifecycle helpers.

Never merge PR #62 wholesale.

## Phase 4 queue — Runtime QA

- [ ] **PENDING — 4.01:** Desktop browser workflow evidence.
- [ ] **PENDING — 4.02:** Phone evidence at 390×844 and 360×740.
- [ ] **PENDING — 4.03:** PWA installation and offline reload.
- [ ] **PENDING — 4.04:** Compatible Tauri Windows build, install, launch, relaunch, persistence, backup, restore, and printing.
- [ ] **PENDING — 4.05:** Real-device camera/barcode test with manual fallback.
- [ ] **PENDING — 4.06:** Popup-blocked print recovery and storage-quota failure recovery.
- [ ] **PENDING — 4.07:** RTL, keyboard focus, accessible labels, modal scrolling, and no horizontal overflow.

## Phase 5 queue — Release and handover

- [ ] **PENDING — 5.01:** Clean release candidate from current `main`.
- [ ] **PENDING — 5.02:** Windows build verification in a compatible environment.
- [ ] **PENDING — 5.03:** PWA manifest, icons, cache, offline startup, and bundled Arabic font verification.
- [ ] **PENDING — 5.04:** Installation, empty-start, demo-data, backup/recovery, upgrade, and rollback guides.
- [ ] **PENDING — 5.05:** Final release notes and known limitations.
- [ ] **PENDING — 5.06:** Release tag only after all gates are complete.

## Deferred Phase 0 cleanup

- [ ] **BLOCKED:** Remove one-off root shell scripts, tracked build metadata, and stale archives only after repository search and CI prove they are unreferenced.
  - Unblock evidence: path inventory, no callers in maintained scripts/workflows/docs, clean build and tests after deletion.

## Evidence log

| Item | PR / commit | Required checks | Runtime evidence | State |
| --- | --- | --- | --- | --- |
| Source-of-truth documents | PR #77 | Build + Verify | Documentation only | Complete |
| Focused agent skills | PR #78 | Build + Verify | Documentation only | Complete |
| Target architecture contract | PR #79 / `befefeaaeb842f70d8ddcf7b065e49b882bbe76d` | Build #160 + Verify #128 | Documentation only | Complete |
| Mobile summary cards 2×2 | PR #81 / `9ca10a65d7bf11d18ae121b4ad067bfaee30d2dd` | Build #165 + Verify #133 | Five summary grids; no business logic changed | Complete |
| Phase 0.5A guardrails + 0.5B app shell | PR #80 / `3cf83a47fe87520414e5327251567267ea06f72f` | Build #181 + Verify #149 | Characterization coverage; visual styling intentionally unchanged; device matrix remains Phase 4 | Complete |
