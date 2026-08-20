# Migration 0019 — Supervised Application Runbook (A1 + A2)

**Date prepared:** 2026-08-20 · **Checkpoint commit:** `6ebc3dc` (green gate 757/757 · typecheck · lint · build)
**Finding IDs:** A1 = DEF-004 ∪ FC-13 (audit append-only) · A2 = DEF-005 ∪ FC-12 (server-side payload validation)
**Project:** `ktmizdznbdwvalmmfvfc.supabase.co` · **Migration file:** `supabase/migrations/0019_audit_and_snapshot_validation.sql`

> This runbook is the execution instrument for the owner's supervised-apply decision.
> The sandbox cannot reach Supabase (TLS blocked, verified 2026-08-20) and the project has
> no CLI/CI migrator — the established path is: owner runs the migration file verbatim in
> Supabase Dashboard → SQL Editor. This file walks that session step by step.

---

## 1. Exactly what 0019 executes (full scope, nothing else)

The file contains exactly three units:

| # | Unit | Purpose | Finding |
|---|------|---------|---------|
| U1 | `do $$ … $$` block: reads `pg_get_functiondef` of `public.apply_showroom_snapshot(bigint,jsonb,text,text)` and string-replaces the append-only guard list `payments, expenses, sales, sales-invoices, sale-returns, daily-closings` → adds **`audit-log`, `audit`**. **Fails closed** with `LENA_APPLY_SNAPSHOT_DEFINITION_UNEXPECTED` if the live definition matches neither list (drift safety). | Restores append-only protection for the audit collections on non-admin commits | A1 |
| U2 | `create or replace function private.validate_showroom_snapshot()` + `revoke` + `drop trigger if exists` / `create trigger showroom_state_validate_snapshot before insert or update of snapshot on public.showroom_state`. Validates: envelope (`applicationId='dress-roomshow'`, collections object), 16 collections present as arrays of objects with unique non-empty `id`, and financial invariants (payments: reservationNumber/type/direction ∈ {income,refund,settlement}/amount > 0; expenses, sales, reservations: dates, amounts, status enum, remainingAmount ≥ 0). Error codes `22023`/`23505` with `LENA_INVALID_*` messages. | Server rejects malformed financial payloads at the authoritative boundary | A2 |
| U3 | `revoke all on function public.apply_showroom_snapshot(bigint,jsonb,text,text) from public, anon; grant execute … to authenticated;` | Closes anonymous reachability of the state-mutation RPC | A1 |

**Nothing else is touched.** No other table, view, policy, index, or function. No data is read into the migration, rewritten, or moved.

## 2. Destructive-operation scan (performed 2026-08-20, whole file read)

- `DROP TABLE` / `DELETE FROM` / `TRUNCATE` / `ALTER … DROP` / data rewrite: **none**.
- Only `drop trigger if exists showroom_state_validate_snapshot` — that trigger is **0019's own object**, re-created on the next line; it cannot exist before 0019.
- Grants/revokes affect execute privilege of the RPC only; reversible by re-granting.
- Re-runnable safely (idempotent): U1 no-ops once the hardened list is present; U2 uses create-or-replace; U3 revoke/grant is convergent.
- **Deletes zero rows. M4 is not involved.** Rollback procedure in §6.

## 3. Static pre-flight already verified from the repository (2026-08-20)

- `private` schema exists (created in migration 0011; used by 0016/0018/0020).
- RPC signature in 0016 is exactly `(bigint, jsonb, text, text)` — matches 0019's `regprocedure` cast.
- The literal append-only list in the 0016 function body (lines 372–373) matches 0019's expected `current_list` byte-for-byte including indentation → the fail-closed string match will succeed **if no drift occurred on the live project** (Phase 1 confirms this on the live DB).
- `showroom_state` is a single-row table keyed by `id = 'main'`; the RPC requires an authenticated active user (`LENA_AUTH_REQUIRED` when `auth.uid()` is null) → the A1 proof probe must emulate an authenticated non-admin session (§5, P-A1).
- `private.is_lena_admin()` is null-safe (looks up `auth.uid()` in `public.profiles`).
- Client-visible schema is unchanged (same table, same RPC signature) → **no frontend deploy is required**; contract is pinned by suites `cloud-timeout`, `snapshot-size-guard`, `cloud-source-of-truth`.

## 4. Phase 0 — Recovery position (recovery only, never a risk license)

Per the owner's standing rule: backups exist for recovery and are **not** a justification for risk. 0019 deletes nothing.

1. In the app, as admin, open the dashboard card «النسخ الاحتياطية السحابية» (M1) and confirm a recent **cloud backup copy** exists (copies are also made automatically at daily close). If none exists, create one from the card before continuing.
2. That is all. Do not export-then-delete anything; there is no deletion step anywhere in this runbook.

## 5. Live session steps

Where: Supabase Dashboard → project `ktmizdznbdwvalmmfvfc` → **SQL Editor** → new query per phase. Paste **results back to the agent** (or screenshot) after each phase.

### Phase 1 — Pre-flight on the live project (answers the owner's inspection questions)

**Q1.1 — migration history exists at all?**
```sql
select to_regclass('supabase_migrations.schema_migrations') as migrations_table;
```
- `null` → migrations were applied manually (expected for this project); skip Q1.2.
- Not null → run Q1.2.

