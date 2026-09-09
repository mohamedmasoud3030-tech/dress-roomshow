/**
 * Every piece can carry its own discount percentage, and that percentage has
 * to survive the whole distance from the catalogue to the paper in a
 * customer's hand: the landing page, the sale invoice and the rental contract.
 *
 * These tests walk that distance. They are deliberately behavioural — a
 * rounding helper that "looks right" but never reaches the printed page is
 * worth nothing to the owner, whose only proof that a discount exists is the
 * number her customer reads.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath, URL } from 'node:url';

const repositoryRoot = fileURLToPath(new URL('..', import.meta.url));

function installStorage(seed = {}) {
  const store = new Map(Object.entries(seed));
  globalThis.window = {
    localStorage: {
      get length() { return store.size; },
      getItem(key) { return store.has(key) ? store.get(key) : null; },
      setItem(key, value) { store.set(key, String(value)); },
      removeItem(key) { store.delete(key); },
      key(index) { return Array.from(store.keys())[index] ?? null; },
      clear() { store.clear(); },
    },
  };
  return store;
}

function cleanup() {
  delete globalThis.window;
}

const { addDress, updateDressDetails, getDressByCode } = await import('../src/features/dresses/dress.service.ts');
const {
  getDressDiscountPercent,
  hasDressDiscount,
  getDressEffectiveRentalPrice,
  getDressEffectiveSalePrice,
} = await import('../src/features/dresses/dress.types.ts');
const { buildLineFromInput } = await import('../src/features/reservations/contractLineHelpers.ts');

const baseDressInput = {
  name: 'فستان اختبار',
  description: '',
  itemType: 'dress',
  category: 'سهرة',
  color: 'أحمر',
  size: 'M',
  purchasePrice: 100,
  rentalPrice: 20,
  salePrice: 150,
  depositAmount: 30,
  status: 'available',
  isForRent: true,
  isForSale: true,
  images: [],
  barcode: '',
};

/** A date safely in the future so the line builder's date rules never bite. */
function futureWindow(offsetDays = 30) {
  const start = new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1000);
  const end = new Date(start.getTime() + 3 * 24 * 60 * 60 * 1000);
  const iso = (d) => d.toISOString().slice(0, 10);
  return { pickupDate: iso(start), returnDate: iso(end) };
}

test('a piece without a discount reads at its catalogue price', () => {
  const dress = { ...baseDressInput, code: 'D-001', rentalPrice: 20, salePrice: 150 };
  assert.equal(getDressDiscountPercent(dress), 0);
  assert.equal(hasDressDiscount(dress), false);
  assert.equal(getDressEffectiveRentalPrice(dress), 20);
  assert.equal(getDressEffectiveSalePrice(dress), 150);
});

test('the effective price is rounded to the 3 decimals OMR is stored in', () => {
  // 33% of 12.345 is 8.27115 — money cannot carry that.
  const dress = { ...baseDressInput, code: 'D-002', rentalPrice: 12.345, salePrice: 99.999, discountPercent: 33 };
  assert.equal(getDressEffectiveRentalPrice(dress), 8.271);
  assert.equal(getDressEffectiveSalePrice(dress), 66.999);
  assert.equal(hasDressDiscount(dress), true);
});

test('a nonsense percentage can never produce a negative or free price', () => {
  // A mistyped 150% or -20% must not invent money out of thin air.
  assert.equal(getDressDiscountPercent({ discountPercent: 150 }), 100);
  assert.equal(getDressDiscountPercent({ discountPercent: -20 }), 0);
  assert.equal(getDressDiscountPercent({ discountPercent: undefined }), 0);
  assert.equal(getDressEffectiveSalePrice({ salePrice: 150, discountPercent: 150 }), 0);
  assert.equal(getDressEffectiveSalePrice({ salePrice: 150, discountPercent: -20 }), 150);
});

test('the owner can set and clear a discount on a piece she already owns', () => {
  installStorage();
  try {
    const created = addDress({ ...baseDressInput, name: 'فستان الخصم' });
    assert.equal(getDressDiscountPercent(created), 0);

    const discounted = updateDressDetails(created.code, { ...baseDressInput, discountPercent: 25 });
    assert.equal(discounted.discountPercent, 25);
    assert.equal(getDressEffectiveSalePrice(discounted), 112.5); // 150 - 25%
    assert.equal(getDressByCode(created.code).discountPercent, 25);

    const cleared = updateDressDetails(created.code, { ...baseDressInput, discountPercent: 0 });
    assert.equal(getDressDiscountPercent(cleared), 0);
    assert.equal(getDressEffectiveRentalPrice(cleared), 20);
  } finally {
    cleanup();
  }
});

