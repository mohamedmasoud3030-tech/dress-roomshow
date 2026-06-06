# Dress Roomshow Agent Instructions

## Read before editing

1. `README.md`
2. `docs/ai/README.md`
3. `docs/ai/product-scope.md`
4. `docs/ai/domain-rules.md`
5. `docs/ai/engineering-policy.md`
6. `docs/ai/release-policy.md`
7. `.ai/workflows/README.md`

Inspect the repository with `rg --files` and `rg` before changing code. Use the active code as the source of truth.

## Product boundary

This is a local-first, single-showroom Arabic RTL application for dress inventory, customers, reservations, delivery, return, payments, expenses, daily closing, reports, backup, and audit history.

Do not add multi-showroom SaaS behavior, cloud synchronization, user roles, or unrelated features unless explicitly approved.

## Working rules

- Preserve local-first behavior for web, PWA, and Tauri builds.
- Protect reservation overlap rules, deposit settlement, penalties, daily closing, and backup restoration.
- Keep changes narrow and reversible.
- Add focused tests for changed business rules.
- Run the verification commands in `docs/ai/release-policy.md` before handoff.
