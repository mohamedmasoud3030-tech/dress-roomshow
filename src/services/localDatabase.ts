/**
 * localDatabase.ts — Primary data adapter (localStorage / Tauri SQLite)
 *
 * All feature services import ONLY from this file.
 * Switch to Tauri SQLite: change only this file.
 */
import type { Customer } from '../features/customers/customer.types';
import type { DeliveryReturnRecord } from '../features/delivery-return/deliveryReturn.types';
import type { Dress } from '../features/dresses/dress.types';
import type { ExpenseRecord } from '../features/expenses/expense.types';
import type { PaymentRecord } from '../features/payments/payment.types';
import type { Reservation } from '../features/reservations/reservation.types';

const KEYS = {
  dresses: 'droomshow_dresses',
  customers: 'droomshow_customers',
  reservations: 'droomshow_reservations',
  payments: 'droomshow_payments',
  deliveryReturns: 'droomshow_delivery_returns',
  expenses: 'droomshow_expenses',
} as const;

type Key = keyof typeof KEYS;

let fallbackCounter = 0;

function getStorage(): Storage | null {
  if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
    return null;
  }

  return window.localStorage;
}

function getRuntimeCrypto(): Crypto | null {
  if (typeof globalThis.crypto === 'undefined') {
    return null;
  }

  return globalThis.crypto;
}

function nextFallbackSegment(): string {
  fallbackCounter = (fallbackCounter + 1) % Number.MAX_SAFE_INTEGER;
  const timestamp = Date.now().toString(36);
  const counter = fallbackCounter.toString(36).padStart(4, '0');
  return `${timestamp}${counter}`;
}

function readAll<T>(key: Key): T[] {
  const storage = getStorage();
  if (!storage) {
    return [];
  }

  const raw = storage.getItem(KEYS[key]);
  if (!raw) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function writeAll<T>(key: Key, items: T[]): void {
  const storage = getStorage();
  if (!storage) {
    return;
  }

  storage.setItem(KEYS[key], JSON.stringify(items));
}

function upsert<T extends { id: string }>(key: Key, item: T): void {
  const all = readAll<T>(key);
  const idx = all.findIndex((x) => x.id === item.id);
  if (idx >= 0) {
    all[idx] = item;
  } else {
    all.push(item);
  }
  writeAll(key, all);
}

function remove(key: Key, id: string): void {
  writeAll(key, readAll<{ id: string }>(key).filter((x) => x.id !== id));
}

export function generateId(): string {
  const runtimeCrypto = getRuntimeCrypto();

  if (runtimeCrypto && typeof runtimeCrypto.randomUUID === 'function') {
    return runtimeCrypto.randomUUID();
  }

  if (runtimeCrypto && typeof runtimeCrypto.getRandomValues === 'function') {
    const arr = new Uint32Array(2);
    runtimeCrypto.getRandomValues(arr);
    return `${Date.now().toString(36)}${arr[0].toString(36)}${arr[1].toString(36)}`;
  }

  return `local-${nextFallbackSegment()}`;
}

export function generateNumber(prefix: string): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const runtimeCrypto = getRuntimeCrypto();
  let sequence: number;

  if (runtimeCrypto && typeof runtimeCrypto.getRandomValues === 'function') {
    const arr = new Uint16Array(1);
    runtimeCrypto.getRandomValues(arr);
    sequence = arr[0] % 1000;
  } else {
    fallbackCounter = (fallbackCounter + 1) % 1000;
    sequence = fallbackCounter;
  }

  const ref = sequence.toString().padStart(3, '0');
  return `${prefix}-${yyyy}${mm}${dd}-${ref}`;
}

// Dresses
export const db_getDresses = (): Dress[] => readAll<Dress>('dresses');
export const db_saveDress = (d: Dress): void => upsert<Dress>('dresses', d);
export const db_deleteDress = (id: string): void => remove('dresses', id);
export function db_updateDressStatus(id: string, status: Dress['status']): void {
  const all = readAll<Dress>('dresses');
  const d = all.find((x) => x.id === id);
  if (d) {
    d.status = status;
    writeAll('dresses', all);
  }
}
// Customers
export const db_getCustomers = (): Customer[] => readAll<Customer>('customers');
export const db_saveCustomer = (c: Customer): void => upsert<Customer>('customers', c);
export const db_deleteCustomer = (id: string): void => remove('customers', id);
// Reservations
export const db_getReservations = (): Reservation[] => readAll<Reservation>('reservations');
export const db_saveReservation = (r: Reservation): void => upsert<Reservation>('reservations', r);
export const db_deleteReservation = (id: string): void => remove('reservations', id);
// Payments
export const db_getPayments = (): PaymentRecord[] => readAll<PaymentRecord>('payments');
export const db_savePayment = (p: PaymentRecord): void => upsert<PaymentRecord>('payments', p);
// Delivery/Return
export const db_getDeliveryReturns = (): DeliveryReturnRecord[] => readAll<DeliveryReturnRecord>('deliveryReturns');
export const db_saveDeliveryReturn = (r: DeliveryReturnRecord): void => upsert<DeliveryReturnRecord>('deliveryReturns', r);
// Expenses
export const db_getExpenses = (): ExpenseRecord[] => readAll<ExpenseRecord>('expenses');
export const db_saveExpense = (e: ExpenseRecord): void => upsert<ExpenseRecord>('expenses', e);
export const db_deleteExpense = (id: string): void => remove('expenses', id);
