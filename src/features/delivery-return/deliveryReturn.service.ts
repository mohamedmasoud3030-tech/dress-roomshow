import { loadLocalDeliveryReturns, saveLocalDeliveryReturn, type LocalDeliveryReturnRecord } from '../../services/localDatabase';
import { deliveryReturnMockRecords } from './deliveryReturn.mock';
import type {
  DeliveryReturnFilters,
  DeliveryReturnRecord,
  DeliveryReturnSummary,
} from './deliveryReturn.types';

export function calculateDepositRefund(
  depositAmount: number,
  lateFee: number,
  damageFee: number,
): number {
  return Math.max(depositAmount - lateFee - damageFee, 0);
}

export function getDeliveryReturnRecords(): DeliveryReturnRecord[] {
  return deliveryReturnMockRecords;
}

export function filterDeliveryReturnRecords(
  records: DeliveryReturnRecord[],
  filters: DeliveryReturnFilters,
): DeliveryReturnRecord[] {
  const normalizedSearch = filters.search.trim().toLowerCase();

  return records.filter((record) => {
    const matchStatus = filters.status === 'all' || record.status === filters.status;

    if (!normalizedSearch) {
      return matchStatus;
    }

    const matchSearch =
      record.reservationNumber.toLowerCase().includes(normalizedSearch) ||
      record.customerName.toLowerCase().includes(normalizedSearch) ||
      record.dressCode.toLowerCase().includes(normalizedSearch) ||
      record.dressName.toLowerCase().includes(normalizedSearch);

    return matchStatus && matchSearch;
  });
}

export function summarizeDeliveryReturnRecords(
  records: DeliveryReturnRecord[],
): DeliveryReturnSummary {
  return records.reduce<DeliveryReturnSummary>(
    (summary, record) => {
      if (record.status === 'pending_delivery') {
        summary.pendingDelivery += 1;
      }

      if (record.status === 'delivered') {
        summary.deliveredOut += 1;
      }

      if (record.status === 'returned') {
        summary.returned += 1;
      }

      if (record.status === 'late' || record.status === 'damaged') {
        summary.lateOrDamaged += 1;
      }

      return summary;
    },
    {
      pendingDelivery: 0,
      deliveredOut: 0,
      returned: 0,
      lateOrDamaged: 0,
    },
  );
}

export async function getDeliveryReturnRecordsFromLocalDb(): Promise<DeliveryReturnRecord[] | null> {
  try {
    const rows = await loadLocalDeliveryReturns();
    if (!rows) {
      return null;
    }

    return rows.map((row) => ({
      ...row,
      status: row.status as DeliveryReturnRecord['status'],
    }));
  } catch {
    return null;
  }
}

export async function addDeliveryReturnToLocalDb(record: DeliveryReturnRecord): Promise<boolean> {
  try {
    const row: LocalDeliveryReturnRecord = {
      ...record,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return await saveLocalDeliveryReturn(row);
  } catch {
    return false;
  }
}
