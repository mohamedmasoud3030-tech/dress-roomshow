import { Moon, Plus, Sun } from 'lucide-react';
import { Link } from 'react-router-dom';
import { focusRing } from './navigation';
import { useBrandName } from '../../features/preferences/useBrandName';
import type { AdminTheme } from './useAdminTheme';

export function AppHeader({
  theme,
  onToggleTheme,
}: {
  theme: AdminTheme;
  onToggleTheme: () => void;
}) {
  const brandName = useBrandName();

  return (
    <header
      className="sticky top-0 z-20 border-b px-4 py-3 backdrop-blur-xl sm:px-6"
      style={{ borderColor: 'var(--line)', background: 'color-mix(in srgb, var(--canvas) 82%, transparent)' }}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <img src="/favicon.svg" alt="" aria-hidden="true" className="h-9 w-9 rounded-xl lg:hidden" />
          <div>
            <p title={brandName} className="max-w-[16rem] truncate text-[10px] font-bold tracking-[0.2em]" style={{ color: 'var(--gold)' }}>
              {brandName}
            </p>
            <h2 className="mt-0.5 text-base font-semibold tracking-tight sm:text-lg">إدارة المعرض</h2>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleTheme}
            className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border transition ${focusRing}`}
            style={{ borderColor: 'var(--line)', color: 'var(--ink)' }}
            aria-label={theme === 'night' ? 'التحويل إلى النهار' : 'التحويل إلى الليل'}
          >
            {theme === 'night' ? <Sun aria-hidden="true" className="h-4 w-4" /> : <Moon aria-hidden="true" className="h-4 w-4" />}
          </button>
          <Link
            to="/reservations?new=1"
            className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold transition duration-200 hover:-translate-y-0.5 ${focusRing}`}
          >
            <Plus aria-hidden="true" className="h-4 w-4" />
            <span>حجز جديد</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
