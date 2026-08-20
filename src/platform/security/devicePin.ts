import { getBrowserLocalStorage, type StoragePort } from '@platform/storage';

const DEVICE_PIN_STORAGE_KEY = 'lena:device-security:pin:v1';
const PIN_THROTTLE_STORAGE_KEY = 'lena:device-security:pin-throttle:v1';
const PIN_PATTERN = /^\d{6}$/;
const PIN_HASH_ITERATIONS = 210_000;
const PIN_HASH_BYTES = 32;

/**
 * Guess-limiting for the device lock. The verifier already costs ~0.1-0.3 s
 * per attempt; this throttle exists for the realistic case: a borrowed phone
 * and a handful of obvious guesses (123456, birth years). Device-local only —
 * backups, imports, and resets must neither copy nor clear it, exactly like
 * the PIN verifier itself.
 */
export const PIN_MAX_ATTEMPTS_BEFORE_LOCKOUT = 5;
export const PIN_LOCKOUT_BASE_SECONDS = 30;
export const PIN_LOCKOUT_MAX_LEVEL = 5; // 30s, 60s, 120s, 240s, then capped at 480s

type PinThrottleState = {
  failures: number;
  lockLevel: number;
  lockedUntil: number | null;
};

export type PinUnlockAttempt =
  | { status: 'unlocked' }
  | { status: 'wrong'; attemptsRemaining: number }
  | { status: 'locked'; retryAfterSeconds: number };

type StoredDevicePin = {
  version: 1;
  iterations: number;
  salt: string;
  verifier: string;
};

function getCrypto(): Crypto {
  if (!globalThis.crypto?.subtle) {
    throw new Error('لا يدعم هذا الجهاز حماية رقم القفل. حدّث المتصفح أو التطبيق ثم حاولي مجدداً.');
  }
  return globalThis.crypto;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('');
}

function hexToBytes(value: string): Uint8Array | null {
  if (!/^(?:[0-9a-f]{2})+$/i.test(value)) return null;
  return Uint8Array.from(value.match(/.{2}/g) ?? [], (pair) => Number.parseInt(pair, 16));
}

function parseStoredPin(value: string | null): StoredDevicePin | null {
  if (!value) return null;

  try {
    const parsed: unknown = JSON.parse(value);
    if (
      typeof parsed !== 'object'
      || parsed === null
      || Array.isArray(parsed)
      || (parsed as Record<string, unknown>).version !== 1
      || !Number.isInteger((parsed as Record<string, unknown>).iterations)
      || Number((parsed as Record<string, unknown>).iterations) < 100_000
      || typeof (parsed as Record<string, unknown>).salt !== 'string'
      || typeof (parsed as Record<string, unknown>).verifier !== 'string'
    ) {
      return null;
    }

    const stored = parsed as StoredDevicePin;
    if (!hexToBytes(stored.salt) || !hexToBytes(stored.verifier)) return null;
    return stored;
  } catch {
    return null;
  }
}

function assertValidPin(pin: string): void {
  if (!PIN_PATTERN.test(pin)) {
    throw new Error('أدخلي رقم قفل من 6 أرقام.');
  }
}

async function deriveVerifier(pin: string, salt: Uint8Array, iterations: number): Promise<string> {
  const crypto = getCrypto();
  const material = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(pin),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
    material,
    PIN_HASH_BYTES * 8,
  );
  return bytesToHex(new Uint8Array(bits));
}

function constantTimeEquals(first: string, second: string): boolean {
  if (first.length !== second.length) return false;
  let difference = 0;
  for (let index = 0; index < first.length; index += 1) {
    difference |= first.charCodeAt(index) ^ second.charCodeAt(index);
  }
  return difference === 0;
}

/**
 * Device protection is intentionally separate from the operational database:
 * a backup, import, or showroom-data reset must never copy or silently remove
 * the lock of the physical device it is opened on.
 */
export function hasDevicePin(): boolean {
  const storage = getBrowserLocalStorage();
  return Boolean(storage && parseStoredPin(storage.getItem(DEVICE_PIN_STORAGE_KEY)));
}

/** Stores only a salted PBKDF2 verifier; the PIN is never persisted. */
export async function configureDevicePin(pin: string): Promise<void> {
  assertValidPin(pin);
  const storage = getBrowserLocalStorage();
  if (!storage) throw new Error('تعذر الوصول إلى التخزين الآمن لهذا الجهاز.');

  const crypto = getCrypto();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const verifier = await deriveVerifier(pin, salt, PIN_HASH_ITERATIONS);
  const stored: StoredDevicePin = {
    version: 1,
    iterations: PIN_HASH_ITERATIONS,
    salt: bytesToHex(salt),
    verifier,
  };

  storage.setItem(DEVICE_PIN_STORAGE_KEY, JSON.stringify(stored));
  storage.removeItem(PIN_THROTTLE_STORAGE_KEY);
}

export async function verifyDevicePin(pin: string): Promise<boolean> {
  if (!PIN_PATTERN.test(pin)) return false;
  const storage = getBrowserLocalStorage();
  const stored = storage ? parseStoredPin(storage.getItem(DEVICE_PIN_STORAGE_KEY)) : null;
  if (!stored) return false;

  const salt = hexToBytes(stored.salt);
  if (!salt) return false;
  const verifier = await deriveVerifier(pin, salt, stored.iterations);
  return constantTimeEquals(verifier, stored.verifier);
}

