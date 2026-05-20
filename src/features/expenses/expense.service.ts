import { loadLocalExpenses, saveLocalExpense, type LocalExpenseRecord } from '../../services/localDatabase';
import { expenseMockRecords } from './expense.mock';
import type {
  ExpenseCategory,
  ExpenseFilters,
  ExpensePaymentMethod,
  ExpenseRecord,
  ExpenseSummary,
} from './expense.types';

export function getExpenses(): ExpenseRecord[] {
  return expenseMockRecords;
}

export function filterExpenses(expenses: ExpenseRecord[], filters: ExpenseFilters): ExpenseRecord[] {
  const normalizedSearch = filters.search.trim().toLowerCase();

  return expenses.filter((expense) => {
    const matchesCategory = filters.category === 'all' || expense.category === filters.category;
    const matchesPaymentMethod =
      filters.paymentMethod === 'all' || expense.paymentMethod === filters.paymentMethod;

    if (!normalizedSearch) {
      return matchesCategory && matchesPaymentMethod;
    }

    const matchesSearch =
      expense.expenseNumber.toLowerCase().includes(normalizedSearch) ||
      expense.title.toLowerCase().includes(normalizedSearch) ||
      expense.relatedDressCode?.toLowerCase().includes(normalizedSearch) ||
      expense.relatedDressName?.toLowerCase().includes(normalizedSearch) ||
      expense.notes?.toLowerCase().includes(normalizedSearch);

    return Boolean(matchesCategory && matchesPaymentMethod && matchesSearch);
  });
}

export function summarizeExpenses(expenses: ExpenseRecord[]): ExpenseSummary {
  return expenses.reduce<ExpenseSummary>(
    (acc, expense) => {
      acc.totalExpenses += expense.amount;

      if (expense.category === 'laundry') {
        acc.laundryExpenses += expense.amount;
      }

      if (expense.category === 'tailoring' || expense.category === 'maintenance') {
        acc.serviceExpenses += expense.amount;
      }

      if (expense.category === 'purchase') {
        acc.purchaseExpenses += expense.amount;
      }

      if (expense.category === 'rent' || expense.category === 'salary' || expense.category === 'other') {
        acc.otherExpenses += expense.amount;
      }

      return acc;
    },
    {
      totalExpenses: 0,
      laundryExpenses: 0,
      serviceExpenses: 0,
      purchaseExpenses: 0,
      otherExpenses: 0,
    },
  );
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

export async function getExpensesFromLocalDb(): Promise<ExpenseRecord[] | null> {
  try {
    const rows = await loadLocalExpenses();
    if (!rows) return null;
    return rows.map((row) => ({
      id: row.id,
      expenseNumber: row.expenseNumber,
      expenseDate: row.expenseDate,
      title: row.title,
      category: row.category as ExpenseRecord['category'],
      amount: row.amount,
      paymentMethod: row.paymentMethod as ExpenseRecord['paymentMethod'],
      relatedDressCode: row.relatedDressCode,
      relatedDressName: row.relatedDressName,
      notes: row.notes,
    }));
  } catch {
    return null;
  }
}

export async function addExpenseToLocalDb(expense: ExpenseRecord): Promise<boolean> {
  try { const row: LocalExpenseRecord = { ...expense, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }; return await saveLocalExpense(row); } catch { return false; }
}
