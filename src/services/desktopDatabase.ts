import { invoke } from '@tauri-apps/api/core';

const PREFIX = 'dress-roomshow:';
let previousSnapshot = '';

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
  const serialized = JSON.stringify(entries);
  if (serialized === previousSnapshot) return;
  await invoke('save_desktop_snapshot', { entries });
  previousSnapshot = serialized;
}

async function bootstrapDesktopDatabase(): Promise<void> {
  try {
    const localEntries = readMirror();
    const desktopEntries = await invoke<Record<string, string> | null>('load_desktop_snapshot');
    if (desktopEntries && JSON.stringify(desktopEntries) !== JSON.stringify(localEntries)) {
      applyMirror(desktopEntries);
      window.location.reload();
      return;
    }
    if (!desktopEntries) await invoke('save_desktop_snapshot', { entries: localEntries });
    previousSnapshot = JSON.stringify(readMirror());
    window.setInterval(() => void synchronizeDesktopMirror().catch(() => undefined), 500);
  } catch {
    // Browser and PWA builds intentionally continue with localStorage only.
  }
}

void bootstrapDesktopDatabase();