test('a percentage outside 0-100 is refused, not silently clamped', () => {
  installStorage();
  try {
    const created = addDress({ ...baseDressInput, name: 'فستان الحدود' });
    // Silently turning 150 into 100 would charge a customer a fraction of the
    // price because someone missed a keystroke.
    assert.throws(
      () => updateDressDetails(created.code, { ...baseDressInput, discountPercent: 150 }),
      /نسبة الخصم/,
    );
    assert.throws(
      () => updateDressDetails(created.code, { ...baseDressInput, discountPercent: -5 }),
      /نسبة الخصم/,
    );
    assert.equal(getDressByCode(created.code).discountPercent ?? 0, 0);
  } finally {
    cleanup();
  }
});

test('editing a discounted piece leaves its code, status and history alone', () => {
  installStorage();
  try {
    const created = addDress({ ...baseDressInput, name: 'فستان الهوية' });
    const before = { ...created };
    const after = updateDressDetails(created.code, {
      ...baseDressInput,
      name: 'فستان بعد التعديل',
      discountPercent: 10,
    });
    assert.equal(after.code, before.code);
    assert.equal(after.id, before.id);
    assert.equal(after.barcode, before.barcode);
    assert.equal(after.status, before.status);
    assert.equal(after.name, 'فستان بعد التعديل');
    assert.equal(after.discountPercent, 10);
  } finally {
    cleanup();
  }
});

test('a reservation for a discounted piece is agreed at the discounted price but keeps the list price', () => {
  installStorage();
  try {
    const created = addDress({ ...baseDressInput, name: 'فستان مؤجر', rentalPrice: 20 });
    updateDressDetails(created.code, { ...baseDressInput, name: 'فستان مؤجر', discountPercent: 25 });

    const line = buildLineFromInput({ dressId: created.id }, futureWindow());
    assert.equal(line.listRentalPrice, 20, 'the reference price is what the catalogue says');
    assert.equal(line.rentalPrice, 15, 'the customer is charged the discounted price');
  } finally {
    cleanup();
  }
});

test('the owner can still agree a different price than the automatic discount', () => {
  installStorage();
  try {
    const created = addDress({ ...baseDressInput, name: 'فستان تفاوض', rentalPrice: 20 });
    updateDressDetails(created.code, { ...baseDressInput, name: 'فستان تفاوض', discountPercent: 25 });

    const line = buildLineFromInput({ dressId: created.id, rentalPrice: 12 }, futureWindow());
    assert.equal(line.rentalPrice, 12);
  } finally {
    cleanup();
  }
});

test('the printed sale invoice spells the discount out for the customer', async () => {
  const { printSaleInvoice } = await import('../src/features/dresses/printSaleInvoice.ts');
  const { getPrintFrameDocument, installDom, uninstallDom } = await import('./helpers/dom.mjs');

  installStorage();
  installDom();
  try {
    const created = addDress({ ...baseDressInput, name: 'فستان الفاتورة', salePrice: 200 });
    updateDressDetails(created.code, { ...baseDressInput, name: 'فستان الفاتورة', salePrice: 200, discountPercent: 25 });

    printSaleInvoice({
      id: 'invoice-discount',
      invoiceNumber: 'INV-900',
      saleDate: '2026-09-09',
      customerName: 'عميلة تجريبية',
      paymentMethod: 'cash',
      lines: [{ id: 'line-1', dressCode: created.code, dressName: created.name, amount: 150 }],
      totalAmount: 150,
    });

    const markup = getPrintFrameDocument().written.join('');
    // A customer holding this paper must be able to see the price it replaced
    // and why she is paying less — not just the number she is paying.
    assert.match(markup, /بدلاً من/, 'the invoice shows the price it replaced');
    assert.match(markup, /خصم/, 'the invoice names the discount');
    assert.match(markup, /٢٠٠/, 'the list price is printed');
    assert.match(markup, /١٥٠/, 'the price actually charged is printed');
  } finally {
    uninstallDom();
    cleanup();
  }
});

