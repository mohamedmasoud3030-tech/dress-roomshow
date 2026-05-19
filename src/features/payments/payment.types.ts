export type PaymentType = 'rental' | 'deposit' | 'penalty' | 'refund' | 'adjustment';

export type PaymentMethod = 'cash' | 'card' | 'bank_transfer' | 'other';

export type PaymentDirection = 'income' | 'refund';

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
  deposits: number;
  penalties: number;
  totalRefunded: number;
  remainingBalance: number;
};
