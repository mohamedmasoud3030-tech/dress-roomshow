/**
 * localDatabase.ts — Primary data adapter
 *
 * Architecture:
 *  - In Tauri desktop: will use window.__TAURI__.invoke() to call Rust/SQLite commands
 *  - In web/PWA fallback: uses localStorage (offline-first)
 *
 * All feature services import ONLY from this file — never directly from localStorage or Tauri.
 * This boundary makes the switch to real SQLite a single-file change.
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

function readAll<T>(key: Key): T[] {
  try {
    const raw = localStorage.getItem(KEYS[key]);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

function writeAll<T>(key: Key, items: T[]): void {
  localStorage.setItem(KEYS[key], JSON.stringify(items));
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
  const all = readAll<{ id: string }>(key);
  writeAll(key, all.filter((x) => x.id !== id));
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export function generateNumber(prefix: string): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const rnd = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${prefix}-${yyyy}${mm}${dd}-${rnd}`;
}

/* ─── Dresses ─────────────────────────────────────────────────────────────── */

export function db_getDresses(): Dress[] {
  return readAll<Dress>('dresses');
}

export function db_saveDress(dress: Dress): void {
  upsert<Dress>('dresses', dress);
}

export function db_deleteDress(id: string): void {
  remove('dresses', id);
}

export function db_updateDressStatus(id: string, status: Dress['status']): void {
  const all = readAll<Dress>('dresses');
  const dress = all.find((d) => d.id === id);
  if (dress) {
    dress.status = status;
    writeAll('dresses', all);
  }
}

/* ─── Customers ────────────────────────────────────────────────────────────── */

export function db_getCustomers(): Customer[] {
  return readAll<Customer>('customers');
}

export function db_saveCustomer(customer: Customer): void {
  upsert<Customer>('customers', customer);
}

export function db_deleteCustomer(id: string): void {
  remove('customers', id);
}

/* ─── Reservations ─────────────────────────────────────────────────────────── */

export function db_getReservations(): Reservation[] {
  return readAll<Reservation>('reservations');
}

export function db_saveReservation(reservation: Reservation): void {
  upsert<Reservation>('reservations', reservation);
}

export function db_deleteReservation(id: string): void {
  remove('reservations', id);
}

/* ─── Payments ─────────────────────────────────────────────────────────────── */

export function db_getPayments(): PaymentRecord[] {
  return readAll<PaymentRecord>('payments');
}

export function db_savePayment(payment: PaymentRecord): void {
  upsert<PaymentRecord>('payments', payment);
}

/* ─── Delivery / Return ────────────────────────────────────────────────────── */

export function db_getDeliveryReturns(): DeliveryReturnRecord[] {
  return readAll<DeliveryReturnRecord>('deliveryReturns');
}

export function db_saveDeliveryReturn(record: DeliveryReturnRecord): void {
  upsert<DeliveryReturnRecord>('deliveryReturns', record);
}

/* ─── Expenses ─────────────────────────────────────────────────────────────── */

export function db_getExpenses(): ExpenseRecord[] {
  return readAll<ExpenseRecord>('expenses');
}

export function db_saveExpense(expense: ExpenseRecord): void {
  upsert<ExpenseRecord>('expenses', expense);
}

export function db_deleteExpense(id: string): void {
  remove('expenses', id);
}
