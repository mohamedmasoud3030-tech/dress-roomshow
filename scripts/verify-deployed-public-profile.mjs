#!/usr/bin/env node
/**
 * Read-only post-migration smoke test for the public landing-profile relation.
 *
 * Set LENA_SUPABASE_URL / LENA_SUPABASE_PUBLISHABLE_KEY (or the matching VITE_
 * variables) through the deployment secret manager. The script deliberately
 * prints status/shape only and never emits response values or credentials.
 */
const url = (process.env.LENA_SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? '').trim();
const publishableKey = (process.env.LENA_SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '').trim();

if (!url || !publishableKey) {
  throw new Error('Set LENA_SUPABASE_URL and LENA_SUPABASE_PUBLISHABLE_KEY in the secure deployment environment.');
}

const endpoint = new URL('/rest/v1/showroom_public_profile', url);
endpoint.searchParams.set('select', 'id,profile');
endpoint.searchParams.set('id', 'eq.main');
endpoint.searchParams.set('limit', '1');

const response = await fetch(endpoint, {
  headers: {
    Accept: 'application/json',
    apikey: publishableKey,
    Authorization: `Bearer ${publishableKey}`,
  },
});

let body = null;
try { body = await response.json(); } catch { /* status below is enough */ }
if (!response.ok) {
  const code = body && typeof body === 'object' && !Array.isArray(body) && typeof body.code === 'string'
    ? body.code
    : 'unknown';
  throw new Error(`Public-profile schema smoke check failed: HTTP ${response.status}, code ${code}.`);
}
if (!Array.isArray(body) || body.length !== 1 || !body[0] || typeof body[0] !== 'object' || !('profile' in body[0])) {
  throw new Error('Public-profile schema smoke check returned an unexpected response shape.');
}

console.log('Public-profile schema smoke check passed: HTTP 200, one main projection row, response values redacted.');
