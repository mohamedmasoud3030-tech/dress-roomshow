import { useEffect, useRef, useState } from 'react';
import {
  CLOUD_SAVE_ACK_DISMISS_MS,
  CLOUD_SAVE_ACK_EVENT,
  CLOUD_SAVE_ACK_MESSAGE,
  isCloudSaveAck,
} from '@shared/persistence/cloudSaveAck';

/**
 * «محفوظ على الخادم ✓» — the quiet acknowledgement after a money operation is
 * confirmed by the authoritative store (UX-S2).
 *
 * Deliberate constraints:
 * - `role="status"` + `aria-live="polite"`: announced, never interrupting.
 * - It appears only for a server acknowledgement and disappears on its own
 *   within the roadmap's 4 s ceiling. There is nothing to dismiss by hand.
 * - The copy is fixed and carries no figures, so an operator can never read a
 *   balance off a popup that is already fading.
 * - It sits above the update banner's slot so the two notices stack instead of
 *   covering each other, and it never touches the bottom tab bar.
 * - The offline case is owned by the amber persistence banner in `AppShell`;
 *   this component has no error or offline state of its own.
 */
export function CloudSaveAckToast({ dismissMs = CLOUD_SAVE_ACK_DISMISS_MS }: { dismissMs?: number } = {}) {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const clearTimer = () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };

    const handleAck = (event: Event) => {
      const { detail } = event as CustomEvent<unknown>;
      if (!isCloudSaveAck(detail)) return;
      setVisible(true);
      clearTimer();
      // A second confirmed write restarts the window instead of stacking a
      // second toast: one acknowledgement at a time, always the newest.
      timerRef.current = setTimeout(() => setVisible(false), dismissMs);
    };

    window.addEventListener(CLOUD_SAVE_ACK_EVENT, handleAck);
    return () => {
      window.removeEventListener(CLOUD_SAVE_ACK_EVENT, handleAck);
      clearTimer();
    };
    // `dismissMs` is a test seam, not a feature: the shipped default is the
    // module constant and nothing in the app passes a value.
  }, [dismissMs]);

  if (!visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom,0px)+9rem)] z-40 mx-auto max-w-xs rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-center text-sm font-bold text-emerald-900 shadow-sm lg:bottom-6 lg:left-6 lg:right-auto lg:mx-0"
    >
      {CLOUD_SAVE_ACK_MESSAGE}
    </div>
  );
}
