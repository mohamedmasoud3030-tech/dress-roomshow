import test from 'node:test';
import assert from 'node:assert/strict';
import { URL } from 'node:url';

// Explicitly bound because the flat ESLint config declares no browser globals for .mjs tests.
const { AbortSignal, DOMException } = globalThis;
import {
  fetchAvailableDressesFromSupabase,
  LANDING_FETCH_TIMEOUT_MS,
  loadLandingInventory,
} from '../src/pages/landing/landingDress.repository.ts';
import {
  buildAppointmentInquiryMessage,
  buildQuickInquiryMessage,
} from '../src/pages/landing/landingWhatsapp.ts';

function makeDress(id) {
  return {
    id,
    code: `D-${id}`,
    name: `فستان ${id}`,
    description: '',
    itemType: 'dress',
    category: 'سهرة',
    color: 'أسود',
    size: 'M',
    purchasePrice: 0,
    rentalPrice: 25,
    salePrice: 0,
    depositAmount: 10,
    status: 'available',
    isForRent: true,
    isForSale: false,
    images: [],
    barcode: `D-${id}`,
    timesRented: 0,
  };
}

test('uses local inventory directly when Supabase is not configured', async () => {
  const localDresses = [makeDress('local')];
  let remoteCalls = 0;

  const result = await loadLandingInventory({
    isSupabaseConfigured: () => false,
    fetchAvailableDressesFromSupabase: async () => {
      remoteCalls += 1;
      return [makeDress('remote')];
    },
    getAvailableDressesFromLocalStorage: () => localDresses,
  });

  assert.deepEqual(result, { dresses: localDresses, source: 'local' });
  assert.equal(remoteCalls, 0);
});

test('returns Supabase inventory when the configured request succeeds', async () => {
  const remoteDresses = [makeDress('remote')];
  let localCalls = 0;

  const result = await loadLandingInventory({
    isSupabaseConfigured: () => true,
    fetchAvailableDressesFromSupabase: async () => remoteDresses,
    getAvailableDressesFromLocalStorage: () => {
      localCalls += 1;
      return [makeDress('local')];
    },
  });

  assert.deepEqual(result, { dresses: remoteDresses, source: 'supabase' });
  assert.equal(localCalls, 0);
});

test('fails closed instead of showing stale browser inventory when Supabase fails', async () => {
  const localDresses = [makeDress('fallback')];

  await assert.rejects(
    loadLandingInventory({
      isSupabaseConfigured: () => true,
      fetchAvailableDressesFromSupabase: async () => {
        throw new Error('تعذر تحميل المعروض الحالي من الخادم.');
      },
      getAvailableDressesFromLocalStorage: () => localDresses,
    }),
    /تعذر تحميل المعروض الحالي من الخادم/,
  );
});

test('normalizes non-Error Supabase failures without exposing stale data', async () => {
  const localDresses = [makeDress('fallback')];

  await assert.rejects(
    loadLandingInventory({
      isSupabaseConfigured: () => true,
      fetchAvailableDressesFromSupabase: () => Promise.reject({ code: 'offline' }),
      getAvailableDressesFromLocalStorage: () => localDresses,
    }),
    /تعذر تحميل المعروض الحالي من الخادم/,
  );
});

test('treats an empty Supabase response as a successful shared inventory result', async () => {
  let localCalls = 0;

  const result = await loadLandingInventory({
    isSupabaseConfigured: () => true,
    fetchAvailableDressesFromSupabase: async () => [],
    getAvailableDressesFromLocalStorage: () => {
      localCalls += 1;
      return [makeDress('local')];
    },
  });

  assert.deepEqual(result, { dresses: [], source: 'supabase' });
  assert.equal(localCalls, 0);
});

