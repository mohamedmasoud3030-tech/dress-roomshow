# Authority surface remediation

This document records the authority boundary introduced by migrations `0021`–`0024`. It is an implementation inventory for the security remediation, not a replacement for the business model.

## Before

The browser command runner emitted an entire `before`/`after` local-storage snapshot:

```text
workflow command → publishShowroomCommandCommitted
→ CloudDataGate → apply_showroom_snapshot(expectedRevision, fullSnapshot, ...)
```

Any active staff session could call that RPC directly and replace the authoritative JSON state. The affected snapshot collections included:

| Domain | Collections previously replaceable by a full client snapshot |
| --- | --- |
| Inventory / booking | `dresses`, `dress-designs`, `accessories`, `reservation-accessories`, `reservations`, `appointments`, `service-tasks`, `waitlist`, `stocktake-sessions` |
| Finance | `payments`, `expenses`, `sales`, `sales-invoices`, `sale-returns`, `daily-closings` |
| Customer / control history | `customers`, `customer-conduct-notes`, `audit-log`, `audit`, `command-log`, `counters`, `retired-codes` |
| Owner configuration | `preferences`, `showroom-profile`, `print-settings`, `message-templates`, `operators` |

The legacy normalized tables (`dresses`, `customers`, `reservations`, `payments`, `returns`, `expenses`, and `dress_images`) also still had authenticated DML grants despite no longer being the Web/PWA source of truth.

## After

```text
workflow command → entity-only patch
→ apply_showroom_command(expectedRevision, commandName, idempotencyKey, patch)
→ PostgreSQL reconstructs candidate state, validates it, creates server audit
→ returned authoritative snapshot replaces browser cache
```

### Command boundary

`public.apply_showroom_command` is the only normal operational writer. It:

- requires an active authenticated profile;
- accepts a named command and entity upserts/deletes, never a whole client snapshot;
- only permits collections assigned to that command in `private.lena_command_collections`;
- rejects client-authored audit and command-log changes;
- preserves append-only financial/history collections;
- validates payment identity/type/direction/idempotency and reconciles touched reservation balances against the ledger;
- requires linked delivery, return, invoice-sale, sale-return, expense, service, and daily-close evidence for their named critical commands;
- rejects direct overlapping reservation intervals (including configured preparation/cleaning buffers);
- blocks immutable reservation identity/value rewrites after money posts;
- blocks inventory identity, price, and lifecycle-field rewrites outside the owning workflow, and blocks delivery/return/sale state changes under an unrelated command name;
- generates a server-attributed audit entry in the same transaction;
- uses revision locking and idempotency in `showroom_mutations`.

The historical `public.apply_showroom_snapshot` function remains only as a fail-closed compatibility stub. It has no `anon`, `authenticated`, or `service_role` execute grant and raises `LENA_LEGACY_SNAPSHOT_WRITE_DISABLED` if a privileged caller reaches it.

### Role boundary

| Surface | Normal active staff | Active admin | Infrastructure / trusted database |
| --- | ---: | ---: | ---: |
| `apply_showroom_command` domain commands | Allowed only through command/invariant checks | Same checks; owner-only configuration commands additionally allowed | N/A |
| Full snapshot RPC | Denied | Denied | Disabled, not a recovery path |
| Explicit backup restore / reset | Denied | Allowed only through named recovery RPCs | Controlled database recovery path |
| Profile privilege changes | Cannot self-promote/deactivate | Allowed, but cannot remove the final active admin | Can recover owner only through private bootstrap |
| `private.bootstrap_lena_owner(uuid)` | Denied | Denied through normal API role | `postgres` / `service_role` only |
| Legacy normalized operational tables | Denied | Denied through browser role | Retained for controlled migration/maintenance only |
| `client_error_events` telemetry | Own insert only | Admin read | N/A |
| Public catalogue/profile projections | Read only where policy allows | Read only through projection | Maintained by trusted database triggers |

The application is single-showroom by design. There is one state row (`id = 'main'`) and no tenant identifier supplied by a caller, so there is no cross-tenant routing surface. Infrastructure credentials (`service_role`/database owner) remain intentionally powerful and must never appear in browser code or logs.

## Security-definer / trigger inventory

| Function or trigger | Authority | Normal API access |
| --- | --- | --- |
| `private.is_active_lena_user`, `private.is_lena_admin` | RLS predicates | Execute needed by authenticated RLS policies; no mutation capability |
| `public.handle_new_auth_user` | Auth-user trigger creates inactive staff profile | Trigger only; normal execute revoked |
| `private.bootstrap_lena_owner` | One-owner bootstrap/recovery | `postgres` / `service_role` only |
| `private.protect_profile_privileges` | Profile privilege trigger | Trigger only |
| `private.prevent_last_active_lena_admin_loss` | Last-admin trigger | Trigger only |
| `private.validate_showroom_snapshot` | Snapshot structural trigger | Trigger only |
| `private.sync_showroom_public_profile` | Public allowlisted projection trigger | Trigger only |
| `private.lena_*` patch helpers | Command validation/apply/audit helpers | Normal execute revoked |
| `public.apply_showroom_command` | Authoritative domain command boundary | Active authenticated profile only |
| `public.restore_showroom_backup`, `public.reset_showroom_state` | Explicit admin recovery commands | Authenticated entry point; database rejects non-admins |
| `public.apply_showroom_snapshot` | Legacy writer | Disabled/no browser-role grant |

## Verification

- `tests/fixtures/supabase-legacy-snapshot-bypass-proof.sql` reproduces the old staff full-snapshot mutation in a disposable pre-fix schema.
- `tests/fixtures/supabase-authority-regression.sql` proves the fixed clean schema blocks unauthorised bootstrap, self-promotion, legacy full snapshots, posted-reservation rewrites, forged unreconciled payments, inventory-price rewrites, staff configuration writes, and legacy table DML; it also proves valid staff command flow and legitimate admin configuration flow. The clean-schema runner creates two simultaneous pre-owner Auth users before this fixture, proving neither can win a first-admin race.
- `scripts/verify-clean-supabase-schema.sh` runs both fixtures from a clean PostgreSQL database and exercises two concurrent final-admin demotions, proving one is rejected after the invariant lock is acquired.
- `tests/authority-surface-security.test.mjs` ensures every literal workflow command is present in the database command allowlist and checks the final grants/disabled legacy writer.

## Remaining role-model limitation

A staff role is still trusted to enter a **valid** operational command such as a payment or expense, just as it can through the approved UI. The database now prevents direct calls from bypassing the same state, ledger, lifecycle, and audit invariants; it cannot determine whether cash was physically received. If the showroom requires maker/checker approval for money entry, that is a separate product policy requiring a second approval role and workflow—not an API authorization shortcut.
