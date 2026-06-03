import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createDayCloseMethodBreakdown,
  isActiveDayClosing,
} from '../src/shared/utils/dailyClosingCalculations.js';

test('method breakdown subtracts refunds and expenses once', () => {
  assert.deepEqual(
    createDayCloseMethodBreakdown({ collections: 200, refunds: 35, expenses: 45 }),
    { collections: 200, refunds: 35, expenses: 45, net: 120 },
  );
});

test('reopened daily closing no longer blocks new business movements', () => {
  assert.equal(isActiveDayClosing('closed'), true);
  assert.equal(isActiveDayClosing(undefined), true);
  assert.equal(isActiveDayClosing('reopened'), false);
});
