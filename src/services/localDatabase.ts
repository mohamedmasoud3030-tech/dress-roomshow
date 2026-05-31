const STORAGE_PREFIX = 'dress-roomshow';

const memoryCollections = new Map<string, unknown[]>();
let fallbackCounter = 0;

function getStorage(): Storage | null {
  if (typeof window === 'undefined') return null;

  try {
    return window.localStorage ?? null;
  } catch {
    return null;
  }
}

function cloneItems<T>(items: T[]): T[] {
  return JSON.parse(JSON.stringify(items)) as T[];
}

function getCollectionKey(collection: string): string {
  return `${STORAGE_PREFIX}:${collection}`;
}

export function readCollection<T>(collection: string, fallback: T[] = []): T[] {
  const key = getCollectionKey(collection);
  const storage = getStorage();

  if (!storage) {
    const cached = memoryCollections.get(key) as T[] | undefined;
    if (cached) return cloneItems(cached);

    const initial = cloneItems(fallback);
    memoryCollections.set(key, initial);
    return cloneItems(initial);
  }

  try {
    const raw = storage.getItem(key);
    if (!raw) return cloneItems(fallback);

    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : cloneItems(fallback);
  } catch {
    return cloneItems(fallback);
  }
}

export function writeCollection<T>(collection: string, items: T[]): void {
  const key = getCollectionKey(collection);
  const snapshot = cloneItems(items);
  memoryCollections.set(key, snapshot);

  const storage = getStorage();
  if (!storage) return;

  try {
    storage.setItem(key, JSON.stringify(snapshot));
  } catch {
    // Persistence failures must not crash the offline-first UI.
  }
}

export function generateId(): string {
  const runtimeCrypto = globalThis.crypto;
  if (runtimeCrypto && typeof runtimeCrypto.randomUUID === 'function') {
    try {
      return runtimeCrypto.randomUUID();
    } catch {
      // Fall back to a deterministic local identifier.
    }
  }

  fallbackCounter = (fallbackCounter + 1) % Number.MAX_SAFE_INTEGER;
  return `local-${Date.now().toString(36)}-${fallbackCounter.toString(36)}`;
}

export function generateNumber(prefix: string): string {
  const now = new Date();
  const date = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('');
  const time = [
    String(now.getHours()).padStart(2, '0'),
    String(now.getMinutes()).padStart(2, '0'),
    String(now.getSeconds()).padStart(2, '0'),
  ].join('');

  fallbackCounter = (fallbackCounter + 1) % 1000;
  return `${prefix}-${date}-${time}-${fallbackCounter.toString().padStart(3, '0')}`;
}
