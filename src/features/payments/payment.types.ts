export type PaymentType =
  | 'rental'
  | 'deposit'
  | 'late_fee'
  | 'damage_fee'
  | 'deposit_settlement'
  | 'penalty'
  | 'refund'
  | 'adjustment';

export type ManualPaymentType = 'rental' | 'deposit' | 'penalty' | 'refund' | 'adjustment';

export type PaymentMethod = 'cash' | 'card' | 'bank_transfer' | 'other';

export type PaymentDirection = 'income' | 'refund' | 'settlement';

export type PaymentRecord = {
  id: string;
  paymentNumber: string;
  reservationNumber: string;
  customerName: string;
  dressCode: string;
  dressName: string;
  paymentDate: string;
  type: PaymentType;
  method: PaymentMethod;
  direction: PaymentDirection;
  amount: number;
  reservationTotal: number;
  source?: 'manual' | 'return';
  notes?: string;
};

export type PaymentFilters = {
  search: string;
  type: PaymentType | 'all';
  method: PaymentMethod | 'all';
  direction: PaymentDirection | 'all';
};

export type PaymentSummary = {
  totalCollected: number;
  rentalCollected: number;
  deposits: number;
  retainedDeposits: number;
  penalties: number;
  lateFees: number;
  damageFees: number;
  totalRefunded: number;
  remainingBalance: number;
};
