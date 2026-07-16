# LENA v1.0 — Final Delivery Plan

> **Status:** Active source of truth  
> **Tracking issue:** #76  
> **Baseline:** `main@a5c277f93b011edba279248f35648049f107d416`

This document replaces every previous roadmap, audit plan, readiness-progress document, and stale delivery branch. Developers and agents must execute from the latest `main`, read issue #76, and use this file as the delivery contract.

The product goals, departmental responsibilities, state machines, accounting meanings, and end-to-end workflows are defined in [`BUSINESS_MODEL.md`](BUSINESS_MODEL.md). Implementation is not complete unless it conforms to both documents.

## 1. Product boundary

LENA is an Arabic-first, RTL, local-first operating system for one occasion-wear showroom.

Supported targets:

- Browser and installable PWA.
- Tauri desktop application for Windows.

Out of scope for v1.0:

- SaaS or multi-tenant architecture.
- Multi-device synchronization.
- Online payments.
- User roles, authentication, or remote account management.
- Cosmetic refactors that do not affect release safety or usability.

## 2. Current verified shape

The active app currently exposes dashboard, inventory, inventory details, customers, reservations, appointments, delivery/return, payments, expenses, daily closing, audit log, reports, preferences, landing, and 404 routes.

The repository defines these mandatory automated gates:

```bash
npm ci
npm test
npm run typecheck
npm run lint
npm run build
```

The baseline commit has a successful Vercel status. PR #77 has a fresh Build success; the Verify workflow must finish green before merge.

## 3. Confirmed release blockers

### 3.1 Inventory and appointments bypass the canonical persistence contract

- `src/features/dresses/dress.service.ts` writes inventory to `lena_dresses`.
- `src/features/appointments/appointment.service.ts` writes appointments to `lena_appointments`.

The central adapter, backup/reset flow, and Tauri mirror operate on `dress-roomshow:*` data. Inventory and appointments can therefore be omitted from backup, reset, or desktop recovery.

### 3.2 IndexedDB images are outside backup/restore

`LocalDatabaseBackup` currently exports collection arrays only. IndexedDB image blobs are not represented in the backup schema and cannot be restored transactionally with the operational state.

### 3.3 Empty installations fall back to fake operational data

Core services use mock customers, reservations, payments, expenses, and delivery records when storage is empty. Production delivery must start with an empty workspace. Demo records may only be loaded through an explicit, reversible demo-data action.

### 3.4 The collection registry is incomplete

`sales-invoices` and `sales-returns` are used by the application but are absent from `REGISTERED_COLLECTIONS`. Appointments and any accepted service-task collections are also missing. Every operational entity must use one registry for browser persistence, backup, restore, reset, Tauri snapshots, and integrity checks.

### 3.5 Multi-module operations are not atomic

Payment, return settlement, delivery, return, sale invoice, inventory status, and audit writes are performed sequentially across multiple collections. A persistence failure in the middle can leave money, reservations, inventory, reports, and audit inconsistent.

### 3.6 Historical links use mutable business keys

Reservations retain customer/item display snapshots but do not store immutable `customerId` and `inventoryItemId`. Customer history is reconstructed by phone, and item history by code. Editing or reusing those values can orphan or misattach historical records.

### 3.7 Inventory identity and deletion are unsafe

Inventory codes are generated from `dresses.length + 1`, so deletion can cause code reuse. The UI hard-deletes inventory directly while the existing archive blocker is not wired into the delete path.

### 3.8 Sales have two disconnected command paths

Single-item direct sales and invoice sales are separate workflows. A direct sale can lack the canonical invoice and line-return history. Sale returns also move an item directly to `available` instead of inspection/service.

### 3.9 Reporting semantics mix cash, revenue, and liability

- Deposit collections are included in total cash collected but are not separated clearly as refundable liability.
- Item performance counts listed rental price from every non-cancelled reservation as revenue even if it was never collected or completed.
- Daily closing is correctly cash-oriented, but the surrounding report labels and profitability model must distinguish cash movement from earned revenue.

