import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from './Button';
import { applyPendingUpdate, subscribeToAppUpdates } from '@platform/app-update';

/**
 * "A new version is ready" banner.
 *
 * It is deliberately dismissible and never auto-reloads. The whole reason the
 * registration was changed from `autoUpdate` to `prompt` is that the operator,
 * not the browser, decides when it is safe to lose the current screen — and a
 * banner that reloads on its own after being ignored would reintroduce exactly
 * that problem.
 *
 * Positioned above the mobile bottom navigation so it never covers the tab bar,
 * which is the one control the operator needs to escape any screen.
 */
export function AppUpdateNotice() {
  const [available, setAvailable] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [applying, setApplying] = useState(false);

  useEffect(() => subscribeToAppUpdates((next) => {
    setAvailable(next);
    // A newly detected update un-dismisses: a second update after the operator
    // waved the first one away is still worth telling her about.
    if (next) setDismissed(false);
  }), []);

  if (!available || dismissed) return null;

  const handleApply = () => {
    setApplying(true);
    void applyPendingUpdate();
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom,0px)+5.5rem)] z-40 mx-auto max-w-md rounded-2xl border border-amber-300 bg-amber-50 p-3 shadow-lg lg:bottom-6 lg:right-6 lg:left-auto lg:mx-0"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold text-amber-900">يتوفر إصدار جديد من التطبيق</p>
          <p className="mt-0.5 text-xs leading-5 text-amber-800">
            سيتم التحديث عند اختيارك فقط، حتى لا تفقدي أي بيانات مفتوحة الآن.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button type="button" onClick={handleApply} disabled={applying} loading={applying} loadingLabel="جارٍ التحديث…" className="bg-amber-600 px-3 hover:bg-amber-700">
            <RefreshCw aria-hidden="true" className={`h-4 w-4 ${applying ? 'animate-spin' : ''}`} />
            تحديث الآن
          </Button>
          <Button type="button" variant="secondary" onClick={() => setDismissed(true)} className="min-h-11 border-amber-300 text-amber-900 hover:bg-amber-100">
            لاحقاً
          </Button>
        </div>
      </div>
    </div>
  );
}
