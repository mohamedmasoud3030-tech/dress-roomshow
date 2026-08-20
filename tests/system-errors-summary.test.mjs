import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath, URL } from 'node:url';

const repositoryRoot = fileURLToPath(new URL('..', import.meta.url));
const readSource = (path) => readFile(join(repositoryRoot, path), 'utf8');

test('the admin errors card reads the server log with the safest possible query', async () => {
  const component = await readSource('src/features/observability/SystemErrorsSummary.tsx');

  assert.match(component, /\.from\('client_error_events'\)/);
  assert.match(component, /count: 'exact'/, 'one round trip returns the total');
  assert.match(component, /\.order\('created_at', \{ ascending: false \}\)\s*\.limit\(1\)/, 'only the newest row body travels');
  assert.match(component, /return \{ status: 'unavailable' \}/, 'every failure path degrades calmly');
  assert.doesNotMatch(component, /select\('\*'\)/, 'row payloads are never pulled into the UI');
  assert.match(component, /role="status"/);
  assert.match(component, /أخطاء النظام المسجلة/);
});

test('the card is mounted on the admin-only preferences surface', async () => {
  const page = await readSource('src/features/preferences/PreferencesPage.tsx');
  const routes = await readSource('src/app/router/AppRoutes.tsx');

  assert.match(page, /<SystemErrorsSummary \/>/);
  assert.match(routes, /<RequireAdmin><PreferencesPage/, 'only admins can ever reach this UI');
});

test('the RLS contract keeps error rows write-active but read-admin (migration 0016)', async () => {
  const migration = await readSource('supabase/migrations/0016_centralized_showroom_state.sql');

  assert.match(migration, /create policy client_error_events_insert_active[\s\S]*?for insert[\s\S]*?to authenticated/, 'every active device may report an error');
  assert.match(migration, /create policy client_error_events_select_admin[\s\S]*?for select[\s\S]*?private\.is_lena_admin\(\)/, 'reading error rows stays admin-only');
  assert.doesNotMatch(migration, /client_error_events[^;]*to anon/, 'anonymous gets nothing');
});
