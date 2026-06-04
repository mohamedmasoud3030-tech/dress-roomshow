import assert from 'node:assert/strict';
import test from 'node:test';
import { createCode128Svg } from '../src/features/dresses/barcode.ts';
import { validateInvoiceDraft } from '../src/features/dresses/salesLedger.validation.ts';
import type { Dress } from '../src/features/dresses/dress.types.ts';

const availableDress: Dress = {
  id: 'dress-test-1',
  code: 'DR-TEST-1',
  name: 'فستان اختبار',
  description: 'اختبار',
  category: 'سهرة',
  color: 'أزرق',
  size: 'M',
  purchasePrice: 10,
  rentalPrice: 5,
  salePrice: 25,
  depositAmount: 5,
  status: 'available',
  isForRent: true,
  isForSale: true,
  timesRented: 0,
};

test('Code 128 barcode label encodes the exact dress code text', () => {
  const svg = createCode128Svg(availableDress.code);
  assert.match(svg, /DR-TEST-1/);
  assert.match(svg, /<rect/);
});

test('invoice validation rejects duplicate, unavailable, and non-positive sale items', () => {
  const unavailableDress: Dress = { ...availableDress, id: 'dress-test-2', code: 'DR-TEST-2', status: 'reserved' };
  const errors = validateInvoiceDraft({
    customerName: 'عميلة اختبار',
    invoiceDate: '2026-05-19',
    dresses: [availableDress, unavailableDress],
    items: [
      { id: 'item-1', dressCode: availableDress.code, dressName: availableDress.name, unitPrice: 25 },
      { id: 'item-2', dressCode: availableDress.code, dressName: availableDress.name, unitPrice: 20 },
      { id: 'item-3', dressCode: unavailableDress.code, dressName: unavailableDress.name, unitPrice: 20 },
      { id: 'item-4', dressCode: 'DR-MISSING', dressName: 'مفقود', unitPrice: 0 },
    ],
  });

  assert.ok(errors.some((error) => error.includes('مكرر')));
  assert.ok(errors.some((error) => error.includes('غير متاح للبيع')));
  assert.ok(errors.some((error) => error.includes('أكبر من صفر')));
});
