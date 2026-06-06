# Dress Roomshow Release Policy

Use this checklist before declaring a change ready to merge.

## Scope gate

- Keep the change inside the approved single-showroom objective.
- Do not introduce cloud synchronization, multi-showroom behavior, user roles, or unrelated features.
- Preserve local-first operation across web, PWA, and Tauri builds.

## Domain gate

- Re-check the affected rules in `domain-rules.md`.
- Preserve reservation overlap prevention and preparation windows.
- Preserve explicit delivery, return, penalty, deposit, and settlement history.
- Preserve deterministic daily-closing totals.
- Review storage migration and restore behavior when local persistence changes.

## UI gate

- Check Arabic RTL behavior on affected screens.
- Check desktop and mobile layouts.
- Confirm PWA and Tauri behavior are not regressed.

## Verification gate

Run:

```bash
npm test
npm run lint
npm run build
npm run tauri -- info
```

Use targeted test commands during implementation when useful.

## Completion report

State the objective, exact files changed, behavior changed, persistence impact, tests run, failed checks or blockers, final diff review notes, and commit SHA.