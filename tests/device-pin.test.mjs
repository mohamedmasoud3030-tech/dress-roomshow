import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { URL } from 'node:url';
import {
  buildPinLockoutMessage,
  changeDevicePin,
  configureDevicePin,
  getPinLockoutSecondsRemaining,
  hasDevicePin,
  PIN_LOCKOUT_BASE_SECONDS,
  PIN_MAX_ATTEMPTS_BEFORE_LOCKOUT,
  removeDevicePin,
  verifyDevicePin,
  verifyDevicePinWithThrottle,
} from '../src/platform/security/devicePin.ts';
import {
  exportDatabaseBackupAsync,
  importDatabaseBackupAsync,
  resetDatabase,
} from '../src/engines/persistence/persistenceEngine.ts';
import { installStorage, uninstallStorage } from './helpers/storage.mjs';

test('a device PIN is stored as a salted verifier, never as the entered PIN', async () => {
  const storage = installStorage();
  try {
    assert.ok(globalThis.crypto?.subtle, 'the supported runtime must provide Web Crypto');
    await configureDevicePin('482915');

    assert.equal(hasDevicePin(), true);
    assert.equal(await verifyDevicePin('482915'), true);
    assert.equal(await verifyDevicePin('482916'), false);

    const saved = storage.get('lena:device-security:pin:v1');
    assert.ok(saved);
    assert.doesNotMatch(saved, /482915/);
    assert.match(saved, /"salt":"[0-9a-f]+"/i);
    assert.match(saved, /"verifier":"[0-9a-f]+"/i);
  } finally {
    uninstallStorage();
  }
});

test('a device PIN rejects malformed values and requires the current PIN to change or remove it', async () => {
  installStorage();
  try {
    await assert.rejects(() => configureDevicePin('1234'), /6 أرقام/);
    await configureDevicePin('482915');

    await assert.rejects(() => changeDevicePin('000000', '592814'), /الحالي غير صحيح/);
    await changeDevicePin('482915', '592814');
    assert.equal(await verifyDevicePin('482915'), false);
    assert.equal(await verifyDevicePin('592814'), true);

    await assert.rejects(() => removeDevicePin('482915'), /الحالي غير صحيح/);
    await removeDevicePin('592814');
    assert.equal(hasDevicePin(), false);
  } finally {
    uninstallStorage();
  }
});

test('a malformed stored PIN never unlocks the application or crashes startup', async () => {
  const storage = installStorage({
    'lena:device-security:pin:v1': '{not-json',
  });
  try {
    assert.equal(hasDevicePin(), false);
    assert.equal(await verifyDevicePin('482915'), false);
    assert.equal(storage.get('lena:device-security:pin:v1'), '{not-json');
  } finally {
    uninstallStorage();
  }
});

test('showroom backup import and reset never copy or remove the physical device PIN', async () => {
  const storage = installStorage();
  try {
    await configureDevicePin('482915');
    const backup = await exportDatabaseBackupAsync();

    resetDatabase();
    assert.equal(await verifyDevicePin('482915'), true);
    assert.equal(storage.has('lena:device-security:pin:v1'), true);

    await importDatabaseBackupAsync(backup);
    assert.equal(await verifyDevicePin('482915'), true);
    assert.equal(storage.has('lena:device-security:pin:v1'), true);
  } finally {
    uninstallStorage();
  }
});

test('five wrong attempts lock the device, and even the correct PIN is refused while locked', async () => {
  installStorage();
  try {
    await configureDevicePin('482915');
    const t0 = 1_700_000_000_000;

    for (let attempt = 1; attempt < PIN_MAX_ATTEMPTS_BEFORE_LOCKOUT; attempt += 1) {
      const result = await verifyDevicePinWithThrottle('000000', t0);
      assert.equal(result.status, 'wrong');
      assert.equal(result.attemptsRemaining, PIN_MAX_ATTEMPTS_BEFORE_LOCKOUT - attempt);
    }

    const locked = await verifyDevicePinWithThrottle('000000', t0);
    assert.equal(locked.status, 'locked');
    assert.equal(locked.retryAfterSeconds, PIN_LOCKOUT_BASE_SECONDS);
    assert.equal(getPinLockoutSecondsRemaining(t0), PIN_LOCKOUT_BASE_SECONDS);

    const correctDuringLockout = await verifyDevicePinWithThrottle('482915', t0 + 5_000);
    assert.equal(correctDuringLockout.status, 'locked', 'a locked device gives no free verification oracle');
  } finally {
    uninstallStorage();
  }
});

