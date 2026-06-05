import { generateId, generateNumber, readCollection, writeCollection } from '../../services/localDatabase';
import { getTodayISO } from '../../shared/utils/date';
import { recordAudit } from '../audit/audit.service';
import { getDresses, updateDressStatus } from '../dresses/dress.service';
import { addExpense } from '../expenses/expense.service';
import type { ExpenseCategory } from '../expenses/expense.types';
import { getReservations } from '../reservations/reservation.service';
import type { ServiceTask, ServiceTaskFilters, ServiceTaskStatus, ServiceTaskType } from './serviceTask.types';

const COLLECTION = 'service-tasks';
const activeStatuses = new Set<ServiceTaskStatus>(['pending', 'in_progress']);

type CreateServiceTaskInput = {
  dressCode: string;
  type: ServiceTaskType;
  sentDate: string;
  expectedCompletionDate: string;
  cost: number;
  paymentMethod: ServiceTask['paymentMethod'];
  notes?: string;
};

type UpdateServiceTaskInput = Partial<Pick<ServiceTask, 'expectedCompletionDate' | 'actualCompletionDate' | 'cost' | 'paymentMethod' | 'notes' | 'status'>>;

function serviceDressStatus(type: ServiceTaskType) {
  return type === 'laundry' ? 'laundry' : 'maintenance';
}

function expenseCategory(type: ServiceTaskType): ExpenseCategory {
  return type === 'laundry' ? 'laundry' : type === 'tailoring' ? 'tailoring' : 'maintenance';
}

function normalizeStatus(status?: ServiceTaskStatus): ServiceTaskStatus {
  return status ?? 'pending';
}

export function getServiceTasks(): ServiceTask[] {
  return readCollection<ServiceTask>(COLLECTION, []);
}

export function getActiveServiceTasksForDress(dressCode: string): ServiceTask[] {
  return getServiceTasks().filter((task) => task.dressCode === dressCode && activeStatuses.has(task.status));
}

export function createServiceTask(input: CreateServiceTaskInput): ServiceTask {
  const dress = getDresses().find((item) => item.code === input.dressCode);
  const now = new Date().toISOString();
  if (!dress) throw new Error('الفستان المحدد غير موجود.');
  if (dress.status === 'sold' || dress.status === 'inactive') throw new Error('لا يمكن إنشاء مهمة خدمة لفستان مباع أو غير نشط.');
  if (getActiveServiceTasksForDress(dress.code).length > 0) throw new Error('يوجد بالفعل مهمة خدمة نشطة لهذا الفستان.');
  if (!input.sentDate || input.sentDate > getTodayISO()) throw new Error('تاريخ الإرسال غير صالح.');
  if (!input.expectedCompletionDate || input.expectedCompletionDate < input.sentDate) throw new Error('تاريخ الإنجاز المتوقع غير صالح.');
  if (!Number.isFinite(input.cost) || input.cost < 0) throw new Error('تكلفة الخدمة غير صالحة.');

  const task: ServiceTask = {
    id: generateId(),
    taskNumber: generateNumber('SRV'),
    dressCode: dress.code,
    dressName: dress.name,
    type: input.type,
    sentDate: input.sentDate,
    expectedCompletionDate: input.expectedCompletionDate,
    cost: input.cost,
    paymentMethod: input.paymentMethod,
    status: 'in_progress',
    notes: input.notes?.trim() || undefined,
    createdAt: now,
    updatedAt: now,
  };

  writeCollection(COLLECTION, [task, ...getServiceTasks()]);
  updateDressStatus(dress.code, serviceDressStatus(task.type));
  recordAudit({ action: 'create', entityType: 'service-task', entityId: task.id, summary: `تم إنشاء مهمة الخدمة ${task.taskNumber} للفستان ${task.dressCode}.`, nextValues: { type: task.type, expectedCompletionDate: task.expectedCompletionDate, cost: task.cost } });
  return task;
}

export function updateServiceTask(id: string, input: UpdateServiceTaskInput): ServiceTask {
  const tasks = getServiceTasks();
  const task = tasks.find((item) => item.id === id);
  if (!task) throw new Error('مهمة الخدمة غير موجودة.');

  const status = normalizeStatus(input.status ?? task.status);
  const actualCompletionDate = input.actualCompletionDate ?? task.actualCompletionDate;
  const cost = input.cost ?? task.cost;
  if (input.expectedCompletionDate && input.expectedCompletionDate < task.sentDate) throw new Error('تاريخ الإنجاز المتوقع غير صالح.');
  if (actualCompletionDate && actualCompletionDate < task.sentDate) throw new Error('تاريخ الإنجاز الفعلي غير صالح.');
  if (!Number.isFinite(cost) || cost < 0) throw new Error('تكلفة الخدمة غير صالحة.');

  let next: ServiceTask = { ...task, ...input, status, cost, actualCompletionDate, notes: input.notes?.trim() || task.notes, updatedAt: new Date().toISOString() };

  if (status === 'completed') {
    const completionDate = actualCompletionDate ?? getTodayISO();
    next = { ...next, actualCompletionDate: completionDate };
    if (next.cost > 0 && !next.linkedExpenseId) {
      const expense = addExpense({ expenseDate: completionDate, title: `تكلفة خدمة ${next.taskNumber}`, category: expenseCategory(next.type), amount: next.cost, paymentMethod: next.paymentMethod, relatedDressCode: next.dressCode, notes: next.notes });
      next = { ...next, linkedExpenseId: expense.id };
    }
    const hasFutureReservation = getReservations().some((reservation) => reservation.dressCode === next.dressCode && ['pending', 'confirmed'].includes(reservation.status) && reservation.returnDate >= getTodayISO());
    updateDressStatus(next.dressCode, hasFutureReservation ? 'reserved' : 'available');
  }

  writeCollection(COLLECTION, tasks.map((item) => item.id === id ? next : item));
  recordAudit({ action: status === 'completed' ? 'return' : 'update', entityType: 'service-task', entityId: next.id, summary: status === 'completed' ? `تم إكمال مهمة الخدمة ${next.taskNumber}.` : `تم تحديث مهمة الخدمة ${next.taskNumber}.`, previousValues: { status: task.status, cost: task.cost }, nextValues: { status: next.status, cost: next.cost, linkedExpenseId: next.linkedExpenseId } });
  return next;
}

export function filterServiceTasks(tasks: ServiceTask[], filters: ServiceTaskFilters): ServiceTask[] {
  const today = getTodayISO();
  const search = filters.search.trim().toLowerCase();
  return tasks.filter((task) => {
    const matchesSearch = !search || [task.taskNumber, task.dressCode, task.dressName, task.notes ?? ''].some((value) => value.toLowerCase().includes(search));
    const matchesType = filters.type === 'all' || task.type === filters.type;
    const matchesStatus = filters.status === 'all' || task.status === filters.status;
    const matchesDue = filters.due === 'all' || (filters.due === 'overdue' && activeStatuses.has(task.status) && task.expectedCompletionDate < today) || (filters.due === 'today' && task.expectedCompletionDate === today) || (filters.due === 'upcoming' && task.expectedCompletionDate > today);
    return matchesSearch && matchesType && matchesStatus && matchesDue;
  });
}
