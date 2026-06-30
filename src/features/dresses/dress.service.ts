import { Dress, DressFilters } from './dress.types';

const DRESSES_KEY = 'lena_dresses';

function getDressesFromStorage(): Dress[] {
  try {
    const data = localStorage.getItem(DRESSES_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveDressesToStorage(dresses: Dress[]): void {
  localStorage.setItem(DRESSES_KEY, JSON.stringify(dresses));
}

export function getDresses(): Dress[] {
  return getDressesFromStorage();
}

export function getDressesAsync(): Promise<Dress[]> {
  // Returns a promise for future IndexedDB compatibility
  return Promise.resolve(getDressesFromStorage());
}

export function getDressByCode(code: string): Dress | undefined {
  const dresses = getDressesFromStorage();
  return dresses.find(d => d.code === code);
}

export function addDress(input: Omit<Dress, 'id' | 'code' | 'timesRented'>): Dress {
  const dresses = getDressesFromStorage();
  
  const newDress: Dress = {
    ...input,
    itemType: input.itemType ?? 'dress',
    id: `dress-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    code: `D${String(dresses.length + 1).padStart(3, '0')}`,
    timesRented: 0,
  };

  dresses.push(newDress);
  saveDressesToStorage(dresses);
  return newDress;
}

export function updateDress(code: string, updates: Partial<Dress>): Dress | null {
  const dresses = getDressesFromStorage();
  const index = dresses.findIndex(d => d.code === code);
  
  if (index === -1) return null;

  dresses[index] = {
    ...dresses[index],
    ...updates,
  };

  saveDressesToStorage(dresses);
  return dresses[index];
}

export function updateDressStatus(code: string, status: Dress['status']): Dress | null {
  return updateDress(code, { status });
}

export function filterDresses(filters?: Partial<DressFilters>): Dress[] {
  let dresses = getDresses();

  if (filters?.search) {
    const normalizedSearch = filters.search.trim().toLowerCase();
    dresses = dresses.filter((dress) =>
      [dress.name, dress.code, dress.color, dress.size]
        .some((value) => value.toLowerCase().includes(normalizedSearch)),
    );
  }

  if (filters?.status && filters.status !== 'all') {
    dresses = dresses.filter((dress) => dress.status === filters.status);
  }

  if (filters?.itemType && filters.itemType !== 'all') {
    dresses = dresses.filter((dress) => (dress.itemType ?? 'dress') === filters.itemType);
  }

  if (filters?.category && filters.category !== 'all') {
    dresses = dresses.filter((dress) => dress.category === filters.category);
  }

  if (filters?.usage === 'rent') {
    dresses = dresses.filter((dress) => dress.isForRent);
  }

  if (filters?.usage === 'sale') {
    dresses = dresses.filter((dress) => dress.isForSale);
  }

  return dresses;
}

export function summarizeDresses(): { total: number; available: number; rented: number; inService: number } {
  const dresses = getDresses();
  
  return {
    total: dresses.length,
    available: dresses.filter(d => d.status === 'available').length,
    rented: dresses.filter(d => d.status === 'rented').length,
    inService: dresses.filter(d => d.status === 'laundry' || d.status === 'maintenance').length,
  };
}

export function deleteDress(code: string): boolean {
  const dresses = getDressesFromStorage();
  const filtered = dresses.filter(d => d.code !== code);
  
  if (filtered.length === dresses.length) return false;

  saveDressesToStorage(filtered);
  return true;
}
