import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { URL } from 'node:url';
import {
  MissingRuntimeConfigError,
  getSupabaseConfig,
  readRequiredEnv,
} from '../src/config/env.ts';

const repositoryUrl = new URL('../', import.meta.url);
const readRepositoryFile = (path) => readFile(new URL(path, repositoryUrl), 'utf8');

test('the documented Node default stays inside the Node 22 LTS line used by CI', async () => {
  const [nvmrc, packageJson, ...workflows] = await Promise.all([
    readRepositoryFile('.nvmrc'),
    readRepositoryFile('package.json'),
    readRepositoryFile('.github/workflows/build.yml'),
    readRepositoryFile('.github/workflows/verify.yml'),
    readRepositoryFile('.github/workflows/windows-release.yml'),
  ]);
  const defaultVersion = nvmrc.trim();
  const packageMetadata = JSON.parse(packageJson);

  assert.equal(defaultVersion, '22.23.2');
  assert.match(packageMetadata.engines.node, new RegExp(`\\^${defaultVersion.replaceAll('.', '\\.')}\\b`));
  for (const workflow of workflows) {
    assert.match(workflow, /node-version: ['"]?22['"]?/, 'CI follows the supported Node 22 LTS line');
  }
});

test('readRequiredEnv trims configured values', () => {
  assert.equal(readRequiredEnv({ VITE_SUPABASE_URL: ' https://example.test ' }, 'VITE_SUPABASE_URL'), 'https://example.test');
});

test('getSupabaseConfig rejects missing required Supabase settings', () => {
  assert.throws(
    () => getSupabaseConfig({ VITE_SUPABASE_URL: 'https://example.test' }),
    (error) => {
      assert.equal(error instanceof MissingRuntimeConfigError, true);
      assert.equal(error.key, 'VITE_SUPABASE_PUBLISHABLE_KEY');
      return true;
    },
  );
});

test('getSupabaseConfig prefers modern publishable keys and keeps the legacy anon fallback', () => {
  assert.deepEqual(
    getSupabaseConfig({
      VITE_SUPABASE_URL: 'https://example.test',
      VITE_SUPABASE_PUBLISHABLE_KEY: ' sb_publishable_modern ',
      VITE_SUPABASE_ANON_KEY: 'legacy',
    }),
    {
      url: 'https://example.test',
      publishableKey: 'sb_publishable_modern',
    },
  );

  assert.equal(
    getSupabaseConfig({
      VITE_SUPABASE_URL: 'https://example.test',
      VITE_SUPABASE_ANON_KEY: ' legacy ',
    }).publishableKey,
    'legacy',
  );
});
