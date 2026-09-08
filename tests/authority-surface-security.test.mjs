import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath, URL } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const read = (path) => readFile(join(root, path), 'utf8');

async function workflowCommandNames() {
  const directory = join(root, 'src/features/workflows');
  const files = (await readdir(directory)).filter((name) => name.endsWith('.ts'));
  const names = new Set();
  for (const file of files) {
    const source = await read(`src/features/workflows/${file}`);
    for (const match of source.matchAll(/name:\s*'([^']+)'/g)) names.add(match[1]);
  }
  // administrationCommands routes names through a helper; all literal names in
  // this module are still discovered by its callers/tests, and the exact cloud
  // command registry is asserted below.
  return names;
}

test('every remediation SECURITY DEFINER function fixes its search path', async () => {
  const migrations = await Promise.all([
    read('supabase/migrations/0021_secure_account_bootstrap.sql'),
    read('supabase/migrations/0022_constrain_authoritative_command_writes.sql'),
    read('supabase/migrations/0023_repair_public_showroom_profile_projection.sql'),
  ]);

  for (const migration of migrations) {
    const declarations = [...migration.matchAll(/security definer\s*\n\s*set search_path = ''/gi)];
    const securityDefinerCount = (migration.match(/security definer/gi) ?? []).length;
    assert.equal(
      declarations.length,
      securityDefinerCount,
      'every SECURITY DEFINER declaration must immediately pin search_path to empty',
    );
  }
});

