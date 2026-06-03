import { invoke } from '@tauri-apps/api/core';

const PREFIX = 'dress-roomshow:';

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

export async function bootstrapDesktopDatabase(): Promise<void> {
  try {
    const entries = await invoke<Record<string, string> | null>('load_desktop_snapshot');
    if (entries) applyMirror(entries);
    else await invoke('save_desktop_snapshot', { entries: readMirror() });
  } catch {
    // Browser and PWA builds intentionally continue with localStorage only.
  }
}

export function syncDesktopDatabase(): void {
  void invoke('save_desktop_snapshot', { entries: readMirror() }).catch(() => undefined);
}
