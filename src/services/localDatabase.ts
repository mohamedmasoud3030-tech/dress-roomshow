const hasWindow = typeof window !== 'undefined';

function hasLocalStorage(): boolean {
  return hasWindow && typeof window.localStorage !== 'undefined';
}

function getCrypto(): Crypto | undefined {
  if (!hasWindow || typeof globalThis.crypto === 'undefined') {
    return undefined;
  }

  return globalThis.crypto;
}

export function generateId(prefix = 'record'): string {
  const runtimeCrypto = getCrypto();

  if (runtimeCrypto && typeof runtimeCrypto.randomUUID === 'function') {
    return `${prefix}-${runtimeCrypto.randomUUID()}`;
  }

  if (runtimeCrypto && typeof runtimeCrypto.getRandomValues === 'function') {
    const values = new Uint32Array(4);
    runtimeCrypto.getRandomValues(values);
    const randomSegment = Array.from(values, (value) => value.toString(16).padStart(8, '0')).join('');
    return `${prefix}-${randomSegment}`;
  }

  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
}

export function generateNumber(prefix: string, length = 6): string {
  const digits = '0123456789';
  const runtimeCrypto = getCrypto();
  const size = Math.max(1, length);

  if (runtimeCrypto && typeof runtimeCrypto.getRandomValues === 'function') {
    const values = new Uint8Array(size);
    runtimeCrypto.getRandomValues(values);
    const body = Array.from(values, (value) => digits[value % digits.length]).join('');
    return `${prefix}${body}`;
  }

  let fallback = '';
  for (let index = 0; index < size; index += 1) {
    fallback += digits[Math.floor(Math.random() * digits.length)];
  }

  return `${prefix}${fallback}`;
}

export function readAll<T>(key: string): T[] {
  if (!hasLocalStorage()) {
    return [];
  }

  const raw = window.localStorage.getItem(key);
  if (!raw) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed as T[];
  } catch {
    return [];
  }
}

export function writeAll<T>(key: string, records: T[]): void {
  if (!hasLocalStorage()) {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(records));
}