export async function changeDevicePin(currentPin: string, nextPin: string): Promise<void> {
  assertPinNotLocked();
  if (!(await verifyDevicePin(currentPin))) {
    throw new Error('رقم القفل الحالي غير صحيح.');
  }
  await configureDevicePin(nextPin);
}

export async function removeDevicePin(currentPin: string): Promise<void> {
  assertPinNotLocked();
  if (!(await verifyDevicePin(currentPin))) {
    throw new Error('رقم القفل الحالي غير صحيح.');
  }
  getBrowserLocalStorage()?.removeItem(DEVICE_PIN_STORAGE_KEY);
  getBrowserLocalStorage()?.removeItem(PIN_THROTTLE_STORAGE_KEY);
}

function readThrottleState(storage: StoragePort | null): PinThrottleState {
  if (!storage) return { failures: 0, lockLevel: 0, lockedUntil: null };
  try {
    const raw = storage.getItem(PIN_THROTTLE_STORAGE_KEY);
    if (!raw) return { failures: 0, lockLevel: 0, lockedUntil: null };
    const parsed = JSON.parse(raw) as Partial<PinThrottleState>;
    return {
      failures: Number.isInteger(parsed.failures) && (parsed.failures as number) > 0 ? (parsed.failures as number) : 0,
      lockLevel: Number.isInteger(parsed.lockLevel) && (parsed.lockLevel as number) > 0 ? (parsed.lockLevel as number) : 0,
      lockedUntil:
        typeof parsed.lockedUntil === 'number' && Number.isFinite(parsed.lockedUntil)
          ? parsed.lockedUntil
          : null,
    };
  } catch {
    return { failures: 0, lockLevel: 0, lockedUntil: null };
  }
}

function writeThrottleState(storage: StoragePort | null, state: PinThrottleState): void {
  if (!storage) return;
  if (state.failures === 0 && state.lockLevel === 0 && state.lockedUntil === null) {
    storage.removeItem(PIN_THROTTLE_STORAGE_KEY);
    return;
  }
  storage.setItem(PIN_THROTTLE_STORAGE_KEY, JSON.stringify(state));
}

function lockoutDurationSeconds(lockLevel: number): number {
  const steps = Math.min(Math.max(lockLevel, 1), PIN_LOCKOUT_MAX_LEVEL) - 1;
  return PIN_LOCKOUT_BASE_SECONDS * 2 ** steps;
}

/** Seconds until the device accepts PIN attempts again; 0 when not locked. */
export function getPinLockoutSecondsRemaining(now: number = Date.now()): number {
  const state = readThrottleState(getBrowserLocalStorage());
  if (state.lockedUntil === null || state.lockedUntil <= now) return 0;
  return Math.ceil((state.lockedUntil - now) / 1000);
}

export function buildPinLockoutMessage(seconds: number): string {
  return `محاولات كثيرة خاطئة. الجهاز مقفل مؤقتاً — أعيدي المحاولة بعد ${seconds} ثانية.`;
}

function assertPinNotLocked(now: number = Date.now()): void {
  const seconds = getPinLockoutSecondsRemaining(now);
  if (seconds > 0) throw new Error(buildPinLockoutMessage(seconds));
}

/**
 * The unlock path used by the lock screen. A locked device refuses attempts
 * without even deriving (no free oracle); success clears the throttle record;
 * five consecutive wrong attempts escalate a temporary lock with exponential
 * backoff so the realistic quick-guess attack dies here.
 */
export async function verifyDevicePinWithThrottle(
  pin: string,
  now: number = Date.now(),
): Promise<PinUnlockAttempt> {
  const storage = getBrowserLocalStorage();
  const state = readThrottleState(storage);

  if (state.lockedUntil !== null && state.lockedUntil > now) {
    return { status: 'locked', retryAfterSeconds: Math.ceil((state.lockedUntil - now) / 1000) };
  }

  if (await verifyDevicePin(pin)) {
    // Success clears the retry counter, but the escalation level persists:
    // a borrowed-phone attacker may not buy longer lockouts early, and the
    // legitimate owner is bounded by the 8-minute cap if she mistyped a lot.
    writeThrottleState(storage, { failures: 0, lockLevel: state.lockLevel, lockedUntil: null });
    return { status: 'unlocked' };
  }

  const failures = state.failures + 1;
  if (failures >= PIN_MAX_ATTEMPTS_BEFORE_LOCKOUT) {
    const lockLevel = Math.min(state.lockLevel + 1, PIN_LOCKOUT_MAX_LEVEL);
    const durationSeconds = lockoutDurationSeconds(lockLevel);
    writeThrottleState(storage, { failures: 0, lockLevel, lockedUntil: now + durationSeconds * 1000 });
    return { status: 'locked', retryAfterSeconds: durationSeconds };
  }

  writeThrottleState(storage, { ...state, failures });
  return { status: 'wrong', attemptsRemaining: PIN_MAX_ATTEMPTS_BEFORE_LOCKOUT - failures };
}
