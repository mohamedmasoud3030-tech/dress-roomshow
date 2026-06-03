import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateReservationRemainingAmount,
  calculateReturnSettlement,
} from '../src/shared/utils/financialCalculations.js';

function remainingAfterReturn({ totalAmount, paidAmount, settlement, refundedAmount = settlement.refundAmount }) {
  return calculateReservationRemainingAmount({
    totalAmount,
    assessedFeesAmount: settlement.assessedFeesAmount,
    paidAmount,
    settledDepositAmount: settlement.settledDepositAmount,
    refundedAmount,
  });
}

test('full collected deposit refunds only the unretained amount while preserving the snapshot', () => {
  const settlement = calculateReturnSettlement({
    depositAmount: 50,
    depositCollected: 50,
    totalCollected: 150,
    previouslyRefundedAmount: 0,
    lateFee: 10,
    damageFee: 0,
  });

  assert.deepEqual(settlement, {
    assessedFeesAmount: 10,
    availableDepositAmount: 50,
    retainedDepositAmount: 10,
    refundAmount: 40,
    settledDepositAmount: 50,
  });
  assert.equal(remainingAfterReturn({ totalAmount: 150, paidAmount: 150, settlement }), 0);
});

test('fees above the collected deposit retain the deposit and leave the excess fee outstanding', () => {
  const settlement = calculateReturnSettlement({
    depositAmount: 50,
    depositCollected: 50,
    totalCollected: 150,
    previouslyRefundedAmount: 0,
    lateFee: 80,
    damageFee: 0,
  });

  assert.equal(settlement.retainedDepositAmount, 50);
  assert.equal(settlement.refundAmount, 0);
  assert.equal(remainingAfterReturn({ totalAmount: 150, paidAmount: 150, settlement }), 30);
});

test('partial deposit collection refunds only the amount actually collected and closes the deposit obligation', () => {
  const settlement = calculateReturnSettlement({
    depositAmount: 50,
    depositCollected: 20,
    totalCollected: 120,
    previouslyRefundedAmount: 0,
    lateFee: 0,
    damageFee: 0,
  });

  assert.equal(settlement.refundAmount, 20);
  assert.equal(settlement.settledDepositAmount, 50);
  assert.equal(remainingAfterReturn({ totalAmount: 150, paidAmount: 120, settlement }), 0);
});

test('unpaid deposit is closed without creating a cash refund', () => {
  const settlement = calculateReturnSettlement({
    depositAmount: 50,
    depositCollected: 0,
    totalCollected: 100,
    previouslyRefundedAmount: 0,
    lateFee: 0,
    damageFee: 0,
  });

  assert.equal(settlement.refundAmount, 0);
  assert.equal(settlement.settledDepositAmount, 50);
  assert.equal(remainingAfterReturn({ totalAmount: 150, paidAmount: 100, settlement }), 0);
});

test('a rental balance remains due after a collected deposit is refunded', () => {
  const settlement = calculateReturnSettlement({
    depositAmount: 50,
    depositCollected: 50,
    totalCollected: 50,
    previouslyRefundedAmount: 0,
    lateFee: 0,
    damageFee: 0,
  });

  assert.equal(settlement.refundAmount, 50);
  assert.equal(remainingAfterReturn({ totalAmount: 150, paidAmount: 50, settlement }), 100);
});

test('a prior generic refund limits net cash but does not blindly erase the tracked deposit balance', () => {
  const settlement = calculateReturnSettlement({
    depositAmount: 50,
    depositCollected: 50,
    totalCollected: 150,
    previouslyRefundedAmount: 20,
    previouslyRefundedDepositAmount: 0,
    lateFee: 0,
    damageFee: 0,
  });

  assert.equal(settlement.availableDepositAmount, 50);
  assert.equal(settlement.refundAmount, 50);
});

test('a prior explicit deposit refund is deducted from the refundable deposit balance', () => {
  const settlement = calculateReturnSettlement({
    depositAmount: 50,
    depositCollected: 50,
    totalCollected: 150,
    previouslyRefundedAmount: 20,
    previouslyRefundedDepositAmount: 20,
    lateFee: 0,
    damageFee: 0,
  });

  assert.equal(settlement.availableDepositAmount, 30);
  assert.equal(settlement.refundAmount, 30);
});
