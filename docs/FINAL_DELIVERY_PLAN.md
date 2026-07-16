# LENA v1.0 — Final Delivery Plan

> **Status:** Active source of truth  
> **Tracking issue:** #76  
> **Baseline:** `main@a5c277f93b011edba279248f35648049f107d416`

This document replaces every previous roadmap, audit plan, readiness-progress document, and stale delivery branch. Developers and agents must execute from the latest `main`, read issue #76, and use this file as the delivery contract.

## 1. Product boundary

LENA is an Arabic-first, RTL, local-first operations application for one showroom.

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

The baseline commit has a successful Vercel status. A fresh GitHub Verify run is still required for the release candidate.

## 3. Confirmed release blockers

### 3.1 Appointments are outside the persistence contract

`src/features/appointments/appointment.service.ts` writes directly to `localStorage` under `lena_appointments`. Appointment data is therefore outside registered collections, backup/restore, reset, and desktop snapshot coverage.

### 3.2 IndexedDB images are outside backup/restore

`LocalDatabaseBackup` currently exports collection arrays only. IndexedDB image blobs are not represented in the backup schema and cannot be restored with the rest of the operational state.

### 3.3 Empty installations fall back to fake operational data

Core services use mock collections when storage is empty. Production delivery must start with an empty workspace. Demo records may only be loaded through an explicit, reversible demo-data action.

### 3.4 The collection registry is incomplete

Every operational entity must use the same registry for backup, restore, reset, Tauri snapshots, and integrity checks. Appointments and any accepted service-task, sales-return, or related collections must not bypass that registry.

### 3.5 Historical branches cannot be merged directly

PR #62 and PR #63 are both 68 commits behind current `main`.

- PR #62 contains useful ideas and unmerged code, but it must be selectively rebuilt or cherry-picked after comparison with current architecture.
- PR #63 contains an obsolete agent/documentation framework and must not become the active source of truth.

## 4. Execution rules

1. Start every phase from the latest `main` after checking open PRs and CI.
2. Use one implementation branch and one PR per phase unless a blocker requires a smaller safety PR.
3. Never merge PR #62 or PR #63 wholesale.
4. Do not change money, settlement, inventory-state, backup, or migration behavior without regression tests.
5. Do not declare a feature complete merely because a page renders. Verify persistence, backup, reset, audit, reports, and desktop parity.
6. Attach exact command results and runtime evidence to every PR.
7. Merge only after green CI and resolved release-blocking review comments.

## 5. Delivery phases

### Phase 0 — One source of truth and repository cleanup

- Merge the documentation PR that installs this plan and updates `README.md` and `AGENTS.md`.
- Remove obsolete active planning/status documents.
- Close PR #62 and PR #63 as superseded after their relevant ideas are preserved in issue #76.
- Audit and remove generated or obsolete root debris: one-off shell patch scripts, tracked build metadata, stale beta ZIPs, and duplicate delivery documents.

**Exit criteria**

- Issue #76 and this file are the only active delivery plan.
- No stale PR is presented as an execution branch.
- Repository root contains only maintained source, configuration, and operator documentation.

### Phase 1 — Data safety and unified persistence

- Move appointments to the central database adapter.
- Define one canonical operational collection registry.
- Use that registry for browser persistence, backup, restore, reset, Tauri snapshots, and integrity verification.
- Version the backup format and include IndexedDB image blobs.
- Make backup export/import asynchronous where image access requires it.
- Implement full compensation rollback for failed imports across both collections and images.
- Preserve compatibility with valid legacy collection-only backups.
- Remove automatic mock fallbacks from production startup.
- Add an explicit “Load demo data” operation with confirmation, audit entry, and reversible reset.

**Required tests**

- Appointment create/update/delete survives export/import.
- Appointment data is included in reset and desktop snapshots.
- Image blobs survive export/import.
- A forced image restore failure restores the exact previous collections and images.
- Legacy backup import remains supported.
- Fresh production startup contains no fake data.

**Exit criteria**

No supported operation can create data that is omitted from backup/restore or desktop persistence.

### Phase 2 — End-to-end operational and financial correctness

Verify complete workflows rather than isolated screens:

1. Inventory → customer → reservation → payment → delivery → return → fees/deposit settlement → reports → daily closing → audit.
2. Direct sale → invoice → item return/refund → reports → daily closing → audit.
3. Expense creation, closed-day restrictions, and audit evidence.
4. Reservation cancellation/void behavior and inventory status restoration.
5. Duplicate-submit and idempotency protection for money-changing actions.
6. Reconciliation between operational records, reports, and daily closing.

Every rule correction requires a focused regression test.

**Exit criteria**

For the same scenario, money totals, inventory status, audit history, printed documents, reports, and daily closing all agree.

### Phase 3 — Selective recovery from PR #62

Evaluate and reintroduce only the useful capabilities that remain missing on current `main`:

- Reservation calendar.
- Printable rental contract.
- Service-task queue for laundry, tailoring, maintenance, and inspection.
- Reachable sales ledger and sale-return history.
- Barcode label and lifecycle helpers not already replaced by the current inventory implementation.

Each accepted capability must:

- Use current `inventory` naming and routes.
- Be reachable from current desktop and mobile navigation.
- Use the unified persistence registry.
- Participate in backup, reset, desktop snapshot, integrity, and audit.
- Include tests and current UI patterns.

**Exit criteria**

No old architecture, old route naming, or detached collection is reintroduced.

### Phase 4 — Runtime QA and release UX

Required runtime matrix:

- Desktop browser.
- Phone viewports at 390×844 and 360×740.
- Installable PWA with offline reload.
- Tauri Windows install, launch, relaunch, persistence, backup, restore, and printing.
- Real-device camera/barcode scan.
- Popup-blocked invoice and contract printing.
- Simulated storage quota failure and recovery.
- Arabic RTL layout, keyboard focus, accessible labels, modal scrolling, and absence of horizontal page overflow.

Record for every run:

- Commit SHA.
- OS and browser/WebView version.
- Viewport or device.
- Expected and actual result.
- Screenshot or recording for failures.

**Exit criteria**

All core workflows pass on phone, desktop browser, and Windows desktop runtime.

### Phase 5 — Release packaging and handover

- Produce a clean release candidate from current `main`.
- Add Windows Tauri build verification on a compatible runner.
- Verify PWA manifest, icons, caching, offline startup, and bundled Arabic font.
- Finalize installation, backup/recovery, upgrade, and operator guides.
- Publish release notes with migrations, known limitations, and rollback instructions.
- Tag the release only after all gates pass.

**Exit criteria**

A new operator can install, start, back up, restore, upgrade, and recover the shipped application using the maintained documentation.

## 6. Stop-the-line criteria

Block release only for:

- Data loss or corruption.
- Incorrect money, refund, deposit, fee, or daily-closing calculations.
- Broken inventory, reservation, sale, delivery, or return workflow.
- Failed backup/restore or missing operational data from persistence.
- Application startup, installation, or core navigation failure.
- Critical security vulnerability.

Non-blocking cosmetic improvements are recorded for post-release and must not delay delivery.

## 7. Definition of done

LENA v1.0 is delivered only when:

- All phases are closed with linked PRs and green CI.
- No operational data exists outside the unified persistence contract.
- Backup/restore includes images and survives induced failure without data loss.
- Production first run contains no fake operational records.
- Browser/PWA and Tauri Windows runtime evidence is attached.
- One final release note and one operator handover guide describe the shipped system exactly.
