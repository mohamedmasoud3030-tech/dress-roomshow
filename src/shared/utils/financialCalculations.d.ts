export type ReservationRemainingAmountInput = {
  totalAmount: number;
  assessedFeesAmount?: number;
  paidAmount: number;
  settledDepositAmount?: number;
  refundedAmount?: number;
};

export type ReturnSettlementCalculationInput = {
  depositAmount: number;
  depositCollected: number;
  totalCollected: number;
  previouslyRefundedAmount?: number;
  previouslyRefundedDepositAmount?: number;
  lateFee: number;
  damageFee: number;
};

export type ReturnSettlementCalculation = {
  assessedFeesAmount: number;
  availableDepositAmount: number;
  retainedDepositAmount: number;
  refundAmount: number;
  settledDepositAmount: number;
};

export function calculateReservationRemainingAmount(
  input: ReservationRemainingAmountInput,
): number;

export function calculateReturnSettlement(
  input: ReturnSettlementCalculationInput,
): ReturnSettlementCalculation;
