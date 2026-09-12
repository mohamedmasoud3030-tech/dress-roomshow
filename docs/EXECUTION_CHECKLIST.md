## Security authority remediation (2026-08-22, owner-directed stop-line)

- [x] **SEC-01:** Secure account bootstrap, authoritative write boundary, and deployed public-profile schema drift.
  - Scope was bounded to audit findings A-01, A-02, and A-03: migrations `0021`–`0024`, cloud command transport, authority/migration regression fixtures, deployment verification, and no unrelated product redesign.
  - Local evidence: complete Web/PWA gate plus `npm run test:supabase-authority` against a clean disposable PostgreSQL database (see prior session entries).
  - **Live-deployment verification completed 2026-09-12** directly against the linked Supabase project `ktmizdznbdwvalmmfvfc` (read-only SQL inspection, no schema changes made — none were needed):
    - `select version from supabase_migrations.schema_migrations` confirms `0001`–`0033` all applied, including `0019` (audit append-only + snapshot validation) and `0021`–`0024` (the SEC-01 authority migrations).
    - `apply_showroom_snapshot` (the pre-fix legacy RPC) is confirmed live-disabled: its body unconditionally raises `LENA_LEGACY_SNAPSHOT_WRITE_DISABLED`.
    - `handle_new_auth_user` is confirmed live-fixed: new Auth users get `profiles.role='staff', is_active=false` — no order-of-signup admin grant.
    - `claim_first_owner` is confirmed admin-uniqueness-locked (`pg_advisory_xact_lock` + `for update` check for an existing active admin) and requires `auth.uid()` to be non-null.
    - `apply_showroom_command`, `reset_showroom_state`, `restore_showroom_backup` all gate internally on `private.is_active_lena_user()` / `private.is_lena_admin()`, plus idempotency keys and a 20MiB payload cap — the authority boundary is enforced in the function body, not left to obscurity.
    - `Supabase:get_advisors` (security) shows only INFO/WARN "SECURITY DEFINER is publicly callable" notices on functions that already self-gate internally (see above) — no unmitigated live exposure.
  - **Still owner-only, not resolvable from this workspace:** the Auth dashboard's public-signup toggle has no MCP/API surface here; `claim_first_owner`'s admin-uniqueness lock and `handle_new_auth_user`'s inactive-by-default profile already contain the practical risk regardless of that toggle's state, but flipping it off remains a recommended owner action.
- [x] **Executed in place of the deployment runbook:** since the migrations were already live, the runbook's remaining steps (`verify:deployed-auth-hardening`, `verify:deployed-public-profile`) are effectively superseded by the direct inspection above; no further migration deployment is outstanding.
