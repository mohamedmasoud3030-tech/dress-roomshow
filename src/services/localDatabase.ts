import { invoke } from '@tauri-apps/api/core';

export type LocalCustomerRecord = {
  id: string;
  name: string;
  phone: string;
  address: string;
  measurements: string;
  notes?: string;
  status: 'normal' | 'trusted' | 'warning' | 'blocked';
  totalReservations: number;
  activeReservations: number;
  totalPaid: number;
  remainingBalance: number;
  lastReservationDate?: string;
  createdAt: string;
  updatedAt: string;
};

const isTauriRuntime = () => typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

const toDbRecord = (customer: LocalCustomerRecord) => ({
  id: customer.id,
  name: customer.name,
  phone: customer.phone,
  address: customer.address,
  measurements: customer.measurements,
  notes: customer.notes ?? null,
  status: customer.status,
  totalReservations: customer.totalReservations,
  activeReservations: customer.activeReservations,
  totalPaid: customer.totalPaid,
  remainingBalance: customer.remainingBalance,
  lastReservationDate: customer.lastReservationDate ?? null,
  createdAt: customer.createdAt,
  updatedAt: customer.updatedAt,
});

export async function initializeLocalDatabase(): Promise<boolean> {
  if (!isTauriRuntime()) return false;
  await invoke('init_local_database');
  return true;
}

export async function loadLocalCustomers(): Promise<LocalCustomerRecord[] | null> {
  if (!isTauriRuntime()) return null;
  const customers = await invoke<LocalCustomerRecord[]>('list_customers');
  return customers;
}

export async function saveLocalCustomer(customer: LocalCustomerRecord): Promise<boolean> {
  if (!isTauriRuntime()) return false;
  await invoke('insert_customer', { customer: toDbRecord(customer) });
  return true;
}
