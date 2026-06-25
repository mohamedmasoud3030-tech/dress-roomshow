import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MissingRuntimeConfigError,
  getSupabaseConfig,
  readRequiredEnv,
} from '../src/config/env.ts';

test('readRequiredEnv trims configured values', () => {
  assert.equal(readRequiredEnv({ VITE_SUPABASE_URL: ' https://example.test ' }, 'VITE_SUPABASE_URL'), 'https://example.test');
});

test('getSupabaseConfig rejects missing required Supabase settings', () => {
  assert.throws(
    () => getSupabaseConfig({ VITE_SUPABASE_URL: 'https://example.test' }),
    (error) => {
      assert.equal(error instanceof MissingRuntimeConfigError, true);
      assert.equal(error.key, 'VITE_SUPABASE_ANON_KEY');
      return true;
    },
  );
});
