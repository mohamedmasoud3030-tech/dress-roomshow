import type { ExpenseCategory, ExpensePaymentMethod } from './expense.types';

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  laundry: 'غسيل',
  tailoring: 'تعديل وخياطة',
  maintenance: 'صيانة',
  purchase: 'شراء',
  rent: 'إيجار',
  salary: 'رواتب',
  other: 'أخرى',
};

export const EXPENSE_PAYMENT_METHOD_LABELS: Record<ExpensePaymentMethod, string> = {
  cash: 'نقداً',
  card: 'بطاقة',
  bank_transfer: 'تحويل بنكي',
  other: 'أخرى',
};

export const EXPENSE_CATEGORIES = Object.keys(EXPENSE_CATEGORY_LABELS) as ExpenseCategory[];

export const EXPENSE_PAYMENT_METHODS = Object.keys(EXPENSE_PAYMENT_METHOD_LABELS) as ExpensePaymentMethod[];

export const EXPENSE_CATEGORY_FILTER_OPTIONS: Array<{ value: ExpenseCategory | 'all'; label: string }> = [
  { value: 'all', label: 'كل الفئات' },
  ...EXPENSE_CATEGORIES.map((value) => ({ value, label: EXPENSE_CATEGORY_LABELS[value] })),
];

export const EXPENSE_PAYMENT_METHOD_FILTER_OPTIONS: Array<{ value: ExpensePaymentMethod | 'all'; label: string }> = [
  { value: 'all', label: 'كل وسائل الدفع' },
  ...EXPENSE_PAYMENT_METHODS.map((value) => ({ value, label: EXPENSE_PAYMENT_METHOD_LABELS[value] })),
];
