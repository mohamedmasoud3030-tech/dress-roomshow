import { generateId, readCollection, writeCollection } from '../../services/localDatabase';
import { mockCustomers } from './customer.mock';
import type { Customer, CustomerFilters, CustomerSummary } from './customer.types';

const COLLECTION = 'customers';

type AddCustomerInput = {
  name: string;
  phone: string;
  address?: string;
  measurements?: string;
  notes?: string;
  status: Customer['status'];
};

function normalizePhone(value: string): string {
  return value.replace(/\D/g, '');
}

export function getCustomers(): Customer[] {
  return readCollection(COLLECTION, mockCustomers);
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

export function addCustomer(input: AddCustomerInput): Customer {
  const customers = getCustomers();
  const name = input.name.trim();
  const phone = input.phone.trim();
  const normalizedPhone = normalizePhone(phone);

  if (!name) throw new Error('اسم العميلة مطلوب.');
  if (normalizedPhone.length < 7) throw new Error('رقم الهاتف غير صالح.');
  if (customers.some((customer) => normalizePhone(customer.phone) === normalizedPhone)) {
    throw new Error('يوجد سجل عميلة بنفس رقم الهاتف.');
  }

  const customer: Customer = {
    id: generateId(),
    name,
    phone,
    address: input.address?.trim() || '',
    measurements: input.measurements?.trim() || '',
    notes: input.notes?.trim() || undefined,
    status: input.status,
    totalReservations: 0,
    activeReservations: 0,
    totalPaid: 0,
    remainingBalance: 0,
  };

  writeCollection(COLLECTION, [customer, ...customers]);
  return customer;
}
