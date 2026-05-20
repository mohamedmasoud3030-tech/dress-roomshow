import {
  db_deleteDress,
  db_getDresses,
  db_saveDress,
  db_updateDressStatus,
  generateId,
  generateNumber,
} from '../../services/localDatabase';
import type { Dress, DressFilters, DressSummary } from './dress.types';

export function getDresses(): Dress[] {
  return db_getDresses();
}

export function filterDresses(dresses: Dress[], filters: DressFilters): Dress[] {
  const search = filters.search.trim().toLowerCase();
  return dresses.filter((d) => {
    const matchSearch =
      !search ||
      d.name.toLowerCase().includes(search) ||
      d.code.toLowerCase().includes(search) ||
      d.color.toLowerCase().includes(search) ||
      d.size.toLowerCase().includes(search);
    const matchStatus = filters.status === 'all' || d.status === filters.status;
    const matchCat = filters.category === 'all' || d.category === filters.category;
    const matchUsage =
      filters.usage === 'all' ||
      (filters.usage === 'rent' && d.isForRent) ||
      (filters.usage === 'sale' && d.isForSale);
    return matchSearch && matchStatus && matchCat && matchUsage;
  });
}

export function summarizeDresses(dresses: Dress[]): DressSummary {
  return {
    total: dresses.length,
    available: dresses.filter((d) => d.status === 'available').length,
    rented: dresses.filter((d) => d.status === 'rented').length,
    inService: dresses.filter((d) => d.status === 'laundry' || d.status === 'maintenance').length,
  };
}

type AddDressInput = Omit<Dress, 'id' | 'code' | 'timesRented'>;

export function addDress(input: AddDressInput): Dress {
  const existing = db_getDresses();
  const nextNum = String(existing.length + 1).padStart(3, '0');
  const dress: Dress = {
    ...input,
    id: generateId(),
    code: generateNumber('DR').slice(-8),
    timesRented: 0,
  };
  dress.code = `DR-${nextNum}`;
  db_saveDress(dress);
  return dress;
}

export function updateDress(id: string, updates: Partial<Dress>): Dress {
  const dresses = db_getDresses();
  const dress = dresses.find((d) => d.id === id);
  if (!dress) throw new Error('فستان غير موجود');
  const updated = { ...dress, ...updates };
  db_saveDress(updated);
  return updated;
}

export function deleteDress(id: string): void {
  db_deleteDress(id);
}

export function updateDressStatus(id: string, status: Dress['status']): void {
  db_updateDressStatus(id, status);
}
