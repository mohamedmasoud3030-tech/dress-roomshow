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

export type LocalDressRecord = {
  id: string;
  code: string;
  name: string;
  description: string;
  category: string;
  color: string;
  size: string;
  purchasePrice: number;
  rentalPrice: number;
  salePrice: number;
  depositAmount: number;
  status: string;
  isForRent: boolean;
  isForSale: boolean;
  mainImageUrl?: string;
  timesRented: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type LocalReservationRecord = {
  id: string;
  reservationNumber: string;
  customerName: string;
  customerPhone: string;
  dressCode: string;
  dressName: string;
  pickupDate: string;
  returnDate: string;
  status: string;
  rentalPrice: number;
  depositAmount: number;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type LocalPaymentRecord = {
  id: string;
  paymentNumber: string;
  reservationNumber: string;
  customerName: string;
  dressCode: string;
  dressName: string;
  paymentDate: string;
  paymentType: string;
  method: string;
  direction: string;
  amount: number;
  reservationTotal: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type LocalExpenseRecord = {
  id: string;
  expenseNumber: string;
  expenseDate: string;
  title: string;
  category: string;
  amount: number;
  paymentMethod: string;
  relatedDressCode?: string;
  relatedDressName?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type LocalDeliveryReturnRecord = {
  id: string;
  reservationNumber: string;
  customerName: string;
  customerPhone?: string;
  dressCode: string;
  dressName: string;
  deliveryDateTime?: string;
  deliveryCondition?: string;
  returnDateTime?: string;
  returnCondition?: string;
  status: string;
  depositAmount: number;
  lateFee: number;
  damageFee: number;
  depositRefundAmount: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

type NullableOptionalRecord<T extends Record<string, unknown>> = {
  [K in keyof T]: T[K] extends string | undefined ? string | null : T[K];
};

export type LocalDocumentCollection = 'sales-invoices' | 'sales-returns' | 'service-tasks';

type LocalDocumentRecord<T> = {
  id: string;
  collection: LocalDocumentCollection;
  payload: T;
  createdAt: string;
  updatedAt: string;
};

const isTauriRuntime = () =>
  typeof globalThis !== 'undefined' &&
  typeof globalThis.window !== 'undefined' &&
  '__TAURI_INTERNALS__' in globalThis.window;

const nullifyOptionalStrings = <T extends Record<string, unknown>>(
  record: T,
): NullableOptionalRecord<T> => {
  return Object.fromEntries(
    Object.entries(record).map(([key, value]) => [key, value ?? null]),
  ) as NullableOptionalRecord<T>;
};

export async function initializeLocalDatabase(): Promise<boolean> {
  if (!isTauriRuntime()) return false;
  await invoke('init_local_database');
  return true;
}

export async function loadLocalCustomers(): Promise<LocalCustomerRecord[] | null> {
  if (!isTauriRuntime()) return null;
  return await invoke<LocalCustomerRecord[]>('list_customers');
}

export async function saveLocalCustomer(customer: LocalCustomerRecord): Promise<boolean> {
  if (!isTauriRuntime()) return false;
  await invoke('insert_customer', { customer: nullifyOptionalStrings(customer) });
  return true;
}

export async function loadLocalDresses(): Promise<LocalDressRecord[] | null> {
  if (!isTauriRuntime()) return null;
  return await invoke<LocalDressRecord[]>('list_dresses');
}

export async function saveLocalDress(dress: LocalDressRecord): Promise<boolean> {
  if (!isTauriRuntime()) return false;
  await invoke('insert_dress', { dress: nullifyOptionalStrings(dress) });
  return true;
}

export async function loadLocalReservations(): Promise<LocalReservationRecord[] | null> {
  if (!isTauriRuntime()) return null;
  return await invoke<LocalReservationRecord[]>('list_reservations');
}

export async function saveLocalReservation(reservation: LocalReservationRecord): Promise<boolean> {
  if (!isTauriRuntime()) return false;
  await invoke('insert_reservation', { reservation: nullifyOptionalStrings(reservation) });
  return true;
}

export async function loadLocalPayments(): Promise<LocalPaymentRecord[] | null> {
  if (!isTauriRuntime()) return null;
  return await invoke<LocalPaymentRecord[]>('list_payments');
}

export async function saveLocalPayment(payment: LocalPaymentRecord): Promise<boolean> {
  if (!isTauriRuntime()) return false;
  await invoke('insert_payment', { payment: nullifyOptionalStrings(payment) });
  return true;
}

export async function loadLocalExpenses(): Promise<LocalExpenseRecord[] | null> {
  if (!isTauriRuntime()) return null;
  return await invoke<LocalExpenseRecord[]>('list_expenses');
}

export async function saveLocalExpense(expense: LocalExpenseRecord): Promise<boolean> {
  if (!isTauriRuntime()) return false;
  await invoke('insert_expense', { expense: nullifyOptionalStrings(expense) });
  return true;
}

export async function loadLocalDeliveryReturns(): Promise<LocalDeliveryReturnRecord[] | null> {
  if (!isTauriRuntime()) return null;
  return await invoke<LocalDeliveryReturnRecord[]>('list_delivery_returns');
}

export async function saveLocalDeliveryReturn(record: LocalDeliveryReturnRecord): Promise<boolean> {
  if (!isTauriRuntime()) return false;
  await invoke('insert_delivery_return', { record: nullifyOptionalStrings(record) });
  return true;
}

export async function loadLocalDocuments<T>(collection: LocalDocumentCollection): Promise<T[] | null> {
  if (!isTauriRuntime()) return null;
  const rows = await invoke<Array<LocalDocumentRecord<T>>>('list_local_documents', { collection });
  return rows.map((row) => row.payload);
}

export async function saveLocalDocument<T>(collection: LocalDocumentCollection, id: string, payload: T): Promise<boolean> {
  if (!isTauriRuntime()) return false;
  const now = new Date().toISOString();
  await invoke('insert_local_document', {
    document: { id, collection, payload, createdAt: now, updatedAt: now },
  });
  return true;
}
