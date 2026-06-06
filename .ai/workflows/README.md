# Dress Roomshow Agent Workflows

Choose one workflow before editing. Keep every task narrow and reviewable.

## Repository audit

1. Inspect the repository with `rg --files` and `rg`.
2. Map routes, stores, persistence adapters, migrations, tests, PWA files, and Tauri files.
3. Classify findings as blocker, safe cleanup, restore candidate, deferred item, or verified healthy area.
4. Do not add features or delete risky files.
5. Run the applicable verification commands and report exact blockers.

## Safe bug fix

1. Trace the defect from actual code.
2. Identify the smallest root cause.
3. Modify the narrowest safe surface.
4. Add or update a focused regression test.
5. Run targeted tests, then the relevant release gate.
6. Review the final diff for unrelated changes.

## Reservation or return change

1. Read `docs/ai/domain-rules.md`.
2. Trace availability, preparation-window, delivery, return, penalty, and settlement behavior from actual code.
3. Preserve audit history and local-first persistence.
4. Add business-rule tests for the affected path.
5. Check Arabic RTL and mobile behavior on changed screens.

## Storage or backup change

1. Inspect browser-storage and Tauri SQLite paths.
2. Identify snapshot versioning and restore validation behavior.
3. Keep migrations backward-aware.
4. Validate import and restore before replacing active local state.
5. Add tests for the affected migration or restore path.

## Release check

1. Read `docs/ai/release-policy.md`.
2. Run the full gate.
3. Review web, PWA, Tauri, RTL, mobile, reservation, settlement, and storage behavior affected by the change.
4. Return exact results, blockers, changed files, and commit SHA.