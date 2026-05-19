import { customerMockRecords } from './customer.mock';
import type { CustomerRecord } from './customer.types';

export function getCustomers(): CustomerRecord[] {
  return customerMockRecords;
}
