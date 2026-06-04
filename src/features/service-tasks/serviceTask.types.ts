export type ServiceTaskType = 'laundry' | 'tailoring' | 'maintenance';
export type ServiceTaskStatus = 'open' | 'in_progress' | 'completed';

export type ServiceTask = {
  id: string;
  taskNumber: string;
  dressCode: string;
  dressName: string;
  type: ServiceTaskType;
  status: ServiceTaskStatus;
  createdDate: string;
  dueDate?: string;
  notes?: string;
  completedAt?: string;
  linkedExpenseId?: string;
};

export type ServiceTaskFilters = {
  type: ServiceTaskType | 'all';
  status: ServiceTaskStatus | 'all';
  search: string;
};
