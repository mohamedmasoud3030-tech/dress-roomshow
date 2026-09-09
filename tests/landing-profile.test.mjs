import test from 'node:test';
import assert from 'node:assert/strict';
import { URL } from 'node:url';
import {
  fetchPublicShowroomProfile,
  mergePublicShowroomProfile,
} from '../src/pages/landing/landingProfile.repository.ts';
import { landingShowroomProfile } from '../src/pages/landing/landingContent.ts';

test('the public profile deep-merges contact defaults without exposing the private snapshot', () => {
  const merged = mergePublicShowroomProfile({
    brandName: 'المعرض المحدث',
    contact: { whatsapp: '+968 9000 0000' },
  });
  assert.equal(merged.brandName, 'المعرض المحدث');
  assert.equal(merged.contact.whatsapp, '+968 9000 0000');
  assert.equal(merged.contact.email, landingShowroomProfile.contact.email);
  const hardened = mergePublicShowroomProfile({
    brandName: 'المعرض المحدث',
    internalSecret: 'must-not-survive',
    contact: { whatsapp: '+968 9000 0000', internalToken: 'must-not-survive' },
  });
  assert.equal('internalSecret' in hardened, false);
  assert.equal('internalToken' in hardened.contact, false);

  const nested = mergePublicShowroomProfile({
    categories: [{ name: 'سهرة', description: 'علنية', internalCategoryToken: 'must-not-survive' }],
    services: [{ title: 'إيجار', description: 'علنية', internalServiceToken: 'must-not-survive' }],
    faq: [{ question: 'سؤال', answer: 'جواب', internalFaqToken: 'must-not-survive' }],
  });
  assert.deepEqual(nested.categories, [{ name: 'سهرة', description: 'علنية' }]);
  assert.deepEqual(nested.services, [{ title: 'إيجار', description: 'علنية' }]);
  assert.deepEqual(nested.faq, [{ question: 'سؤال', answer: 'جواب' }]);
});

test('an anonymous landing visitor reads only the public profile projection', async () => {
  let requestedUrl = '';
  const profile = await fetchPublicShowroomProfile({
    getConfig: () => ({ url: 'https://project.supabase.co', publishableKey: 'publishable-test-key' }),
    fetcher: async (input, init) => {
      requestedUrl = String(input);
      assert.equal(init.headers.apikey, 'publishable-test-key');
      return {
        ok: true,
        status: 200,
        json: async () => [{ profile: { brandName: 'LENA العامة' } }],
      };
    },
  });

  assert.match(requestedUrl, /\/rest\/v1\/showroom_public_profile/);
  assert.doesNotMatch(requestedUrl, /showroom_state/);
  assert.equal(profile.brandName, 'LENA العامة');
});

test('mobile landing keeps one persistent booking action and ships no unapproved alternate contacts', async () => {
  const page = await import('node:fs/promises').then(({ readFile }) => readFile(new URL('../src/pages/landing/LandingPage.tsx', import.meta.url), 'utf8'));
  assert.match(page, /fixed inset-x-4/);
  assert.match(page, /احجزي موعد عبر واتساب/);
  assert.equal(landingShowroomProfile.contact.alternatePhones, undefined);
  assert.equal(landingShowroomProfile.contact.alternateEmail, undefined);
});

test('a malformed public profile response fails closed instead of inventing content', async () => {
  await assert.rejects(() => fetchPublicShowroomProfile({
    getConfig: () => ({ url: 'https://project.supabase.co', publishableKey: 'publishable-test-key' }),
    fetcher: async () => ({ ok: true, status: 200, json: async () => ({}) }),
  }), /invalid/);
});
