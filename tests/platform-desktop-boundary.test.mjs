import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath, URL } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));

async function read(path) {
  return readFile(join(root, path), 'utf8');
}

test('Tauri loading and desktop snapshot behavior are owned by platform boundaries', async () => {
  const runtime = await read('src/platform/runtime/tauriRuntime.ts');
  const desktop = await read('src/platform/desktop/DesktopDatabase.ts');
  const app = await read('src/app/App.tsx');
  const statusHook = await read('src/app/shell/useDesktopPersistenceStatus.ts');

  assert.match(runtime, /import\('@tauri-apps\/api\/core'\)/);
  assert.match(runtime, /export async function getDesktopInvoke/);
  assert.match(desktop, /import \{ getDesktopInvoke \} from '@platform\/runtime';/);
  assert.match(desktop, /invoke\('load_desktop_snapshot'\)/);
  assert.match(desktop, /invoke\('save_desktop_snapshot'/);
  assert.match(desktop, /}, 500\);/);
  assert.match(app, /import '@platform\/desktop\/DesktopDatabase';/);
  assert.match(statusHook, /from '@platform\/desktop';/);
  assert.doesNotMatch(app, /services\/desktopDatabase/);
  assert.doesNotMatch(statusHook, /services\/desktopDatabase/);
});

test('legacy desktop service remains a compatibility delegate only', async () => {
  const legacy = await read('src/services/desktopDatabase.ts');

  assert.match(legacy, /from '@platform\/desktop';/);
  assert.doesNotMatch(legacy, /@tauri-apps/);
  assert.doesNotMatch(legacy, /localStorage/);
  assert.doesNotMatch(legacy, /setInterval/);
  assert.doesNotMatch(legacy, /save_desktop_snapshot/);
});
