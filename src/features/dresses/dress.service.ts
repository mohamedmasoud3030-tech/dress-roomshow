import { mockDresses } from './dress.mock';
import type { Dress, DressFilters, DressSummary } from './dress.types';

export function getDresses(): Dress[] {
  return mockDresses;
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