test('the lock expires, success clears the counter, and the next lockout escalates', async () => {
  installStorage();
  try {
    await configureDevicePin('482915');
    const t0 = 1_700_000_000_000;

    for (let attempt = 0; attempt < PIN_MAX_ATTEMPTS_BEFORE_LOCKOUT; attempt += 1) {
      await verifyDevicePinWithThrottle('000000', t0);
    }
    const t1 = t0 + (PIN_LOCKOUT_BASE_SECONDS + 1) * 1000;
    assert.equal(getPinLockoutSecondsRemaining(t1), 0, 'the first lockout has expired');

    const unlocked = await verifyDevicePinWithThrottle('482915', t1);
    assert.equal(unlocked.status, 'unlocked');
    assert.equal(getPinLockoutSecondsRemaining(t1), 0);

    // A fresh round of failures escalates: the second lockout lasts twice as long.
    for (let attempt = 0; attempt < PIN_MAX_ATTEMPTS_BEFORE_LOCKOUT; attempt += 1) {
      await verifyDevicePinWithThrottle('000000', t1);
    }
    const secondLock = getPinLockoutSecondsRemaining(t1);
    assert.ok(secondLock > PIN_LOCKOUT_BASE_SECONDS, `expected escalation beyond ${PIN_LOCKOUT_BASE_SECONDS}s, got ${secondLock}s`);
    assert.equal(secondLock, PIN_LOCKOUT_BASE_SECONDS * 2);
  } finally {
    uninstallStorage();
  }
});

test('change/remove honour an active lockout, and configuring a PIN clears the throttle', async () => {
  installStorage();
  try {
    await configureDevicePin('482915');
    // Real wall-clock here: change/remove intentionally read the real clock.
    for (let attempt = 0; attempt < PIN_MAX_ATTEMPTS_BEFORE_LOCKOUT; attempt += 1) {
      await verifyDevicePinWithThrottle('000000');
    }
    assert.ok(getPinLockoutSecondsRemaining() > 0, 'the device is locked before the assertions');

    await assert.rejects(() => changeDevicePin('482915', '592814'), /مقفل مؤقتاً/);
    await assert.rejects(() => removeDevicePin('482915'), /مقفل مؤقتاً/);

    await configureDevicePin('592814');
    assert.equal(getPinLockoutSecondsRemaining(), 0, 'a new PIN starts with a clean throttle');
    const attempt = await verifyDevicePinWithThrottle('000000');
    assert.equal(attempt.status, 'wrong');
    assert.equal(attempt.attemptsRemaining, PIN_MAX_ATTEMPTS_BEFORE_LOCKOUT - 1, 'the counter restarted after reconfiguration');
  } finally {
    uninstallStorage();
  }
});

test('the throttle record never enters a backup and survives reset, exactly like the PIN', async () => {
  const storage = installStorage();
  try {
    await configureDevicePin('482915');
    const t0 = 1_700_000_000_000;
    for (let attempt = 0; attempt < PIN_MAX_ATTEMPTS_BEFORE_LOCKOUT; attempt += 1) {
      await verifyDevicePinWithThrottle('000000', t0);
    }

    const backup = await exportDatabaseBackupAsync();
    assert.equal(JSON.stringify(backup).includes('pin-throttle'), false, 'backups never carry lockout state');

    resetDatabase();
    assert.equal(
      storage.has('lena:device-security:pin-throttle:v1'),
      true,
      'a showroom-data reset must not clear an active device lockout',
    );

    await importDatabaseBackupAsync(backup);
    assert.equal(storage.has('lena:device-security:pin-throttle:v1'), true);
  } finally {
    uninstallStorage();
  }
});

test('the lock screen wires the throttle: live countdown, blocked submit, no raw pin storage', async () => {
  const gate = await readFile(new URL('../src/features/device-lock/DeviceLockGate.tsx', import.meta.url), 'utf8');
  assert.match(gate, /verifyDevicePinWithThrottle/);
  assert.match(gate, /getPinLockoutSecondsRemaining/);
  assert.match(gate, /disabled=\{isSubmitting \|\| lockoutSeconds > 0\}/);
  assert.match(gate, /role="alert"[\s\S]*?buildPinLockoutMessage\(lockoutSeconds\)/, 'the countdown announces itself');
  assert.match(gate, /setInterval/, 'the retry message ticks down instead of going stale');
  assert.ok(buildPinLockoutMessage(45).includes('45'));
});
