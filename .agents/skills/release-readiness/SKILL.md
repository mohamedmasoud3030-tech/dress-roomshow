---
name: release-readiness
description: Define the evidence required before any LENA feature, fix, phase, desktop build, or release candidate is called complete.
---

# Release Readiness

## Use this skill when

An agent is about to claim that a feature, fix, refactor, delivery phase, PR, desktop package, PWA build, or release candidate is complete, verified, ready to merge, or ready to ship.

## Required baseline

Start from the latest `main`, inspect open PRs and current CI, then run:

```bash
npm ci
npm test
npm run typecheck
npm run lint
npm run build
```

Report exact commands and exact results. A skipped, unavailable, or environment-blocked check is not a pass.

## Risk-based verification

Select every applicable verification area:

- **domain:** full happy path and blocked/edge transitions;
- **data:** migration, rollback, backup/restore, reset, relaunch, and image assets;
- **financial:** source-to-report reconciliation and daily close;
- **UI:** phone, tablet, desktop, RTL, keyboard, failure and retry states;
- **PWA:** install/startup, offline expectations, refresh, and persisted data;
- **Tauri:** compatible native build, install/startup, filesystem/storage behavior, and relaunch;
- **hardware/output:** camera/barcode fallback and print/PDF output when affected.

For Tauri-impacting changes, `tauri -- info` is environment information only. It is not native build evidence.

## Operational smoke path

When the affected scope permits, verify a connected showroom journey with fresh data:

1. create a customer and inventory item;
2. create and confirm a reservation;
3. record required payment/deposit;
4. deliver the item;
5. return it with inspection/service routing;
6. settle refund, retention, or fees;
7. verify histories, audit, daily close, and reports;
8. export backup, reset, restore, and relaunch;
9. verify the restored records and images.

Add the sales equivalent when sales are affected.

## Evidence standard

A completion report must include:

- changed scope and excluded scope;
- tests added or updated;
- command results;
- runtime scenarios and viewports/platforms tested;
- data migration/rollback evidence where applicable;
- known limitations that remain outside the acceptance criteria;
- links to the active issue and PR.

Do not use phrases such as "fully complete," "100% safe," or "production ready" without the corresponding evidence.

## Stop-the-line blockers

Do not merge or release with:

- data loss, corruption, or incomplete restore;
- incorrect balances, liabilities, profitability, or daily close;
- broken inventory, reservation, sale, delivery, return, or service workflow;
- failed startup, install, core navigation, or native packaging;
- a critical security issue.

Record cosmetic refinements and non-blocking polish for post-release rather than expanding the active phase.

## Completion rule

A task is complete only when its acceptance criteria, mandatory checks, relevant runtime matrix, failure-path tests, and evidence are all present and consistent with the final delivery plan.
