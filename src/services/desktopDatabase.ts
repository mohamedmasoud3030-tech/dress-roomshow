import { invoke } from '@tauri-apps/api/core';

const PREFIX = 'dress-roomshow:';
export const DESKTOP_SYNC_STATUS_EVENT = 'dress-roomshow:desktop-sync-status';
let previousSnapshot = '';
let failedSyncAttempts = 0;

export type DesktopSyncStatus =
  | { state: 'idle'; message: string; updatedAt: string }
  | { state: 'synced'; message: string; updatedAt: string }
  | { state: 'browser-fallback'; message: string; updatedAt: string }
  | { state: 'error'; message: string; updatedAt: string; attempts: number };

type DesktopSyncStatusUpdate =
  | { state: 'idle'; message: string }
  | { state: 'synced'; message: string }
  | { state: 'browser-fallback'; message: string }
  | { state: 'error'; message: string; attempts: number };

let desktopSyncStatus: DesktopSyncStatus = {
  state: 'idle',
  message: 'جاري تجهيز مزامنة سطح المكتب.',
  updatedAt: new Date().toISOString(),
};

function updateDesktopSyncStatus(status: DesktopSyncStatusUpdate): void {
  desktopSyncStatus = { ...status, updatedAt: new Date().toISOString() } as DesktopSyncStatus;
  window.dispatchEvent(new CustomEvent(DESKTOP_SYNC_STATUS_EVENT, { detail: desktopSyncStatus }));
}

export function getDesktopSyncStatus(): DesktopSyncStatus {
  return desktopSyncStatus;
}

function readMirror(): Record<string, string> {
  const entries: Record<string, string> = {};
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (!key?.startsWith(PREFIX)) continue;
    const value = window.localStorage.getItem(key);
    if (value !== null) entries[key] = value;
  }
  return entries;
}

function serialize(entries: Record<string, string>): string {
  return JSON.stringify(
    Object.fromEntries(Object.entries(entries).sort(([left], [right]) => left.localeCompare(right))),
  );
}

function applyMirror(entries: Record<string, string>): void {
  const keys: string[] = [];
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (key?.startsWith(PREFIX)) keys.push(key);
  }
  keys.forEach((key) => window.localStorage.removeItem(key));
  Object.entries(entries).forEach(([key, value]) => {
    if (key.startsWith(PREFIX)) window.localStorage.setItem(key, value);
  });
}

async function synchronizeDesktopMirror(): Promise<void> {
  const entries = readMirror();
  const serialized = serialize(entries);
  if (serialized === previousSnapshot) return;
  await invoke('save_desktop_snapshot', { entries });
  failedSyncAttempts = 0;
  previousSnapshot = serialized;
  updateDesktopSyncStatus({ state: 'synced', message: 'تمت مزامنة نسخة سطح المكتب.' });
}

async function bootstrapDesktopDatabase(): Promise<void> {
  try {
    const localEntries = readMirror();
    const desktopEntries = await invoke<Record<string, string> | null>('load_desktop_snapshot');
    if (desktopEntries && serialize(desktopEntries) !== serialize(localEntries)) {
      applyMirror(desktopEntries);
      window.location.reload();
      return;
    }
    if (!desktopEntries) await invoke('save_desktop_snapshot', { entries: localEntries });
    previousSnapshot = serialize(readMirror());
    updateDesktopSyncStatus({ state: 'synced', message: 'مزامنة سطح المكتب تعمل.' });
    window.setInterval(() => {
      void synchronizeDesktopMirror().catch(() => {
        failedSyncAttempts += 1;
        updateDesktopSyncStatus({
          state: 'error',
          message: 'تعذر حفظ نسخة سطح المكتب. سيستمر التطبيق محلياً وسنحاول المزامنة مرة أخرى.',
          attempts: failedSyncAttempts,
        });
      });
    }, 500);
  } catch {
    updateDesktopSyncStatus({
      state: 'browser-fallback',
      message: 'يعمل التطبيق بتخزين المتصفح المحلي فقط.',
    });
  }
}

void bootstrapDesktopDatabase();
