function normalizeAmount(value) {
  return Number.isFinite(value) && value >= 0 ? value : 0;
}

export function calculateReservationRemainingAmount(input) {
  const totalAmount = normalizeAmount(input.totalAmount);
  const assessedFeesAmount = normalizeAmount(input.assessedFeesAmount);
  const paidAmount = normalizeAmount(input.paidAmount);
  const settledDepositAmount = normalizeAmount(input.settledDepositAmount);
  const refundedAmount = normalizeAmount(input.refundedAmount);

  return Math.max(totalAmount + assessedFeesAmount - paidAmount - settledDepositAmount + refundedAmount, 0);
}

export function calculateReturnSettlement(input) {
  const depositAmount = normalizeAmount(input.depositAmount);
  const depositCollected = Math.min(normalizeAmount(input.depositCollected), depositAmount);
  const previouslyRefundedAmount = normalizeAmount(input.previouslyRefundedAmount);
  const lateFee = normalizeAmount(input.lateFee);
  const damageFee = normalizeAmount(input.damageFee);
  const availableDepositAmount = Math.max(depositCollected - previouslyRefundedAmount, 0);
  const assessedFeesAmount = lateFee + damageFee;
  const retainedDepositAmount = Math.min(availableDepositAmount, assessedFeesAmount);

  return {
    assessedFeesAmount,
    availableDepositAmount,
    retainedDepositAmount,
    refundAmount: Math.max(availableDepositAmount - retainedDepositAmount, 0),
    settledDepositAmount: depositAmount,
  };
}