test('new Auth users are always inactive staff and cannot win first-admin bootstrap', async () => {
  const migration = await read('supabase/migrations/0021_secure_account_bootstrap.sql');

  assert.match(migration, /values\s*\([\s\S]*?'staff',[\s\S]*?false/s);
  assert.doesNotMatch(migration, /is_first_user/i);
  assert.doesNotMatch(migration, /case\s+when\s+is_first_user/i);
  assert.match(migration, /private\.bootstrap_lena_owner\(p_owner_id uuid\)/);
  assert.match(migration, /pg_advisory_xact_lock\(hashtext\('lena-owner-bootstrap-v1'\)\)/);
  assert.match(migration, /revoke all on function private\.bootstrap_lena_owner\(uuid\) from public, anon, authenticated/i);
  assert.match(migration, /grant execute on function private\.bootstrap_lena_owner\(uuid\) to postgres, service_role/i);
  assert.match(migration, /LENA_OWNER_ALREADY_BOOTSTRAPPED/);
  assert.match(migration, /lena-active-admin-invariant-v1/);
  assert.match(migration, /LENA_LAST_ACTIVE_ADMIN_REQUIRED/);
});

test('full client-authored snapshot RPC is disabled and the browser uses command patches', async () => {
  const [migration, cloud, gate] = await Promise.all([
    read('supabase/migrations/0022_constrain_authoritative_command_writes.sql'),
    read('src/features/sync/showroomCloudState.ts'),
    read('src/features/sync/CloudDataGate.tsx'),
  ]);

  assert.match(migration, /LENA_LEGACY_SNAPSHOT_WRITE_DISABLED/);
  assert.match(migration, /revoke all on function public\.apply_showroom_snapshot\(bigint, jsonb, text, text\)[\s\S]*authenticated, service_role/i);
  assert.match(migration, /create or replace function public\.apply_showroom_command\([\s\S]*p_patch jsonb/s);
  assert.match(migration, /grant execute on function public\.apply_showroom_command\(bigint, text, text, jsonb\) to authenticated/i);
  assert.match(migration, /LENA_ADMIN_RECOVERY_RPC_REQUIRED/);
  assert.match(migration, /create or replace function public\.restore_showroom_backup/);
  assert.match(migration, /create or replace function public\.reset_showroom_state/);
  assert.match(migration, /LENA_SERVER_AUDIT_REQUIRED/);
  assert.match(migration, /LENA_RESERVATION_LEDGER_MISMATCH/);
  assert.match(migration, /LENA_RESERVATION_OVERLAP/);
  assert.match(migration, /LENA_DELIVERY_COMMAND_REQUIRED/);
  assert.match(migration, /LENA_DELIVERY_EVIDENCE_REQUIRED/);
  assert.match(migration, /LENA_SALE_EVIDENCE_REQUIRED/);
  assert.match(migration, /LENA_PAYMENT_TYPE_INVALID/);
  assert.match(migration, /LENA_DAILY_CLOSE_INVALID/);
  assert.match(migration, /LENA_INVENTORY_IDENTITY_IMMUTABLE/);
  assert.match(migration, /LENA_INVENTORY_FIELD_FORBIDDEN/);
  assert.match(migration, /LENA_SERVER_AUDIT_REQUIRED/);
  assert.match(migration, /LENA_APPEND_ONLY_VIOLATION_' \|\| collection_name/);

  assert.match(cloud, /buildShowroomCommandPatch/);
  assert.match(cloud, /rpc\('apply_showroom_command'/);
  assert.doesNotMatch(cloud, /rpc\('apply_showroom_snapshot'/);
  assert.match(gate, /importDatabaseBackup\(committed\.snapshot\)/);
});

test('every current workflow command is explicitly recognised by the database authority boundary', async () => {
  const [migration, names] = await Promise.all([
    read('supabase/migrations/0022_constrain_authoritative_command_writes.sql'),
    workflowCommandNames(),
  ]);

  assert.ok(names.size > 0, 'workflow scan must find command names');
  for (const name of names) {
    assert.match(migration, new RegExp(`'${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'`), `${name} is missing from the DB command allowlist`);
  }
});

test('legacy normalized tables cannot become an alternate browser write authority', async () => {
  const migration = await read('supabase/migrations/0024_lock_legacy_authority_surfaces.sql');
  assert.match(migration, /revoke all on table[\s\S]*public\.dresses,[\s\S]*public\.payments,[\s\S]*from authenticated, anon/s);
  assert.match(migration, /drop policy if exists payments_insert_active/i);
  assert.match(migration, /force row level security/);
});

test('new private authority helpers are not executable by normal API roles', async () => {
  const migration = await read('supabase/migrations/0022_constrain_authoritative_command_writes.sql');
  const helpers = [
    'lena_snapshot_collection',
    'lena_snapshot_entity',
    'lena_replace_snapshot_entity',
    'lena_remove_snapshot_entity',
    'lena_assert_append_only',
    'lena_assert_new_payment_records',
    'lena_assert_reservation_financials',
    'lena_assert_reservation_transitions',
    'lena_reservation_lines',
    'lena_assert_reservation_availability',
    'lena_assert_dress_transitions',
    'lena_patch_upserts',
    'lena_assert_expense_entity',
    'lena_assert_critical_command_witnesses',
    'lena_assert_daily_closing_invariants',
    'lena_assert_command_authority',
    'lena_apply_command_patch',
    'lena_append_server_audit',
  ];
  for (const helper of helpers) {
    assert.match(migration, new RegExp(`revoke all on function private\\.${helper}\\(`, 'i'), `${helper} must be revoked`);
  }
});

test('forward repair recreates an allowlisted public profile projection', async () => {
  const migration = await read('supabase/migrations/0023_repair_public_showroom_profile_projection.sql');

  assert.match(migration, /create table if not exists public\.showroom_public_profile/);
  assert.match(migration, /create trigger showroom_state_sync_public_profile/);
  assert.match(migration, /project_lena_public_showroom_profile/);
  assert.match(migration, /lena_public_profile_pair_array/);
  assert.match(migration, /lena_public_profile_string_array/);
  assert.match(migration, /'brandName'/);
  assert.match(migration, /'workingHours'/);
  assert.doesNotMatch(migration, /values \('main', projected_profile, now\(\)\)/);
  assert.match(migration, /grant select on table public\.showroom_public_profile to anon, authenticated/);
});