### 3.10 Historical branches cannot be merged directly

PR #62 and PR #63 are both 68 commits behind current `main` and are now closed.

- PR #62 remains a reference for selective recovery of useful features only.
- PR #63 is an obsolete agent/documentation framework.

## 4. Execution rules

1. Start every phase from the latest `main` after checking open PRs and CI.
2. Read `BUSINESS_MODEL.md` before changing cross-module behavior.
3. Use one implementation branch and one PR per phase unless a smaller safety PR is required.
4. Never merge PR #62 or PR #63 wholesale.
5. Do not change money, settlement, inventory-state, backup, migration, or identity behavior without regression tests.
6. Do not declare a feature complete merely because a page renders. Verify persistence, backup, reset, audit, reports, daily closing, and desktop parity.
7. Attach exact command results and runtime evidence to every PR.
8. Merge only after green CI and resolved release-blocking review comments.

## 5. Delivery phases

### Phase 0 — One source of truth and repository cleanup

- Merge PR #77, which installs this plan, `BUSINESS_MODEL.md`, and the new developer contract.
- Remove obsolete active planning/status documents.
- Keep PR #62 and PR #63 closed as superseded.
- Audit and remove generated or obsolete root debris: one-off shell patch scripts, tracked build metadata, stale beta ZIPs, and duplicate delivery documents.

**Exit criteria**

- Issue #76, this file, and `BUSINESS_MODEL.md` are the only active delivery authorities.
- No stale PR is presented as an execution branch.
- Repository root contains only maintained source, configuration, and operator documentation.

### Phase 1 — Data identity, safety, and unified persistence

- Migrate inventory and appointments into the canonical adapter without losing existing `lena_dresses` or `lena_appointments` data.
- Define one canonical operational collection registry.
- Register invoices, sale returns, appointments, service tasks, and all other UI-created entities.
- Use that registry for browser persistence, backup, restore, reset, Tauri snapshots, and integrity verification.
- Version the backup format and include IndexedDB image blobs.
- Make backup export/import asynchronous where image access requires it.
- Implement full compensation rollback for failed imports across both collections and images.
- Preserve compatibility with valid legacy collection-only backups and legacy detached keys.
- Remove automatic mock fallbacks from production startup.
- Add an explicit “Load demo data” operation with confirmation, audit entry, and reversible reset.
- Introduce immutable customer/item references while preserving display snapshots for historical documents.
- Replace reusable length-based inventory codes with a monotonic, collision-safe allocator.
- Replace hard deletion of referenced records with archive/inactive behavior.

**Required tests**

- Legacy inventory and appointments migrate exactly once without duplication.
- Inventory and appointment CRUD survive export/import, reset, and Tauri relaunch.
- Image blobs survive export/import.
- A forced image or collection restore failure restores the exact previous collections and images.
- Legacy backup import remains supported.
- Fresh production startup contains no fake data.
- Codes/barcodes remain unique after archive, deletion of unreferenced test data, reload, and migration.
- Historical reservations remain attached after customer phone or item display data changes.

**Exit criteria**

No supported operation can create data that is omitted from backup/restore or desktop persistence, and no historical relationship depends only on a mutable phone or code.

### Phase 2 — Atomic domain commands and financial correctness

Create transaction/compensation-safe domain commands for:

1. Reservation creation/cancellation.
2. Payment, refund, fee, adjustment, and deposit settlement.
3. Delivery and return with inventory state changes.
4. Sale invoice and sale-line return/refund.
5. Expense posting.
6. Daily close and reopen.
7. Audit entry committed with each business operation.

Unify direct sale as a one-line invoice convenience path. Route every physical rental or sale return through inspection/service before availability.

Separate financial meanings in reports:

- rental revenue;
- sale revenue;
- deposit liability collected/refunded/retained;
- fees;
- expenses;
- net cash movement;
- recognized item profitability.

