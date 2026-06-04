import { loadLocalDocuments, saveLocalDocument } from '../../services/localDatabase';
import { getTodayISO } from '../../shared/utils/date';
import type { Dress } from '../dresses/dress.types';
import type { ServiceTask, ServiceTaskFilters, ServiceTaskType } from './serviceTask.types';

const tasksKey = 'dress-roomshow:service-tasks';
const activeStatuses = new Set(['open', 'in_progress']);

function readTasks(): ServiceTask[] {
  if (typeof window === 'undefined') return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(tasksKey) ?? '[]') as unknown;
    return Array.isArray(parsed) ? (parsed as ServiceTask[]) : [];
  } catch {
    return [];
  }
}

function writeTasks(tasks: ServiceTask[]): void {
  if (typeof window !== 'undefined') window.localStorage.setItem(tasksKey, JSON.stringify(tasks));
}

export function getServiceTasks(): ServiceTask[] {
  return readTasks();
}

export async function getServiceTasksFromLocalDb(): Promise<ServiceTask[] | null> {
  try {
    return await loadLocalDocuments<ServiceTask>('service-tasks');
  } catch {
    return null;
  }
}

export function filterServiceTasks(tasks: ServiceTask[], filters: ServiceTaskFilters): ServiceTask[] {
  const search = filters.search.trim().toLowerCase();
  return tasks.filter((task) => {
    const matchesType = filters.type === 'all' || task.type === filters.type;
    const matchesStatus = filters.status === 'all' || task.status === filters.status;
    const matchesSearch = !search || task.taskNumber.toLowerCase().includes(search) || task.dressCode.toLowerCase().includes(search) || task.dressName.toLowerCase().includes(search);
    return matchesType && matchesStatus && matchesSearch;
  });
}

export async function createServiceTask(input: { dress: Dress; type: ServiceTaskType; dueDate?: string; notes?: string; existingTasks: ServiceTask[] }): Promise<ServiceTask> {
  if (input.existingTasks.some((task) => task.dressCode === input.dress.code && activeStatuses.has(task.status))) {
    throw new Error('يوجد Task خدمة نشط بالفعل لهذا الفستان.');
  }
  if (input.dress.status === 'sold' || input.dress.status === 'inactive') {
    throw new Error('لا يمكن فتح خدمة لفستان مباع أو غير نشط.');
  }
  if (input.dueDate && input.dueDate < getTodayISO()) throw new Error('تاريخ الاستحقاق لا يمكن أن يكون في الماضي.');

  const task: ServiceTask = {
    id: `service-task-${Date.now()}`,
    taskNumber: `ST-${Date.now()}`,
    dressCode: input.dress.code,
    dressName: input.dress.name,
    type: input.type,
    status: 'open',
    createdDate: getTodayISO(),
    dueDate: input.dueDate || undefined,
    notes: input.notes?.trim() || undefined,
  };
  const tasks = [task, ...readTasks()];
  writeTasks(tasks);
  await saveLocalDocument('service-tasks', task.id, task);
  return task;
}

export async function updateServiceTaskStatus(task: ServiceTask, status: ServiceTask['status']): Promise<ServiceTask> {
  if (task.status === 'completed') throw new Error('لا يمكن تعديل Task مكتمل.');
  const updated = { ...task, status, completedAt: status === 'completed' ? new Date().toISOString() : task.completedAt };
  const tasks = readTasks().map((row) => (row.id === task.id ? updated : row));
  writeTasks(tasks);
  await saveLocalDocument('service-tasks', updated.id, updated);
  return updated;
}