test('public catalogue uses a direct anonymous REST request and maps the narrow projection', async () => {
  let request;
  const dresses = await fetchAvailableDressesFromSupabase({
    getConfig: () => ({ url: 'https://project.supabase.co', publishableKey: 'public-key' }),
    fetcher: async (input, init) => {
      request = { url: String(input), headers: init.headers };
      return {
        ok: true,
        status: 200,
        json: async () => [{
        id: 'remote',
        code: 'D-remote',
        name: 'فستان مباشر',
        description: null,
        category: 'سهرة',
        color: 'أسود',
        size: 'M',
        item_type: 'dress',
        rental_price: 25,
        sale_price: null,
        security_deposit_amount: 10,
        status: 'available',
        is_for_rent: true,
        is_for_sale: false,
          images: [],
        }],
      };
    },
  });

  const url = new URL(request.url);
  assert.equal(url.pathname, '/rest/v1/catalogue_items');
  assert.equal(url.searchParams.get('status'), 'eq.available');
  assert.equal(url.searchParams.get('order'), 'updated_at.desc');
  assert.match(url.searchParams.get('select'), /security_deposit_amount/);
  assert.equal(request.headers.apikey, 'public-key');
  assert.equal(request.headers.Authorization, 'Bearer public-key');
  assert.equal(dresses.length, 1);
  assert.equal(dresses[0].name, 'فستان مباشر');
  assert.equal(dresses[0].status, 'available');
});

test('public catalogue fails closed when REST returns an error status', async () => {
  await assert.rejects(
    fetchAvailableDressesFromSupabase({
      getConfig: () => ({ url: 'https://project.supabase.co', publishableKey: 'public-key' }),
      fetcher: async () => ({ ok: false, status: 403 }),
    }),
    /تعذر تحميل المعروض الحالي من الخادم/,
  );
});

test('public booking messages identify the exact item and do not promise an unconfirmed reservation', () => {
  const item = { code: 'D-101', name: 'فستان سهرة كحلي', size: 'M', color: 'كحلي' };
  const booking = buildAppointmentInquiryMessage(item);
  const inquiry = buildQuickInquiryMessage(item);

  assert.match(booking, /طلب موعد/);
  assert.match(booking, /D-101/);
  assert.match(booking, /المقاس: M/);
  assert.match(booking, /تأكيد الموعد وتوفر القطعة/);
  assert.doesNotMatch(booking, /تم تأكيد|حجز مؤكد/);
  assert.match(inquiry, /D-101/);
});

test('public catalogue request carries an abort signal and uses the documented timeout budget', async () => {
  let observed;
  const dresses = await fetchAvailableDressesFromSupabase({
    getConfig: () => ({ url: 'https://project.supabase.co', publishableKey: 'public-key' }),
    fetcher: async (url, options) => {
      observed = { options };
      return { ok: true, json: async () => [] };
    },
  });

  assert.deepEqual(dresses, []);
  assert.ok(observed.options.signal instanceof AbortSignal, 'the hung-connection guard must wire an AbortSignal into fetch');
  assert.equal(LANDING_FETCH_TIMEOUT_MS, 12_000, 'the public-page budget stays explicit and documented');
});

test('a stalled public catalogue connection fails closed instead of hanging the visitor', async () => {
  const stalledFetcher = (url, options) => new Promise((resolve, reject) => {
    options.signal.addEventListener('abort', () => reject(new DOMException('The operation was aborted.', 'AbortError')));
  });

  const startedAt = Date.now();
  await assert.rejects(
    fetchAvailableDressesFromSupabase({
      getConfig: () => ({ url: 'https://project.supabase.co', publishableKey: 'public-key' }),
      fetcher: stalledFetcher,
      timeoutMs: 25,
    }),
    (error) => {
      assert.equal(error.name, 'LandingInventoryError');
      assert.match(error.message, /تعذر تحميل المعروض الحالي من الخادم/);
      assert.equal(error.cause?.name, 'AbortError');
      return true;
    },
  );
  assert.ok(Date.now() - startedAt < 5_000, 'the stalled request must resolve to the error state promptly');
});
