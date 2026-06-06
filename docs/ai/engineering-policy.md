# Dress Roomshow Engineering Policy

## Source-first workflow

- Inspect the repository with `rg --files` and `rg` before editing.
- Confirm the active route, store, service, persistence adapter, test, and Tauri paths from actual code.
- Do not assume an archived file or earlier implementation is active.

## Change discipline

- Keep each change narrow and reversible.
- Preserve local-first behavior.
- Avoid broad refactors during bug fixes or sale-readiness work.
- Do not introduce cloud synchronization, multi-showroom behavior, or user-role systems unless explicitly approved.
- Do not delete storage, migration, backup, or audit code without proving it is unused.

## Persistence safety

- Treat browser storage, SQLite snapshots, migrations, import, export, and restore behavior as sensitive.
- Validate imported snapshots before replacing active state.
- Preserve backward compatibility where stored records already exist.
- Keep daily-closing calculations deterministic and auditable.

## UI quality

- Arabic RTL is the primary experience.
- Check desktop and mobile states for changed operational screens.
- Preserve PWA and Tauri behavior.

## Completion report

State the objective, exact files changed, behavior changed, persistence impact, tests run, failed checks or blockers, and commit SHA.