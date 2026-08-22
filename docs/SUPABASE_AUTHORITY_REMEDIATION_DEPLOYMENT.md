# Supabase authority-remediation deployment

This runbook deploys the forward-only migrations added for the confirmed authority and schema-drift findings:

- `0021_secure_account_bootstrap.sql` — new Auth users are inactive staff; only a trusted private bootstrap function can establish/recover the owner; the last active admin is protected.
- `0022_constrain_authoritative_command_writes.sql` — disables the full client-authored snapshot writer and replaces it with the server-validated command-patch boundary.
- `0023_repair_public_showroom_profile_projection.sql` — recreates/repairs the public profile relation and uses an allowlisted public projection.
- `0024_lock_legacy_authority_surfaces.sql` — removes browser-role DML from compatibility tables that are no longer the Web/PWA source of truth.

## Preconditions

1. Take a verified backup and record the current migration status.
2. Confirm the intended owner already has an Auth user ID. Do **not** use a normal browser user as a bootstrap identity by guesswork.
3. Use a trusted Supabase CLI/service-role deployment environment. Do not paste individual migration statements into the dashboard SQL editor and do not alter historical migration files.
4. Disable public Auth sign-up in the Supabase Auth project before or during the change window. Migration 0021 is safe even if this setting is missed, but disabling sign-up removes unnecessary account creation and spam.
5. Plan a short coordinated write-maintenance window. Migration 0022 disables the old browser RPC while the new frontend calls the command RPC; stale PWA/browser tabs must be refreshed before writes resume. Do not apply the database migration while treating an older production bundle as write-compatible.

## Controlled deployment

Use the deployment secret manager/CI environment, not browser-visible `VITE_*` values:

```bash
npx supabase link --project-ref "$SUPABASE_PROJECT_REF"
npx supabase migration list --linked
npx supabase db push
npx supabase migration list --linked
```

The final linked migration list must include `0021`, `0022`, `0023`, and `0024`.

Before enabling operational writes, run this **read-only** verification through the trusted deployment connection and require every returned owner to be `postgres` (or the explicitly approved database migration owner):

```sql
select n.nspname, p.proname, pg_get_function_identity_arguments(p.oid),
       pg_get_userbyid(p.proowner) as owner
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname in ('public', 'private')
  and p.prosecdef
order by n.nspname, p.proname;
```

## Owner bootstrap/recovery

Migration 0021 intentionally creates no admin from normal sign-up. If the project has no active owner after deployment, invoke the trusted private function from the controlled database/service-role path with the verified Auth user UUID:

```sql
select private.bootstrap_lena_owner('<verified-auth-user-uuid>'::uuid);
```

This function is not executable by `anon` or `authenticated` roles. It serializes attempts, is idempotent for the already-selected owner, and rejects a competing owner while an active admin exists.

## Required post-deploy proof

1. Deploy the matching Web/PWA build, ask every active device to refresh, and verify no stale client is still attempting `apply_showroom_snapshot`.
2. Sign in as the intended owner and confirm the account is active admin.
3. Sign in as an approved staff user; run one valid inventory/customer/reservation/payment workflow and confirm the server-generated audit entry appears.
4. Confirm a direct call to legacy `apply_showroom_snapshot` is denied.
5. Confirm a staff user cannot modify a posted reservation value, append an unreconciled financial movement, or change settings by calling the data API directly.
6. Run the read-only deployment smoke checks using deployment-managed variables:

```bash
npm run verify:deployed-auth-hardening
npm run verify:deployed-public-profile
```

The first must confirm that public Auth sign-up is disabled. The second must report HTTP 200 and one `main` public projection row. Neither command prints profile values or credentials.

## Rollback and recovery

These migrations are forward-only security changes. Do not delete migration records or rewrite earlier SQL. If an operational command is rejected after deployment, stop write operations, retain the database backup, inspect the rejected command/audit record, and ship a reviewed forward migration that preserves the new authority boundary. Do not re-grant the disabled full-snapshot RPC as an emergency workaround.
