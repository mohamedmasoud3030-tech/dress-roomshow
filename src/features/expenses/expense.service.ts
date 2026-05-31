import { generateId, generateNumber, readCollection, writeCollection } from '../../services/localDatabase';
import { getTodayISO } from '../../shared/utils/date';
import { getDresses } from '../dresses/dress.service';
import { expenseMockRecords } from './expense.mock';
import type {
  ExpenseCategory,
  ExpenseFilters,
  ExpensePaymentMethod,
  ExpenseRecord,
  ExpenseSummary,
} from './expense.types';

const COLLECTION = 'expenses';

type AddExpenseInput = {
  expenseDate: string;
  title: string;
  category: ExpenseCategory;
  amount: number;
  paymentMethod: ExpensePaymentMethod;
  relatedDressCode?: string;
  notes?: string;
};

export function getExpenses(): ExpenseRecord[] {
  return readCollection(COLLECTION, expenseMockRecords);
}

export function addExpense(input: AddExpenseInput): ExpenseRecord {
  const title = input.title.trim();
  const relatedDress = input.relatedDressCode
    ? getDresses().find((dress) => dress.code === input.relatedDressCode)
    : undefined;

  if (!title) throw new Error('عنوان المصروف مطلوب.');
  if (!input.expenseDate) throw new Error('تاريخ المصروف مطلوب.');
  if (input.expenseDate > getTodayISO()) throw new Error('تاريخ المصروف لا يمكن أن يكون في المستقبل.');
  if (!Number.isFinite(input.amount) || input.amount <= 0) throw new Error('قيمة المصروف يجب أن تكون أكبر من صفر.');
  if (input.relatedDressCode && !relatedDress) throw new Error('الفستان المحدد غير موجود.');

  const expense: ExpenseRecord = {
    id: generateId(),
    expenseNumber: generateNumber('EXP'),
    expenseDate: input.expenseDate,
    title,
    category: input.category,
    amount: input.amount,
    paymentMethod: input.paymentMethod,
    relatedDressCode: relatedDress?.code,
    relatedDressName: relatedDress?.name,
    notes: input.notes?.trim() || undefined,
  };

  writeCollection(COLLECTION, [expense, ...getExpenses()]);
  return expense;
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
