import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('..', import.meta.url));

async function read(path) {
  return readFile(join(root, path), 'utf8');
}

test('app shell keeps the established navigation order and labels', async () => {
  const source = await read('src/app/shell/navigation.ts');
  const expectedItems = [
    ['/', 'لوحة التحكم'],
    ['/inventory', 'المخزون'],
    ['/customers', 'العملاء'],
    ['/reservations', 'الحجوزات'],
    ['/appointments', 'المواعيد'],
    ['/delivery-return', 'التسليم والاسترجاع'],
    ['/payments', 'المدفوعات'],
    ['/expenses', 'المصروفات'],
    ['/daily-closing', 'إقفال اليومية'],
    ['/audit-log', 'سجل التدقيق'],
    ['/reports', 'التقارير'],
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

test('app shell preserves routes, outlet boundary, mobile menu, and compatibility export', async () => {
  const app = await read('src/app/App.tsx');
  const shell = await read('src/app/shell/AppShell.tsx');
  const mobileMenu = await read('src/app/shell/MobileMoreMenu.tsx');
  const legacyLayout = await read('src/components/layout/AppLayout.tsx');

  for (const route of [
    '/landing',
    'inventory',
    'inventory/:code',
    'customers',
    'reservations',
    'appointments',
    'delivery-return',
    'payments',
    'expenses',
    'daily-closing',
    'audit-log',
    'reports',
    'preferences',
    '*',
  ]) {
    const doubleQuoted = `path="${route}"`;
    const singleQuoted = `path='${route}'`;
    assert.ok(app.includes(doubleQuoted) || app.includes(singleQuoted), `Missing route: ${route}`);
  }

  assert.match(app, /<Route element={<AppShell \/>}>/);
  assert.match(shell, /<PersistenceErrorBoundary key={location\.pathname}>/);
  assert.match(shell, /<Outlet \/>/);
  assert.match(shell, /desktopSyncStatus\.state === 'browser-fallback'/);
  assert.match(mobileMenu, /onClick={onClose}/);
  assert.equal(legacyLayout.trim(), "export { AppShell as AppLayout } from '@app/shell/AppShell';");
});