**Q1.2 — last applied migrations (expect: no `0019` row):**
```sql
select version, name from supabase_migrations.schema_migrations
order by version desc limit 8;
```

**Q1.3 — live state of the RPC body (drift check):**
```sql
select case
  when position('''audit-log'', ''audit''' in
       pg_get_functiondef('public.apply_showroom_snapshot(bigint,jsonb,text,text)'::regprocedure)) > 0
    then 'ALREADY_HARDENED'
  when position('daily-closings' in
       pg_get_functiondef('public.apply_showroom_snapshot(bigint,jsonb,text,text)'::regprocedure)) > 0
    then 'READY_FOR_0019'
  else 'DRIFTED_STOP'
end as function_state;
```
- `READY_FOR_0019` → 0019 genuinely **not applied**, continue.
- `ALREADY_HARDENED` → 0019 was applied earlier; skip to Phase 3 proofs.
- `DRIFTED_STOP` → **stop**, send the output of
  `select pg_get_functiondef('public.apply_showroom_snapshot(bigint,jsonb,text,text)'::regprocedure);`

**Q1.4 — trigger must not exist yet:**
```sql
select tgname from pg_trigger
where tgrelid = 'public.showroom_state'::regclass and not tgisinternal;
```
Expect: no row named `showroom_state_validate_snapshot`.

**Q1.5 — baseline health (record values):**
```sql
select revision, octet_length(snapshot::text) as bytes, updated_at
from public.showroom_state where id = 'main';
```

### Phase 2 — Apply (from the official migrations record)

Run the **entire verbatim content** of `supabase/migrations/0019_audit_and_snapshot_validation.sql` as one query.

- Success = no error returned.
- If `LENA_APPLY_SNAPSHOT_DEFINITION_UNEXPECTED`: the migration **aborted atomically by design** (fail-closed; nothing changed). Stop and report — drift was detected.

### Phase 3 — Proof on the real project

**P0 — application state:** re-run Q1.3 (expect `ALREADY_HARDENED`) and Q1.4 (expect `showroom_state_validate_snapshot` present). Re-run Q1.5: `revision`/`bytes` must be **unchanged** (0019 writes no data).

**P-A1 — audit append-only (forbidden path now refuses):**

First get a non-admin active staff id:
```sql
select id, role from public.profiles where is_active and role <> 'admin' limit 1;
```
Then (replace `<STAFF_UUID>`):
```sql
begin;
set local role authenticated;
set local request.jwt.claims = json_build_object('sub','<STAFF_UUID>','role','authenticated')::text;
select * from public.apply_showroom_snapshot(
  (select revision from public.showroom_state where id = 'main'),
  jsonb_set((select snapshot from public.showroom_state where id = 'main'),
            '{collections,audit-log}', '[]'::jsonb),
  'a1-probe-0019-verify',
  'a1-proof-probe'
);
rollback;
```
**Expected:** `ERROR 42501 ... LENA_APPEND_ONLY_VIOLATION` — the tampered commit (audit-log emptied) is rejected and, with `rollback`, nothing can persist.
(If your Supabase build reads the older single-claim setting instead, use
`set local "request.jwt.claim.sub" = '<STAFF_UUID>';` — try the JSON form first.)

**P-A2a — malformed financial payload rejected:**
```sql
begin;
update public.showroom_state
set snapshot = jsonb_set(snapshot, '{collections,payments}', '[{"id":"a2-probe"}]'::jsonb)
where id = 'main';
rollback;
```
**Expected:** `ERROR 22023 ... LENA_INVALID_PAYMENT`.

**P-A2b — valid live data accepted (also a production data-health signal):**
```sql
update public.showroom_state set snapshot = snapshot where id = 'main';
```
**Expected:** `UPDATE 1` — the real production snapshot passes the new validator untouched.

**P-RLS — core paths still work:**
- Logged-out browser → landing page still lists dresses (public read path from 0013/0020).
- Staff login on a real device → any normal save / daily close → cloud commit succeeds (same RPC, same schema; the app needs no redeploy).
- Admin login → dashboard loads normally.

**Frontend compatibility:** no schema or signature change visible to the client; the client already sends full well-formed snapshots. P-RLS above doubles as the compatibility check.

## 6. Rollback (only if a Phase-3 proof misbehaves unexpectedly)

```sql
drop trigger if exists showroom_state_validate_snapshot on public.showroom_state;
drop function if exists private.validate_showroom_snapshot();
-- then re-run only the `create or replace function public.apply_showroom_snapshot(...)`
-- block copied from supabase/migrations/0016_centralized_showroom_state.sql
```
This restores the exact pre-0019 state. (The U3 grant tightening is harmless; re-grant to anon only if some unforeseen consumer appears — none is expected.)

## 7. Sign-off

When P0, P-A1, P-A2a, P-A2b, P-RLS all show the expected results:

- Record the application date in `REMEDIATION_PLAN.md` rows **A1** and **A2** and flip both to **VERIFIED COMPLETE** (evidence: this session's pasted outputs).
- Only then proceed to **M10** (real-device session) as an independent stage.