Do not calculate item revenue from listed rental price on an unfulfilled booking.

Verify complete workflows rather than isolated screens:

- Inventory → customer → reservation → payment → delivery → return → deposit/fee settlement → inspection/service → reports → daily closing → audit.
- Invoice sale → collection → sold state → line return/refund → inspection → reports → daily closing → audit.
- Closed-day rejection and explicit reopen.
- Duplicate-submit/idempotency protection for every money-changing action.

**Required failure tests**

For each multi-module command, force failure after every write boundary and prove that all collections, item state, balances, and audit return to the exact previous snapshot.

**Exit criteria**

For the same scenario, money totals, liability, inventory state, customer/item history, audit, printed documents, reports, and daily closing all agree.

### Phase 3 — Selective recovery from PR #62

Evaluate and reintroduce only the useful capabilities that remain missing on current `main`:

- Reservation calendar.
- Printable rental contract.
- Service-task queue for inspection, laundry, tailoring, maintenance, and damage.
- Reachable sales ledger and sale-return history.
- Barcode label and lifecycle helpers not already replaced by the current inventory implementation.

Each accepted capability must:

- Follow `BUSINESS_MODEL.md` state transitions.
- Use current `inventory` naming and routes.
- Be reachable from current desktop and mobile navigation.
- Use the unified persistence registry and immutable references.
- Participate in backup, reset, desktop snapshot, integrity, reports, and audit.
- Include tests and current UI patterns.

**Exit criteria**

No old architecture, old route naming, detached collection, or unsafe status transition is reintroduced.

### Phase 4 — Runtime QA and release UX

Required runtime matrix:

- Desktop browser.
- Phone viewports at 390×844 and 360×740.
- Installable PWA with offline reload.
- Tauri Windows install, launch, relaunch, persistence, backup, restore, and printing.
- Real-device camera/barcode scan.
- Popup-blocked invoice and contract printing.
- Simulated storage quota failure and recovery at each atomic workflow boundary.
- Arabic RTL layout, keyboard focus, accessible labels, modal scrolling, and absence of horizontal page overflow.

Record for every run:

- Commit SHA.
- OS and browser/WebView version.
- Viewport or device.
- Expected and actual result.
- Screenshot or recording for failures.

**Exit criteria**

All core workflows pass on phone, desktop browser, and Windows desktop runtime with the same business result.

### Phase 5 — Release packaging and handover

- Produce a clean release candidate from current `main`.
- Add Windows Tauri build verification on a compatible runner.
- Verify PWA manifest, icons, caching, offline startup, and bundled Arabic font.
- Finalize installation, backup/recovery, upgrade, demo-data, and operator guides.
- Publish release notes with migrations, known limitations, and rollback instructions.
- Tag the release only after all gates pass.

**Exit criteria**

A new operator can install, start empty, optionally load demo data, operate, close the day, back up, restore, upgrade, and recover the shipped application using the maintained documentation.

## 6. Stop-the-line criteria

Block release only for:

- Data loss or corruption.
- Incorrect money, refund, deposit, fee, liability, profitability, or daily-closing calculations.
- Broken inventory, reservation, sale, delivery, return, inspection, or service workflow.
- Failed backup/restore or missing operational data from persistence.
- Application startup, installation, or core navigation failure.
- Critical security vulnerability.

Non-blocking cosmetic improvements are recorded for post-release and must not delay delivery.

## 7. Definition of done

LENA v1.0 is delivered only when:

- All phases are closed with linked PRs and green CI.
- All implemented behavior conforms to `BUSINESS_MODEL.md`.
- No operational data exists outside the unified persistence contract.
- Backup/restore includes inventory, appointments, invoices, returns, service tasks, audit, and images and survives induced failure without data loss.
- Production first run contains no fake operational records.
- Browser/PWA and Tauri Windows runtime evidence is attached.
- One final release note and one operator handover guide describe the shipped system exactly.
