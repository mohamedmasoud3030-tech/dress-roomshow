import { loadLocalCustomers, saveLocalCustomer, type LocalCustomerRecord } from '../../services/localDatabase';
import { mockCustomers } from './customer.mock';
import type { Customer, CustomerFilters, CustomerSummary } from './customer.types';

export function getCustomers(): Customer[] {
  return mockCustomers;
}

export async function getCustomersFromLocalDb(): Promise<Customer[] | null> {
  try {
    const records = await loadLocalCustomers();
    if (!records) return null;
    return records.map(mapLocalRecordToCustomer);
  } catch {
    return null;
  }
}

export async function addCustomerToLocalDb(customer: Customer): Promise<boolean> {
  try {
    const localRecord: LocalCustomerRecord = {
      ...customer,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return await saveLocalCustomer(localRecord);
  } catch {
    return false;
  }
}

function mapLocalRecordToCustomer(record: LocalCustomerRecord): Customer {
  return {
    id: record.id,
    name: record.name,
    phone: record.phone,
    address: record.address,
    measurements: record.measurements,
    notes: record.notes,
    status: record.status,
    totalReservations: record.totalReservations,
    activeReservations: record.activeReservations,
    totalPaid: record.totalPaid,
    remainingBalance: record.remainingBalance,
    lastReservationDate: record.lastReservationDate,
  };
}

export function filterCustomers(customers: Customer[], filters: CustomerFilters): Customer[] {
  const search = filters.search.trim().toLowerCase();

  return customers.filter((customer) => {
    const matchesSearch =
      !search ||
      customer.name.toLowerCase().includes(search) ||
      customer.phone.toLowerCase().includes(search) ||
      customer.address.toLowerCase().includes(search);

    const matchesStatus = filters.status === 'all' || customer.status === filters.status;
    const matchesBalance =
      filters.balance === 'all' ||
      (filters.balance === 'with_balance' && customer.remainingBalance > 0) ||
      (filters.balance === 'clear' && customer.remainingBalance === 0);

    return matchesSearch && matchesStatus && matchesBalance;
  });
}

export function summarizeCustomers(customers: Customer[]): CustomerSummary {
  return {
    total: customers.length,
    trusted: customers.filter((customer) => customer.status === 'trusted').length,
    withBalance: customers.filter((customer) => customer.remainingBalance > 0).length,
    blockedOrWarning: customers.filter((customer) => customer.status === 'warning' || customer.status === 'blocked').length,
  };
}
