import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath, URL } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('..', import.meta.url));

async function read(path) {
  return readFile(join(root, path), 'utf8');
}

test('app shell keeps the established navigation order and labels', async () => {
  const source = await read('src/app/shell/navigation.ts');
  // Deliberate IA reorganisation (launch prep): destinations are grouped, and
  // the audit log now follows reports. This list locks the NEW order so any
  // future accidental drift is still caught.
  const expectedItems = [
    ['/', 'لوحة التحكم'],
    ['/inventory', 'المخزون'],
    ['/customers', 'العميلات'],
    ['/reservations', 'الحجوزات'],
    ['/appointments', 'المواعيد'],
    ['/delivery-return', 'التسليم والاسترجاع'],
    ['/payments', 'المدفوعات'],
    ['/expenses', 'المصروفات'],
    ['/daily-closing', 'إقفال اليومية'],
    ['/reports', 'التقارير'],
    ['/audit-log', 'سجل التدقيق'],
    ['/preferences', 'الإعدادات والنسخ'],
  ];

  let cursor = -1;
  for (const [path, label] of expectedItems) {
    const next = source.indexOf(`to: '${path}'`, cursor + 1);
    assert.notEqual(next, -1, `Missing navigation path: ${path}`);
    assert.ok(next > cursor, `Navigation order changed at: ${path}`);
    assert.match(source.slice(next, next + 120), new RegExp(label));
    cursor = next;
  }
});

test('app shell preserves outlet boundary, mobile menu close, and persistence warning', async () => {
  const shell = await read('src/app/shell/AppShell.tsx');
  const mobileMenu = await read('src/app/shell/MobileMoreMenu.tsx');

  assert.match(shell, /<PersistenceErrorBoundary key={location\.pathname}>/);
  assert.match(shell, /<Outlet \/>/);
  assert.match(shell, /persistenceStatus\.state === 'local-only'/);
  assert.match(mobileMenu, /onClick={onClose}/);
  // Nothing imports the legacy `AppLayout` alias any more, so the shim is
  // gone rather than kept alive by a test that only asserts its own shape.
  await assert.rejects(() => read('src/components/layout/AppLayout.tsx'));
});
