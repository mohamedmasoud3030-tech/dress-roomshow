import type { StoragePort } from './StoragePort';

export class BrowserLocalStorageAdapter implements StoragePort {
  constructor(private readonly storage: Storage) {}

  get length(): number {
    return this.storage.length;
  }

  getItem(key: string): string | null {
    return this.storage.getItem(key);
  }

  setItem(key: string, value: string): void {
    this.storage.setItem(key, value);
  }

  removeItem(key: string): void {
    this.storage.removeItem(key);
  }

  key(index: number): string | null {
    return this.storage.key(index);
  }
}

export function getBrowserLocalStorage(): StoragePort | null {
  if (typeof window === 'undefined') return null;

  try {
    const storage = window.localStorage;
    return storage ? new BrowserLocalStorageAdapter(storage) : null;
  } catch {
    return null;
  }
}
