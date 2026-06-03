import { generateId, readCollection, writeCollection } from '../../services/localDatabase';
import { recordAudit } from '../audit/audit.service';
import { mockDresses } from './dress.mock';
import type { Dress, DressFilters, DressStatus, DressSummary } from './dress.types';

const COLLECTION = 'dresses';

type AddDressInput = Omit<Dress, 'id' | 'code' | 'timesRented'>;

function getNextDressCode(dresses: Dress[]): string {
  const highestCode = dresses.reduce((highest, dress) => {
    const match = /^DR-(\d+)$/.exec(dress.code.trim().toUpperCase());
    if (!match) return highest;
    return Math.max(highest, Number(match[1]));
  }, 0);

  return `DR-${String(highestCode + 1).padStart(3, '0')}`;
}

export function getDresses(): Dress[] {
  return readCollection(COLLECTION, mockDresses);
}

export function updateDressStatus(code: string, status: DressStatus): Dress {
  const dresses = getDresses();
  const dress = dresses.find((item) => item.code === code);
  if (!dress) throw new Error('الفستان المحدد غير موجود.');
  if (dress.status === status) return dress;

  const updatedDress: Dress = {
    ...dress,
    status,
    timesRented: status === 'rented' && dress.status !== 'rented' ? dress.timesRented + 1 : dress.timesRented,
  };

  writeCollection(COLLECTION, dresses.map((item) => (item.id === dress.id ? updatedDress : item)));
  recordAudit({
    action: 'status-change',
    entityType: 'dress',
    entityId: dress.id,
    summary: `تم تغيير حالة الفستان ${dress.code}.`,
    previousValues: { status: dress.status },
    nextValues: { status },
  });
  return updatedDress;
}

export function filterDresses(dresses: Dress[], filters: DressFilters): Dress[] {
  const search = filters.search.trim().toLowerCase();

  return dresses.filter((dress) => {
    const matchesSearch =
      !search ||
      dress.name.toLowerCase().includes(search) ||
      dress.code.toLowerCase().includes(search) ||
      dress.color.toLowerCase().includes(search) ||
      dress.size.toLowerCase().includes(search);

    const matchesStatus = filters.status === 'all' || dress.status === filters.status;
    const matchesCategory = filters.category === 'all' || dress.category === filters.category;
    const matchesUsage =
      filters.usage === 'all' ||
      (filters.usage === 'rent' && dress.isForRent) ||
      (filters.usage === 'sale' && dress.isForSale);

    return matchesSearch && matchesStatus && matchesCategory && matchesUsage;
  });
}

export function summarizeDresses(dresses: Dress[]): DressSummary {
  return {
    total: dresses.length,
    available: dresses.filter((dress) => dress.status === 'available').length,
    rented: dresses.filter((dress) => dress.status === 'rented').length,
    inService: dresses.filter((dress) => dress.status === 'laundry' || dress.status === 'maintenance').length,
  };
}

export function addDress(input: AddDressInput): Dress {
  const dresses = getDresses();
  const name = input.name.trim();
  const color = input.color.trim();
  const size = input.size.trim();

  if (!name) throw new Error('اسم الفستان مطلوب.');
  if (!color) throw new Error('لون الفستان مطلوب.');
  if (!size) throw new Error('مقاس الفستان مطلوب.');
  if (!input.isForRent && !input.isForSale) throw new Error('حددي أن الفستان للبيع أو للإيجار على الأقل.');

  const amounts = [input.purchasePrice, input.rentalPrice, input.salePrice, input.depositAmount];
  if (amounts.some((amount) => !Number.isFinite(amount) || amount < 0)) throw new Error('توجد قيمة مالية غير صالحة.');
  if (input.isForRent && input.rentalPrice <= 0) throw new Error('سعر الإيجار مطلوب للفساتين المتاحة للإيجار.');
  if (input.isForSale && input.salePrice <= 0) throw new Error('سعر البيع مطلوب للفساتين المتاحة للبيع.');

  const dress: Dress = {
    ...input,
    id: generateId(),
    code: getNextDressCode(dresses),
    name,
    color,
    size,
    description: input.description.trim(),
    notes: input.notes?.trim() || undefined,
    timesRented: 0,
  };

  writeCollection(COLLECTION, [dress, ...dresses]);
  recordAudit({
    action: 'create',
    entityType: 'dress',
    entityId: dress.id,
    summary: `تمت إضافة الفستان ${dress.code}.`,
    nextValues: { code: dress.code, status: dress.status, purchasePrice: dress.purchasePrice },
  });
  return dress;
}
