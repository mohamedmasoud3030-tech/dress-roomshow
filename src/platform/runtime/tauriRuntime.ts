export type DesktopInvoke = (command: string, args?: Record<string, unknown>) => Promise<unknown>;

type DesktopTestGlobal = typeof globalThis & {
  __dressRoomshowDesktopInvokeForTests?: DesktopInvoke;
};

let cachedInvoke: DesktopInvoke | null | undefined;

async function loadTauriInvoke(): Promise<DesktopInvoke | null> {
  try {
    const tauriApi = await import('@tauri-apps/api/core');
    return tauriApi.invoke as DesktopInvoke;
  } catch {
    return null;
  }
}

function unavailableInvoke(): Promise<never> {
  return Promise.reject(new Error('Tauri غير متاح.'));
}

export async function getDesktopInvoke(): Promise<DesktopInvoke> {
  const testInvoke = (globalThis as DesktopTestGlobal).__dressRoomshowDesktopInvokeForTests;
  if (testInvoke) return testInvoke;

  if (cachedInvoke === undefined) cachedInvoke = await loadTauriInvoke();
  return cachedInvoke ?? unavailableInvoke;
}
