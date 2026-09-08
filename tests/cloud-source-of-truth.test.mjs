import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { URL } from 'node:url';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('every authenticated route is blocked on cloud hydration', async () => {
  const routes = await read('src/app/router/AppRoutes.tsx');
  assert.match(routes, /<RequireAuth>[\s\S]*<CloudDataGate>[\s\S]*<DeviceLockGate>/);
  assert.match(routes, /<RequireAdmin><PreferencesPage/);
});

test('commands publish complete before/after snapshots and roll back rejected commits', async () => {
  const runner = await read('src/engines/workflows/commandRunner.ts');
  const gate = await read('src/features/sync/CloudDataGate.tsx');
  assert.match(runner, /publishShowroomCommandCommitted/);
  assert.match(runner, /createDatabaseSnapshot\(\)/);
  assert.match(gate, /commitShowroomState/);
  assert.match(gate, /restoreDatabaseSnapshot\(detail\.before\)/);
  assert.match(gate, /revisionRef\.current/);
});

test('the database preserves revisions but moves authenticated writes to the constrained command boundary', async () => {
  const [migration, authority] = await Promise.all([
    read('supabase/migrations/0016_centralized_showroom_state.sql'),
    read('supabase/migrations/0022_constrain_authoritative_command_writes.sql'),
  ]);
  assert.match(migration, /create table if not exists public\.showroom_state/);
  assert.match(migration, /for update/);
  assert.match(migration, /LENA_REVISION_CONFLICT/);
  assert.match(migration, /force row level security/);
  assert.match(migration, /payment_type in \('rental_payment', 'rental', 'booking_advance'\)/);
  assert.doesNotMatch(migration, /payment_type in \([^)]*security_deposit_collection[^)]*\) then amount/);

  assert.match(authority, /create or replace function public\.apply_showroom_command/);
  assert.match(authority, /grant execute on function public\.apply_showroom_command\(bigint, text, text, jsonb\) to authenticated/);
  assert.match(authority, /LENA_LEGACY_SNAPSHOT_WRITE_DISABLED/);
  assert.match(authority, /revoke all on function public\.apply_showroom_snapshot\(bigint, jsonb, text, text\)[\s\S]*authenticated, service_role/);
});

test('hardening migrations protect audit rows and the final forward repair exposes only an allowlisted public profile', async () => {
  const [hardening, initialPublicProfile, repairedProfile] = await Promise.all([
    read('supabase/migrations/0019_audit_and_snapshot_validation.sql'),
    read('supabase/migrations/0020_public_showroom_profile.sql'),
    read('supabase/migrations/0023_repair_public_showroom_profile_projection.sql'),
  ]);

  assert.match(hardening, /audit-log[\s\S]*audit[\s\S]*daily-closings/);
  assert.match(hardening, /showroom_state_validate_snapshot/);
  assert.match(hardening, /LENA_INVALID_PAYMENT/);
  assert.match(hardening, /LENA_DUPLICATE_ENTITY/);
  assert.match(initialPublicProfile, /create table if not exists public\.showroom_public_profile/);
  assert.match(repairedProfile, /project_lena_public_showroom_profile/);
  assert.match(repairedProfile, /'brandName'/);
  assert.match(repairedProfile, /to anon, authenticated/);
  assert.doesNotMatch(repairedProfile, /grant select on table public\.showroom_state to anon/);
});

test('public catalogue is a narrow anonymous projection and Vercel serves SPA deep links securely', async () => {
  const migration = await read('supabase/migrations/0016_centralized_showroom_state.sql');
  const landing = await read('src/pages/landing/landingDress.repository.ts');
  const vercel = JSON.parse(await read('vercel.json'));
  assert.match(migration, /catalogue_items_public_available/);
  assert.match(migration, /grant select on table public\.catalogue_items to anon/);
  assert.match(landing, /\/rest\/v1\/catalogue_items/);
  assert.match(landing, /apikey: publishableKey/);
  assert.match(landing, /status', 'eq\.available'/);
  assert.ok(vercel.rewrites.some((rule) => rule.destination === '/index.html'));
  const headers = vercel.headers.flatMap((entry) => entry.headers.map((header) => header.key));
  for (const required of ['Content-Security-Policy', 'X-Content-Type-Options', 'Referrer-Policy', 'Permissions-Policy']) {
    assert.ok(headers.includes(required), `${required} must be configured`);
  }
});
