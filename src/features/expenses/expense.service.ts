import {
  db_deleteExpense,
  db_getExpenses,
  db_saveExpense,
  generateId,
  generateNumber,
} from '../../services/localDatabase';
import type {
  ExpenseCategory,
  ExpenseFilters,
  ExpensePaymentMethod,
  ExpenseRecord,
  ExpenseSummary,
} from './expense.types';

export function getExpenses(): ExpenseRecord[] {
  return db_getExpenses();
}

export function filterExpenses(expenses: ExpenseRecord[], filters: ExpenseFilters): ExpenseRecord[] {
  const search = filters.search.trim().toLowerCase();
  return expenses.filter((e) => {
    const matchCat = filters.category === 'all' || e.category === filters.category;
    const matchMethod = filters.paymentMethod === 'all' || e.paymentMethod === filters.paymentMethod;
    if (!search) return matchCat && matchMethod;
    const matchSearch =
      e.expenseNumber.toLowerCase().includes(search) ||
      e.title.toLowerCase().includes(search) ||
      (e.relatedDressCode ?? '').toLowerCase().includes(search) ||
      (e.notes ?? '').toLowerCase().includes(search);
    return Boolean(matchCat && matchMethod && matchSearch);
  });
}

export function summarizeExpenses(expenses: ExpenseRecord[]): ExpenseSummary {
  return expenses.reduce<ExpenseSummary>(
    (acc, e) => {
      acc.totalExpenses += e.amount;
      if (e.category === 'laundry') acc.laundryExpenses += e.amount;
      if (e.category === 'tailoring' || e.category === 'maintenance') acc.serviceExpenses += e.amount;
      if (e.category === 'purchase') acc.purchaseExpenses += e.amount;
      if (['rent', 'salary', 'other'].includes(e.category)) acc.otherExpenses += e.amount;
      return acc;
    },
    { totalExpenses: 0, laundryExpenses: 0, serviceExpenses: 0, purchaseExpenses: 0, otherExpenses: 0 },
  );
}

type AddExpenseInput = {
  title: string;
  category: ExpenseCategory;
  amount: number;
  paymentMethod: ExpensePaymentMethod;
  relatedDressCode?: string;
  relatedDressName?: string;
  notes?: string;
};

export function addExpense(input: AddExpenseInput): ExpenseRecord {
  const expense: ExpenseRecord = {
    id: generateId(),
    expenseNumber: generateNumber('EXP'),
    expenseDate: new Date().toISOString().split('T')[0],
    ...input,
  };
  db_saveExpense(expense);
  return expense;
}

export function deleteExpense(id: string): void {
  db_deleteExpense(id);
}

export function formatExpenseCategoryLabel(category: ExpenseCategory): string {
  const labels: Record<ExpenseCategory, string> = {
    laundry: 'غسيل',
    tailoring: 'تعديل وخياطة',
    maintenance: 'صيانة',
    purchase: 'شراء',
    rent: 'إيجار',
    salary: 'رواتب',
    other: 'أخرى',
  };
  return labels[category];
}

export function formatExpensePaymentMethodLabel(method: ExpensePaymentMethod): string {
  const labels: Record<ExpensePaymentMethod, string> = {
    cash: 'نقداً',
    card: 'بطاقة',
    bank_transfer: 'تحويل بنكي',
    other: 'أخرى',
  };
  return labels[method];
}
