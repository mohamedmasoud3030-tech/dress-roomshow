import {
  db_getDeliveryReturns,
  db_getReservations,
  db_saveDeliveryReturn,
  db_saveReservation,
  db_updateDressStatus,
  generateId,
  generateNumber,
} from '../../services/localDatabase';
import type {
  DeliveryReturnFilters,
  DeliveryReturnRecord,
  DeliveryReturnStatus,
  DeliveryReturnSummary,
} from './deliveryReturn.types';
import type { Dress } from '../dresses/dress.types';

export function getDeliveryReturnRecords(): DeliveryReturnRecord[] {
  return db_getDeliveryReturns();
}

export function filterDeliveryReturnRecords(
  records: DeliveryReturnRecord[],
  filters: DeliveryReturnFilters,
): DeliveryReturnRecord[] {
  const search = filters.search.trim().toLowerCase();
  return records.filter((r) => {
    const matchStatus = filters.status === 'all' || r.status === filters.status;
    if (!search) return matchStatus;
    const matchSearch =
      r.reservationNumber.toLowerCase().includes(search) ||
      r.customerName.toLowerCase().includes(search) ||
      r.dressCode.toLowerCase().includes(search) ||
      r.dressName.toLowerCase().includes(search);
    return matchStatus && matchSearch;
  });
}

export function summarizeDeliveryReturnRecords(records: DeliveryReturnRecord[]): DeliveryReturnSummary {
  return records.reduce<DeliveryReturnSummary>(
    (s, r) => {
      if (r.status === 'pending_delivery') s.pendingDelivery++;
      if (r.status === 'delivered') s.deliveredOut++;
      if (r.status === 'returned') s.returned++;
      if (r.status === 'late' || r.status === 'damaged') s.lateOrDamaged++;
      return s;
    },
    { pendingDelivery: 0, deliveredOut: 0, returned: 0, lateOrDamaged: 0 },
  );
}

export function calculateDepositRefund(deposit: number, lateFee: number, damageFee: number): number {
  return Math.max(deposit - lateFee - damageFee, 0);
}

type DeliverInput = {
  reservationId: string;
  reservationNumber: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  dressId: string;
  dressCode: string;
  dressName: string;
  depositAmount: number;
  deliveryCondition: string;
  notes?: string;
};

export function recordDelivery(input: DeliverInput): DeliveryReturnRecord {
  const record: DeliveryReturnRecord = {
    id: generateId(),
    reservationId: input.reservationId,
    reservationNumber: input.reservationNumber,
    customerName: input.customerName,
    customerPhone: input.customerPhone,
    dressId: input.dressId,
    dressCode: input.dressCode,
    dressName: input.dressName,
    deliveryDateTime: new Date().toISOString(),
    deliveryCondition: input.deliveryCondition,
    status: 'delivered',
    depositAmount: input.depositAmount,
    lateFee: 0,
    damageFee: 0,
    depositRefundAmount: input.depositAmount,
    notes: input.notes,
  };
  db_saveDeliveryReturn(record);

  const reservations = db_getReservations();
  const res = reservations.find((r) => r.id === input.reservationId);
  if (res) db_saveReservation({ ...res, status: 'delivered' });
  db_updateDressStatus(input.dressId, 'rented');
  return record;
}

type ReturnInput = {
  recordId: string;
  returnCondition: string;
  lateFee: number;
  damageFee: number;
  returnStatus: 'returned' | 'late' | 'damaged';
  dressAfterStatus: Dress['status'];
  notes?: string;
};

export function recordReturn(input: ReturnInput): DeliveryReturnRecord {
  const records = db_getDeliveryReturns();
  const record = records.find((r) => r.id === input.recordId);
  if (!record) throw new Error('سجل التسليم غير موجود');

  const refund = calculateDepositRefund(record.depositAmount, input.lateFee, input.damageFee);
  const updated: DeliveryReturnRecord = {
    ...record,
    returnDateTime: new Date().toISOString(),
    returnCondition: input.returnCondition,
    lateFee: input.lateFee,
    damageFee: input.damageFee,
    depositRefundAmount: refund,
    status: input.returnStatus,
    notes: input.notes ?? record.notes,
  };
  db_saveDeliveryReturn(updated);

  const reservations = db_getReservations();
  const res = reservations.find((r) => r.id === record.reservationId);
  if (res) db_saveReservation({ ...res, status: 'returned' });
  db_updateDressStatus(record.dressId, input.dressAfterStatus);
  return updated;
}

export function getDeliveredReservations(): DeliveryReturnRecord[] {
  return db_getDeliveryReturns().filter((r) => r.status === 'delivered');
}
