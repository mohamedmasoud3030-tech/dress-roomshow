import { mockCustomers } from './customer.mock';
import type { Customer, CustomerFilters, CustomerSummary } from './customer.types';

export function getCustomers(): Customer[] {
  return mockCustomers;
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
