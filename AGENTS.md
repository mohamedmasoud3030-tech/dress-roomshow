# LENA Developer Contract

## Source of truth

Before changing code, read:

1. `docs/FINAL_DELIVERY_PLAN.md`
2. GitHub issue #76
3. The current code on the latest `main`

Do not execute work from historical roadmaps, audit plans, readiness-progress files, PR #62, or PR #63. PR #62 may be used only as a reference for selective reimplementation after comparison with current `main`; never merge it wholesale.

## Required workflow

1. Start from the latest `main` and inspect open PRs and CI.
2. Confirm the active phase and its exit criteria in `docs/FINAL_DELIVERY_PLAN.md`.
3. Inspect real code and tests before trusting documentation or old PR descriptions.
4. Keep each phase in its own branch and PR unless a smaller safety PR is required.
5. Preserve local-first, single-showroom, Arabic RTL behavior.
6. Do not introduce SaaS tenancy, multi-device sync, online payment, roles, or auth during v1.0 delivery.
7. Add regression tests for every money, settlement, inventory-state, backup, migration, or persistence change.
8. Verify that every operational entity participates in backup, restore, reset, Tauri snapshots, integrity checks, and audit where applicable.

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

## Release discipline

Stop the line only for data loss/corruption, incorrect financial results, broken core operations, failed backup/restore, startup/install failure, inaccessible core navigation, or a critical security issue. Record cosmetic refinements for post-release instead of delaying delivery.

## Repository exploration

Use Graphify first when `graphify-out/graph.json` and `graphify-out/GRAPH_REPORT.md` exist and the CLI is available. Otherwise continue with normal targeted inspection (`rg`, file reads, tests) without blocking execution.
