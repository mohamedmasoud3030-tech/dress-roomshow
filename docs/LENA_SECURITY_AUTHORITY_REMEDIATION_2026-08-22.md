# LENA security authority remediation — 2026-08-22

This document is the security-review evidence for the authority remediation branch. It complements the original repository audit and the deployment runbook; it does not authorize a production deployment.

## Root causes

### Unsafe account bootstrap

`handle_new_auth_user` previously inferred authority from account creation order. With public Auth registration enabled, the first user in an empty profile table could receive an active admin profile.

### Full client-authored authoritative state

The browser previously sent a complete before/after snapshot to `apply_showroom_snapshot`. An active staff JWT could invoke the RPC directly and replace historical reservation, financial, inventory, and audit-bearing state without the normal command sequence.

### Schema deployment drift

The repository contained a public-profile migration, but the linked backend's anonymous endpoint returned `404 / PGRST205`. Source and deployed schema had diverged because no linked migration/status gate existed.

## Attack path before remediation

```text
active staff JWT
  → direct RPC apply_showroom_snapshot(expectedRevision, attackerSnapshot, ...)
  → PostgreSQL accepts replacement snapshot
  → historic operational/financial state can be changed outside the UI workflow
```

A clean disposable PostgreSQL regression reproduces the historical failure: a staff session changes a reservation rental value from `100` to `999` through the legacy full-snapshot RPC before the remediation migrations are applied.

## Enforcement after remediation

### Migration order

1. `0021_secure_account_bootstrap.sql`
2. `0022_constrain_authoritative_command_writes.sql`
3. `0023_repair_public_showroom_profile_projection.sql`
4. `0024_lock_legacy_authority_surfaces.sql`

### Account authority

- All trigger-created Auth profiles are inactive `staff`.
- `private.bootstrap_lena_owner(uuid)` is executable only by trusted database/service-role callers, serializes bootstrap attempts, is idempotent only for the selected owner, and rejects a competing owner.
- The last-active-admin trigger serializes demotion/deletion checks to prevent a two-admin race from leaving zero active administrators, including Auth-user cascade deletion.

### Command authority

- The legacy full-snapshot writer is revoked from browser roles and fails closed.
- Normal browser writes use `apply_showroom_command`, which receives an entity patch plus a named workflow command instead of a full snapshot.
- PostgreSQL reconstructs candidate state, checks command/collection scope, append-only history, payment type/direction/idempotency, reservation ledger reconciliation, inventory lifecycle, booking overlap/buffer rules, and server-owned audit creation.
- Critical delivery, return, sale, sale-return, expense, service, and daily-close commands require their linked operational evidence. A command name alone cannot be used to flip state.
- Explicit restore/reset remain separately named, active-admin-only recovery commands; they are not available to staff and are audited.
- Legacy normalized browser-write tables are revoked and their mutation policies removed.

### Public profile projection

- The public relation, policy, and sync trigger are repaired forward-only.
- Top-level fields, nested contact values, and every public content-card array are allowlisted field-by-field. Future fields inside a category, service, FAQ, step, or contact object are omitted until a reviewed migration explicitly projects them.

## Independent review findings fixed before PR

The final security review found and corrected these additional defects in the unmerged branch:

1. **Concurrent last-admin demotion race:** two admin updates on different rows could each observe the other as active. The trigger now takes an advisory transaction lock; the clean schema gate races two demotions and proves one fails.
2. **Insufficient command witnesses:** a caller could select a delivery/sale command name and attempt state changes without its related handover/invoice evidence. Critical command witnesses now require linked records and validate their relationships.
3. **Null/unknown financial type paths:** null SQL predicates could fail open in validations, and an unknown payment type was not explicitly rejected. Checks are now null-safe and type allowlisted.
4. **Nested public-profile leakage:** approved top-level array fields had copied nested objects wholesale. Arrays are now item-projected with explicit keys only.

## Validation evidence

- `npm run test:supabase-authority` passes against a fresh disposable PostgreSQL database.
  - It reproduces the pre-fix legacy bypass first.
  - It then validates the fixed schema: signup race, bootstrap denial, owner idempotency, competing owner rejection, last-admin cascade/race protection, full-snapshot denial, staff direct-API abuse cases, valid staff command flows, valid evidenced delivery and invoice sale flows, public projection filtering, and anonymous public read.
- `npm test`: 767 passing, 0 failed, 0 skipped.
- `npm run typecheck`: passed.
- `npm run lint`: passed.
- `npm run build`: passed; PWA precache generated.
- Playwright: 12 passing desktop/mobile checks.
- `npm audit --package-lock-only`: 0 vulnerabilities.
- `git diff --check`: passed.

## Production remains unchanged

No production migration, Auth setting, deployment, or Supabase data change has been performed from this branch.

The linked production checks remain expected blockers until the controlled deployment:

- public Auth sign-up must be disabled in Supabase Auth settings;
- the public-profile endpoint must stop returning `404 / PGRST205` after the migration chain is applied;
- the matching Web/PWA build and database migration must be released in a coordinated write-maintenance window so stale PWA tabs do not call the retired RPC.

## Deployment blockers

Follow [`SUPABASE_AUTHORITY_REMEDIATION_DEPLOYMENT.md`](SUPABASE_AUTHORITY_REMEDIATION_DEPLOYMENT.md) before any production action. Required evidence includes backup, linked migration status, SECURITY DEFINER owner verification, owner bootstrap confirmation if needed, Auth setting verification, direct-RPC denial checks, staff workflow smoke tests, and post-deploy public-profile smoke checks.

## Review status

The branch is suitable for a **draft security-review PR only**. It is not approval to merge, deploy, or change the linked Supabase project.
