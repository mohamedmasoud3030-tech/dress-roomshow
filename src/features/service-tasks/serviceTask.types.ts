import type { ExpensePaymentMethod } from '../expenses/expense.types';

export type ServiceTaskType = 'laundry' | 'tailoring' | 'maintenance' | 'inspection';
export type ServiceTaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';

export type ServiceTask = {
  id: string;
  taskNumber: string;
  dressCode: string;
  dressName: string;
  type: ServiceTaskType;
  sentDate: string;
  expectedCompletionDate: string;
  actualCompletionDate?: string;
  cost: number;
  paymentMethod: ExpensePaymentMethod;
  status: ServiceTaskStatus;
  notes?: string;
  linkedExpenseId?: string;
  createdAt: string;
  updatedAt: string;
};

export type ServiceTaskFilters = {
  search: string;
  type: ServiceTaskType | 'all';
  status: ServiceTaskStatus | 'all';
  due: 'all' | 'overdue' | 'today' | 'upcoming';
};
