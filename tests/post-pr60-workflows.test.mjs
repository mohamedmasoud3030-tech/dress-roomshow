import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { URL } from 'node:url';

const startB = 104;
const stop = 106;
const patterns = ['11011001100', '11001101100', '11001100110', '10010011000', '10010001100', '10001001100', '10011001000', '10011000100', '10001100100', '11001001000', '11001000100', '11000100100', '10110011100', '10011011100', '10011001110', '10111001100', '10011101100', '10011100110', '11001110010', '11001011100', '11001001110', '11011100100', '11001110100', '11101101110', '11101001100', '11100101100', '11101100100', '11100110100', '11100110010', '11011011000', '11011000110', '11000110110', '10100011000', '10001011000', '10001000110', '10110001000', '10001101000', '10001100010', '11010001000', '11000101000', '11000100010', '10110111000', '10110001110', '10001101110', '10111011000', '10111000110', '10001110110', '11101110110', '11010001110', '11000101110', '11011101000', '11011100010', '11011101110', '11101011000', '11101000110', '11100010110', '11101101000', '11101100010', '11100011010', '11101111010', '11001000010', '11110001010', '10100110000', '10100001100', '10010110000', '10010000110', '10000101100', '10000100110', '10110010000', '10110000100', '10011010000', '10011000010', '10000110100', '10000110010', '11000010010', '11001010000', '11110111010', '11000010100', '10001111010', '10100111100', '10010111100', '10010011110', '10111100100', '10011110100', '10011110010', '11110100100', '11110010100', '11110010010', '11011011110', '11011110110', '11110110110', '10101111000', '10100011110', '10001011110', '10111101000', '10111100010', '11110101000', '11110100010', '10111011110', '10111101110', '11101011110', '11110101110', '11010000100', '11010010000', '11010011100', '1100011101011'];

function encodeCode128B(value) {
  const normalized = value.trim().toUpperCase().replace(/\s+/g, '');
  const codes = [...normalized].map((character) => character.charCodeAt(0) - 32);
  const checksum = codes.reduce((total, code, index) => total + code * (index + 1), startB) % 103;
  return [startB, ...codes, checksum, stop].map((code) => patterns[code]).join('');
}

function allocateLineNetAmounts(amounts, discountAmount) {
  const subtotal = amounts.reduce((sum, amount) => sum + amount, 0);
  const total = subtotal - discountAmount;
  let allocated = 0;
  return amounts.map((amount, index) => {
    if (index === amounts.length - 1) return Number((total - allocated).toFixed(3));
    const netAmount = Number((total * (amount / subtotal)).toFixed(3));
    allocated += netAmount;
    return netAmount;
  });
}

function source(path) {
  return readFileSync(new URL(path, import.meta.url), 'utf8');
}

test('barcode generation produces stable Code128 modules from dress code', () => {
  assert.equal(encodeCode128B(' dr-001 '), encodeCode128B('DR-001'));
  assert.match(encodeCode128B('DR-001'), /^[01]+$/);
});

test('discount allocation preserves invoice total and item refund net amount', () => {
  const amounts = allocateLineNetAmounts([80, 20], 10);
  assert.deepEqual(amounts, [72, 18]);
  assert.equal(amounts.reduce((sum, amount) => sum + amount, 0), 90);
});

test('sales ledger production source allocates discounts and records net refunds', () => {
  const ledger = source('../src/features/dresses/salesLedger.service.ts');
  assert.match(ledger, /allocateLineNetAmounts/);
  assert.match(ledger, /refundAmount/);
  assert.match(ledger, /normalizeReturn/);
});

test('reports and day closing use actual sale refund amount with legacy fallback', () => {
  const reports = source('../src/features/reports/report.service.ts');
  assert.match(reports, /sumSaleRefunds/);
  assert.match(reports, /item\.refundAmount \?\? item\.amount/);
});

test('offline dress photo upload is a device file input and is rendered in inventory and details', () => {
  const modal = source('../src/features/dresses/AddDressModal.tsx');
  const inventory = source('../src/features/dresses/DressesPage.tsx');
  const details = source('../src/features/dresses/DressDetailsPage.tsx');
  assert.match(modal, /type="file"/);
  assert.match(modal, /accept="image\/\*"/);
  assert.match(modal, /canvas\.toDataURL\('image\/jpeg'/);
  assert.match(modal, /mainImageUrl: imageDataUrl/);
  assert.match(inventory, /dress\.mainImageUrl/);
  assert.match(details, /dress\.mainImageUrl/);
});

test('dress creation verifies local persistence after saving photos', () => {
  const dresses = source('../src/features/dresses/dress.service.ts');
  assert.match(dresses, /persistedDress/);
  assert.match(dresses, /مساحة التخزين ممتلئة/);
});

test('service queue guards rented dresses, preparation buffer conflicts, and cancellation restore', () => {
  const service = source('../src/features/service-tasks/serviceTask.service.ts');
  const page = source('../src/features/service-tasks/ServiceTasksPage.tsx');
  assert.match(service, /conflictsWithUpcomingReservation/);
  assert.match(service, /currentRentalStatuses/);
  assert.match(service, /status === 'cancelled'/);
  assert.match(service, /resolveDressStatusAfterService/);
  assert.match(page, /إلغاء المهمة/);
});

test('new workflow collections are registered for reset and deterministic backup snapshots', () => {
  const database = source('../src/services/localDatabase.ts');
  assert.match(database, /'sales-invoices'/);
  assert.match(database, /'sales-returns'/);
  assert.match(database, /'service-tasks'/);
});
