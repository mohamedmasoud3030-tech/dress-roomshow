/**
 * Service-worker update coordination.
 *
 * The PWA was registered with `registerType: 'autoUpdate'`, which swaps the
 * running application underneath the operator the moment a new build is
 * cached. In a showroom that means a half-filled booking form can be replaced
 * mid-sentence while a customer waits, and the operator has no idea why the
 * screen reset. It also makes support impossible: asked "which version are you
 * on?", nobody can answer, because the app has no visible version at all.
 *
 * Registration is now `prompt`: a new build waits, the operator is told, and
 * she reloads when she is between customers.
 *
 * This lives in `src/platform/` because it touches `navigator.serviceWorker`
 * and the build-time virtual module, both of which are browser/runtime
 * concerns the feature layer is not allowed to reach.
 *
 * Rejected alternatives:
 *   - Keeping autoUpdate and showing a toast afterwards: the work is already
 *     lost by then; the point is to defer the swap, not to narrate it.
 *   - Forcing a reload after N minutes: the showroom's busiest hour is exactly
 *     when a forced reload is most damaging.
 */

export type UpdateListener = (available: boolean) => void;

type RegisterFunction = (options?: {
  immediate?: boolean;
  onNeedRefresh?: () => void;
}) => (reloadPage?: boolean) => Promise<void>;

let updateServiceWorker: ((reloadPage?: boolean) => Promise<void>) | null = null;
let updateAvailable = false;
const listeners = new Set<UpdateListener>();

function notify(): void {
  listeners.forEach((listener) => {
    try {
      listener(updateAvailable);
    } catch {
      // A failing listener must never stop the others from being told.
    }
  });
}

/**
 * Registers the service worker in prompt mode.
 *
 * The virtual module only exists in a Vite build, so the import is dynamic and
 * a failure is swallowed: a dev server, a test runner, or the Tauri desktop
 * shell must all still boot when there is no service worker to register.
 */
export async function initializeAppUpdates(): Promise<void> {
  try {
    // Not `@vite-ignore`: the hint would leave the specifier unresolved at
    // build time, so the registration code never reached the bundle and the
    // service worker was silently never registered. Vite must resolve it.
    const module = await import('virtual:pwa-register') as { registerSW: RegisterFunction };
    updateServiceWorker = module.registerSW({
      immediate: true,
      onNeedRefresh: () => {
        updateAvailable = true;
        notify();
      },
    });
  } catch {
    // No service worker in this runtime; the app simply never reports updates.
  }
}

export function subscribeToAppUpdates(listener: UpdateListener): () => void {
  listeners.add(listener);
  listener(updateAvailable);
  return () => {
    listeners.delete(listener);
  };
}

/** Activates the waiting worker and reloads, at a moment the operator chose. */
export async function applyPendingUpdate(): Promise<void> {
  if (!updateServiceWorker) return;
  updateAvailable = false;
  notify();
  await updateServiceWorker(true);
}
