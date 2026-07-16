# LENA Developer Contract

## Sources of truth

Before changing code, read in this order:

1. `docs/BUSINESS_MODEL.md`
2. `docs/FINAL_DELIVERY_PLAN.md`
3. GitHub issue #76
4. `.agents/skills/README.md` and every skill matching the task
5. The current code and tests on the latest `main`

Do not execute work from historical roadmaps, audit plans, readiness-progress files, PR #62, or PR #63. PR #62 may be used only as a reference for selective reimplementation after comparison with current `main`; never merge it wholesale.

## Agent skills

The repository has exactly five focused skills under `.agents/skills/`. They cover showroom workflows, local data safety, financial correctness, Arabic mobile UI, and release readiness.

- Read the index before editing.
- Apply every matching skill when work crosses domains.
- Do not install or copy broad skill packs into the repository.
- Extend the existing owning skill instead of creating duplicate instructions.
- When no skill matches, follow this contract and the two source-of-truth documents; do not invent a new workflow.

## System-level reasoning

Treat LENA as one connected showroom operating system, not a set of independent pages. Every change must preserve consistency between:

- inventory physical state;
- customer and reservation history;
- payments, deposits, fees, refunds, sales, and expenses;
- delivery, return, inspection, and service work;
- reports and daily closing;
- audit, backup/restore, reset, and Tauri relaunch.

Do not call a workflow complete when only its UI or first collection write succeeds.

## Required workflow

1. Start from the latest `main` and inspect open PRs and CI.
2. Confirm the active phase and its exit criteria in `docs/FINAL_DELIVERY_PLAN.md`.
3. Confirm the relevant state transitions and financial meanings in `docs/BUSINESS_MODEL.md`.
4. Select and apply the matching repository skills.
5. Inspect real code and tests before trusting documentation or old PR descriptions.
6. Keep each phase in its own branch and PR unless a smaller safety PR is required.
7. Preserve local-first, single-showroom, Arabic RTL behavior.
8. Do not introduce SaaS tenancy, multi-device sync, online payment, roles, or auth during v1.0 delivery.
9. Add regression tests for every money, liability, settlement, inventory-state, identity, backup, migration, or persistence change.
10. Verify that every operational entity participates in backup, restore, reset, Tauri snapshots, integrity checks, reports, and audit where applicable.
11. Multi-collection commands must be atomic or restore the exact previous snapshot after any forced failure.

## Mandatory checks

Run before opening or updating an implementation PR:

```bash
npm ci
npm test
npm run typecheck
npm run lint
npm run build
```

For Tauri-impacting changes, also run the compatible desktop checks and attach the exact result. Do not report a native build as passed when only `tauri -- info` was run.

## Business invariants

- Inventory IDs are immutable; codes and barcodes are unique and never reused.
- Historical records keep stable IDs plus display snapshots.
- Referenced inventory/customers are archived, not hard-deleted.
- Reservation availability is date-derived and separate from physical item state.
- Financial movements are append-only; corrections use linked adjustments/refunds.
- Deposits are liabilities until refunded or retained; they are not rental revenue.
- Sale return and rental return route through inspection/service before availability.
- Audit commits with the business operation.
- Production first run is empty unless demo data is explicitly loaded.

## Release discipline

Stop the line only for data loss/corruption, incorrect financial results, broken core operations, failed backup/restore, startup/install failure, inaccessible core navigation, or a critical security issue. Record cosmetic refinements for post-release instead of delaying delivery.

## Repository exploration

Use Graphify first when `graphify-out/graph.json` and `graphify-out/GRAPH_REPORT.md` exist and the CLI is available. Otherwise continue with normal targeted inspection (`rg`, file reads, tests) without blocking execution.