test('the printed rental contract shows the discount as a discount, not a quiet favour', async () => {
  const { createReservationCommand } = await import('../src/features/workflows/reservationCommands.ts');
  const { buildRentalContractHtml } = await import('../src/features/reservations/printRentalContract.ts');
  const { addCustomer } = await import('../src/features/customers/customer.service.ts');
  const { addDaysISO, getTodayISO } = await import('../src/shared/utils/date.ts');

  installStorage();
  try {
    const customer = addCustomer({ name: 'عميلة تجريبية', phone: '90000009', status: 'normal' });
    const dress = addDress({ ...baseDressInput, name: 'فستان العقد', rentalPrice: 100 });
    updateDressDetails(dress.code, { ...baseDressInput, name: 'فستان العقد', rentalPrice: 100, discountPercent: 20 });

    const reservation = createReservationCommand({
      customerId: customer.id,
      dressId: dress.id,
      pickupDate: addDaysISO(getTodayISO(), 5),
      returnDate: addDaysISO(getTodayISO(), 8),
      securityDepositAmount: 30,
      depositAmount: 30, // legacy compat: the reservation entry point still names it this way
      bookingAdvanceAmount: 0,
      idempotencyKey: 'contract-discount-1',
    });

    const html = buildRentalContractHtml(reservation);
    assert.match(html, /الخصومات/, 'the contract states the discount explicitly');
    assert.match(html, /سعر القائمة/, 'the contract keeps the reference price');
    assert.match(html, /١٠٠/, 'the list price is printed');
    assert.match(html, /٨٠/, 'the discounted price the customer pays is printed');
  } finally {
    cleanup();
  }
});

test('the landing page shows the discounted price and the price it replaced', async () => {
  const source = await readFile(join(repositoryRoot, 'src/pages/landing/components/LandingInventory.tsx'), 'utf8');
  assert.match(source, /line-through/, 'the old price is struck through, not hidden');
  assert.match(source, /getDressEffectiveSalePrice/, 'the landing prices the piece after discount');
});

test('both sale entry points open at the discounted price, not the list price', async () => {
  // The owner picks a piece and expects the box to already hold the price the
  // customer will pay; pre-filling the old price means every discounted sale
  // is one keystroke away from being charged wrong.
  for (const file of ['src/features/dresses/SellDressModal.tsx', 'src/features/dresses/CreateSaleInvoiceModal.tsx']) {
    const source = await readFile(join(repositoryRoot, file), 'utf8');
    assert.match(source, /getDressEffectiveSalePrice/, `${file} must default to the discounted price`);
    assert.doesNotMatch(source, /amount: dress \? String\(dress\.salePrice\)/, `${file} must not pre-fill the list price`);
  }
});

test('the landing fetches the discount column it renders', async () => {
  const source = await readFile(join(repositoryRoot, 'src/pages/landing/landingDress.repository.ts'), 'utf8');
  assert.match(source, /'discount_percent'/, 'the column is selected');
  assert.match(source, /discountPercent:\s*row\.discount_percent/, 'the column is mapped onto the dress');
});

test('the database refuses a percentage outside 0-100 as well', async () => {
  const directory = join(repositoryRoot, 'supabase/migrations');
  const { readdir } = await import('node:fs/promises');
  const files = await readdir(directory);
  const migration = files.find((name) => name.includes('per_piece_discounts'));
  assert.ok(migration, 'the discount migration exists');
  const source = await readFile(join(directory, migration), 'utf8');
  assert.match(source, /discount_percent/);
  assert.match(source, /check/i, 'the column carries a range check');
});

test('the item editor lets the owner type a discount for one piece', async () => {
  const path = join(repositoryRoot, 'src/features/dresses/EditDressModal.tsx');
  const source = await readFile(path, 'utf8');
  assert.match(source, /discountPercent/, 'the field exists');
  assert.match(source, /updateDressCommand/, 'the field is saved through the command surface');
  assert.equal(dirname(path).endsWith('dresses'), true);
});

test('mounting wires the item editor into the inventory and the piece page', async () => {
  const inventory = await readFile(join(repositoryRoot, 'src/features/dresses/DressesPage.tsx'), 'utf8');
  const details = await readFile(join(repositoryRoot, 'src/features/dresses/DressDetailsPage.tsx'), 'utf8');
  assert.match(inventory, /<EditDressModal/, 'the inventory list can open the editor');
  assert.match(details, /<EditDressModal/, 'the piece page can open the editor');
});
