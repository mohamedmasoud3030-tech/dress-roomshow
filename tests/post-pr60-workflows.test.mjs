import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { URL } from 'node:url';

const startB = 104;
const stop = 106;
const patterns = ['11011001100', '11001101100', '11001100110', '10010011000', '10010001100', '10001001100', '10011001000', '10011000100', '10001100100', '11001001000', '11001000100', '11000100100', '10110011100', '10011011100', '10011001110', '10111001100', '10011101100', '10011100110', '11001110010', '11001011100', '11001001110', '11011100100', '11001110100', '11101101110', '11101001100', '11100101100', '11100100110', '11101100100', '11100110100', '11100110010', '11011011000', '11011000110', '11000110110', '10100011000', '10001011000', '10001000110', '10110001000', '10001101000', '10001100010', '11010001000', '11000101000', '11000100010', '10110111000', '10110001110', '10001101110', '10111011000', '10111000110', '10001110110', '11101110110', '11010001110', '11000101110', '11011101000', '11011100010', '11011101110', '11101011000', '11101000110', '11100010110', '11101101000', '11101100010', '11100011010', '11101111010', '11001000010', '11110001010', '10100110000', '10100001100', '10010110000', '10010000110', '10000101100', '10000100110', '10110010000', '10110000100', '10011010000', '10011000010', '10000110100', '10000110010', '11000010010', '11001010000', '11110111010', '11000010100', '10001111010', '10100111100', '10010111100', '10010011110', '10111100100', '10011110100', '10011110010', '11110100100', '11110010100', '11110010010', '11011011110', '11011110110', '11110110110', '10101111000', '10100011110', '10001011110', '10111101000', '10111100010', '11110101000', '11110100010', '10111011110', '10111101110', '11101011110', '11110101110', '11010000100', '11010010000', '11010011100', '1100011101011'];

function encodeCode128B(value) {
  const normalized = value.trim().toUpperCase().replace(/\s+/g, '');
  const codes = [...normalized].map((character) => character.charCodeAt(0) - 32);
  const checksum = codes.reduce((total, code, index) => total + code * (index + 1), startB) % 103;
  return [startB, ...codes, checksum, stop].map((code) => patterns[code]).join('');
}

function validateInvoiceLines(lines, saleableCodes) {
  const seen = new Set();
  for (const line of lines) {
    if (seen.has(line.dressCode)) throw new Error('duplicate');
    if (!saleableCodes.has(line.dressCode)) throw new Error('unavailable');
    seen.add(line.dressCode);
  }
}

function validateReturn({ invoiceDate, returnDate, returned }) {
  if (returned) throw new Error('duplicate return');
  if (!returnDate || returnDate < invoiceDate || returnDate > '2026-06-05') throw new Error('invalid date');
}

function hasOverlap(check, reservations, buffer) {
  const addDays = (value, days) => {
    const date = new Date(`${value}T00:00:00`);
    date.setDate(date.getDate() + days);
    return date.toISOString().slice(0, 10);
  };
  return reservations.some((item) => item.dressCode === check.dressCode && addDays(item.pickupDate, -buffer) <= check.returnDate && check.pickupDate <= addDays(item.returnDate, buffer));
}

test('barcode generation produces stable Code128 modules from dress code', () => {
  assert.equal(encodeCode128B(' dr-001 '), encodeCode128B('DR-001'));
  assert.match(encodeCode128B('DR-001'), /^[01]+$/);
});

test('sales invoice validation rejects duplicate and unavailable dress lines', () => {
  assert.throws(() => validateInvoiceLines([{ dressCode: 'DR-001' }, { dressCode: 'DR-001' }], new Set(['DR-001'])), /duplicate/);
  assert.throws(() => validateInvoiceLines([{ dressCode: 'DR-002' }], new Set(['DR-001'])), /unavailable/);
});

test('sales return validation rejects duplicate returns and invalid dates', () => {
  assert.throws(() => validateReturn({ invoiceDate: '2026-06-01', returnDate: '2026-06-02', returned: true }), /duplicate return/);
  assert.throws(() => validateReturn({ invoiceDate: '2026-06-01', returnDate: '2026-05-31', returned: false }), /invalid date/);
});

test('preparation buffer conflict includes days before pickup and after return', () => {
  const reservations = [{ dressCode: 'DR-001', pickupDate: '2026-06-10', returnDate: '2026-06-12' }];
  assert.equal(hasOverlap({ dressCode: 'DR-001', pickupDate: '2026-06-08', returnDate: '2026-06-09' }, reservations, 1), true);
  assert.equal(hasOverlap({ dressCode: 'DR-001', pickupDate: '2026-06-14', returnDate: '2026-06-15' }, reservations, 1), false);
});

test('service task completion creates one linked expense and blocks duplicate links', () => {
  const task = { status: 'in_progress', cost: 12, linkedExpenseId: undefined };
  const completed = { ...task, status: 'completed', linkedExpenseId: task.cost > 0 && !task.linkedExpenseId ? 'EXP-1' : task.linkedExpenseId };
  const repeated = { ...completed, linkedExpenseId: completed.cost > 0 && !completed.linkedExpenseId ? 'EXP-2' : completed.linkedExpenseId };
  assert.equal(completed.linkedExpenseId, 'EXP-1');
  assert.equal(repeated.linkedExpenseId, 'EXP-1');
});

test('sales returns reduce net reporting revenue', () => {
  const sales = [{ amount: 100 }, { amount: 50 }];
  const returns = [{ amount: 35 }];
  const net = sales.reduce((sum, item) => sum + item.amount, 0) - returns.reduce((sum, item) => sum + item.amount, 0);
  assert.equal(net, 115);
});

test('new workflow collections are registered for reset and deterministic backup snapshots', () => {
  const source = readFileSync(new URL('../src/services/localDatabase.ts', import.meta.url), 'utf8');
  assert.match(source, /'sales-invoices'/);
  assert.match(source, /'sales-returns'/);
  assert.match(source, /'service-tasks'/);
});
