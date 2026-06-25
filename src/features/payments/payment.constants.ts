import type { ManualPaymentType, PaymentDirection, PaymentMethod, PaymentType } from './payment.types';

export const PAYMENT_TYPE_LABELS: Record<PaymentType, string> = {
  rental: 'إيجار',
  deposit: 'عربون محصل',
  late_fee: 'رسوم تأخير',
  damage_fee: 'رسوم ضرر',
  deposit_settlement: 'تسوية عربون',
  retained_deposit: 'عربون محتجز',
  penalty: 'غرامة مسددة',
  refund: 'استرجاع نقدي',
  adjustment: 'تسوية مسددة',
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'نقداً',
  card: 'بطاقة',
  bank_transfer: 'تحويل بنكي',
  other: 'قيد غير نقدي / أخرى',
};

export const BASIC_PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  ...PAYMENT_METHOD_LABELS,
  other: 'أخرى',
};

export const PAYMENT_DIRECTION_LABELS: Record<PaymentDirection, string> = {
  income: 'تحصيل',
  refund: 'استرجاع',
  settlement: 'تسوية غير نقدية',
};

export const MANUAL_PAYMENT_TYPES: ManualPaymentType[] = ['rental', 'deposit', 'penalty', 'adjustment', 'refund'];

export const PAYMENT_METHODS: PaymentMethod[] = ['cash', 'card', 'bank_transfer', 'other'];

export const PAYMENT_TYPE_FILTER_OPTIONS: Array<{ value: PaymentType | 'all'; label: string }> = [
  { value: 'all', label: 'كل الأنواع' },
  ...Object.entries(PAYMENT_TYPE_LABELS).map(([value, label]) => ({ value: value as PaymentType, label })),
];

export const PAYMENT_METHOD_FILTER_OPTIONS: Array<{ value: PaymentMethod | 'all'; label: string }> = [
  { value: 'all', label: 'كل وسائل الدفع' },
  ...Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => ({ value: value as PaymentMethod, label })),
];

export const PAYMENT_DIRECTION_FILTER_OPTIONS: Array<{ value: PaymentDirection | 'all'; label: string }> = [
  { value: 'all', label: 'كل الاتجاهات' },
  ...Object.entries(PAYMENT_DIRECTION_LABELS).map(([value, label]) => ({ value: value as PaymentDirection, label })),
];
