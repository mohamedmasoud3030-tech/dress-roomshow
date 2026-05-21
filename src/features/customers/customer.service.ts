import {
  db_deleteCustomer,
  db_getCustomers,
  db_getReservations,
  db_saveCustomer,
  generateId,
} from '../../services/localDatabase';
import type { Customer, CustomerFilters, CustomerSummary } from './customer.types';

export function getCustomers(): Customer[] {
  return db_getCustomers();
}

export function filterCustomers(customers: Customer[], filters: CustomerFilters): Customer[] {
  const search = filters.search.trim().toLowerCase();
  return customers.filter((c) => {
    const matchSearch =
      !search ||
      c.name.toLowerCase().includes(search) ||
      c.phone.toLowerCase().includes(search) ||
      c.address.toLowerCase().includes(search);
    const matchStatus = filters.status === 'all' || c.status === filters.status;
    const matchBalance =
      filters.balance === 'all' ||
      (filters.balance === 'with_balance' && c.remainingBalance > 0) ||
      (filters.balance === 'clear' && c.remainingBalance === 0);
    return matchSearch && matchStatus && matchBalance;
  });
}

export function summarizeCustomers(customers: Customer[]): CustomerSummary {
  return {
    total: customers.length,
    trusted: customers.filter((c) => c.status === 'trusted').length,
    withBalance: customers.filter((c) => c.remainingBalance > 0).length,
    blockedOrWarning: customers.filter((c) => c.status === 'warning' || c.status === 'blocked').length,
  };
}

type AddCustomerInput = {
  name: string;
  phone: string;
  address: string;
  measurements: string;
  notes?: string;
  status: Customer['status'];
};

export function addCustomer(input: AddCustomerInput): Customer {
  const customer: Customer = {
    ...input,
    id: generateId(),
    totalReservations: 0,
    activeReservations: 0,
    totalPaid: 0,
    remainingBalance: 0,
  };
  db_saveCustomer(customer);
  return customer;
}

export function updateCustomer(id: string, updates: Partial<Customer>): Customer {
  const customers = db_getCustomers();
  const customer = customers.find((c) => c.id === id);
  if (!customer) throw new Error('العميلة غير موجودة');
  const updated = { ...customer, ...updates };
  db_saveCustomer(updated);
  return updated;
}

export function deleteCustomer(id: string): void {
  db_deleteCustomer(id);
}

export function recalcCustomerBalance(customerId: string): void {
  const reservations = db_getReservations();
  const customerReservations = reservations.filter((r) => r.customerId === customerId);
  const activeStatuses = ['pending', 'confirmed', 'delivered', 'overdue'];

  const totalRemaining = customerReservations.reduce((sum, r) => sum + r.remainingAmount, 0);
  const totalPaid = customerReservations.reduce((sum, r) => sum + r.paidAmount, 0);
  const activeReservations = customerReservations.filter((r) =>
    activeStatuses.includes(r.status),
  ).length;

  updateCustomer(customerId, {
    remainingBalance: totalRemaining,
    totalPaid,
    activeReservations,
    totalReservations: customerReservations.length,
  });
}
