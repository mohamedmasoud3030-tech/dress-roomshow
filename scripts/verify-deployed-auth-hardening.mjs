#!/usr/bin/env node
/** Read-only production Auth configuration smoke test; prints no credentials. */
const url = (process.env.LENA_SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? '').trim();
const publishableKey = (process.env.LENA_SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '').trim();

if (!url || !publishableKey) {
  throw new Error('Set LENA_SUPABASE_URL and LENA_SUPABASE_PUBLISHABLE_KEY in the secure deployment environment.');
}

const response = await fetch(new URL('/auth/v1/settings', url), {
  headers: { apikey: publishableKey, Authorization: `Bearer ${publishableKey}` },
});
let body = null;
try { body = await response.json(); } catch { /* status below is enough */ }
if (!response.ok || !body || typeof body !== 'object' || Array.isArray(body)) {
  throw new Error(`Auth settings smoke check failed: HTTP ${response.status}.`);
}
if (body.disable_signup !== true) {
  throw new Error('Auth hardening smoke check failed: public sign-up is still enabled.');
}

console.log('Auth hardening smoke check passed: public sign-up disabled, response values redacted.');
