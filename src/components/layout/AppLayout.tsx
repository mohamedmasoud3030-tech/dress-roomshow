import { useEffect, useState } from 'react';
import {
  BarChart3,
  CalendarDays,
  ClipboardList,
  LayoutDashboard,
  LockKeyhole,
  PackageCheck,
  Plus,
  ReceiptText,
  Settings2,
  Shirt,
  UsersRound,
  WalletCards,
} from 'lucide-react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { PersistenceErrorBoundary } from '../shared/PersistenceErrorBoundary';
import {
  DESKTOP_SYNC_STATUS_EVENT,
  getDesktopSyncStatus,
  type DesktopSyncStatus,
} from '../../services/desktopDatabase';

const navigation = [
  { to: '/', label: 'لوحة التحكم', icon: LayoutDashboard },
  { to: '/dresses', label: 'الفساتين', icon: Shirt },
  { to: '/customers', label: 'العملاء', icon: UsersRound },
  { to: '/reservations', label: 'الحجوزات', icon: CalendarDays },
  { to: '/delivery-return', label: 'التسليم والاسترجاع', icon: PackageCheck },
  { to: '/payments', label: 'المدفوعات', icon: WalletCards },
  { to: '/expenses', label: 'المصروفات', icon: ReceiptText },
  { to: '/daily-closing', label: 'إقفال اليومية', icon: LockKeyhole },
  { to: '/audit-log', label: 'سجل التدقيق', icon: ClipboardList },
  { to: '/reports', label: 'التقارير', icon: BarChart3 },
  { to: '/preferences', label: 'الإعدادات والنسخ', icon: Settings2 },
] as const;

const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2';

export function AppLayout() {
  const location = useLocation();
  const [desktopSyncStatus, setDesktopSyncStatus] = useState<DesktopSyncStatus>(() => getDesktopSyncStatus());

  useEffect(() => {
    const updateStatus = (event: Event) => {
      setDesktopSyncStatus((event as CustomEvent<DesktopSyncStatus>).detail);
    };
    window.addEventListener(DESKTOP_SYNC_STATUS_EVENT, updateStatus);
    return () => window.removeEventListener(DESKTOP_SYNC_STATUS_EVENT, updateStatus);
  }, []);

  const showDesktopSyncWarning = desktopSyncStatus.state === 'error';

  return (
    <div className="min-h-screen overflow-hidden bg-slate-50 text-slate-950" dir="rtl">
      <a
        href="#main-content"
        className={`fixed right-4 top-4 z-50 -translate-y-24 rounded-xl bg-slate-950 px-4 py-3 text-sm font-bold text-white shadow-lg transition focus:translate-y-0 ${focusRing}`}
      >
        الانتقال إلى المحتوى الرئيسي
      </a>

      <aside className="fixed inset-y-0 right-0 hidden w-72 overflow-y-auto border-l border-slate-800 bg-slate-950 px-4 py-5 text-stone-100 shadow-2xl lg:block">
        <div className="mb-6 rounded-3xl border border-white/10 bg-white/[0.03] p-4 shadow-inner">
          <div className="flex items-center gap-3">
            <img src="/favicon.svg" alt="" aria-hidden="true" className="h-12 w-12 rounded-2xl bg-amber-300/10 shadow-lg" />
            <div>
              <p className="text-2xl font-extrabold tracking-[0.22em] text-amber-300">LENA</p>
              <p className="mt-1 text-xs font-semibold text-slate-400">Dress Operations</p>
            </div>
          </div>
          <h1 className="mt-5 text-2xl font-extrabold">لوحة إدارة الفساتين</h1>
          <p className="mt-2 text-xs leading-6 text-slate-400">مركز واحد للمخزون والحجوزات والتحصيل اليومي.</p>
        </div>

        <nav aria-label="التنقل الرئيسي" className="space-y-2">
          {navigation.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex min-h-12 items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition duration-200 ${focusRing} ${
                  isActive
                    ? 'bg-amber-300 text-slate-950 shadow-lg shadow-amber-300/10'
                    : 'text-slate-300 hover:bg-white/10 hover:text-stone-50'
                }`
              }
            >
              <item.icon aria-hidden="true" className="h-5 w-5 shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      <main id="main-content" className="relative min-h-screen pb-24 lg:pr-72 lg:pb-0">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-gradient-to-l from-amber-100/80 via-white/60 to-sky-100/70" />
        <header className="sticky top-0 z-20 border-b border-white/70 bg-white/80 px-4 py-4 shadow-sm backdrop-blur-xl sm:px-6">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <img src="/favicon.svg" alt="" aria-hidden="true" className="h-10 w-10 rounded-xl shadow-sm lg:hidden" />
              <div>
                <p className="text-xs font-extrabold tracking-[0.2em] text-amber-700">LENA</p>
                <h2 className="mt-1 text-lg font-extrabold text-slate-950 sm:text-xl">تشغيل يومي سريع ومنظم</h2>
              </div>
            </div>
            <Link
              to="/reservations?new=1"
              className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-slate-950/10 transition duration-200 hover:-translate-y-0.5 hover:bg-slate-800 ${focusRing}`}
            >
              <Plus aria-hidden="true" className="h-4 w-4" />
              <span>حجز جديد</span>
            </Link>
          </div>
        </header>

        <div className="relative mx-auto max-w-7xl p-4 sm:p-6">
          {showDesktopSyncWarning && (
            <div role="alert" className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900">
              {desktopSyncStatus.message}
            </div>
          )}
          <PersistenceErrorBoundary key={location.pathname}>
            <Outlet />
          </PersistenceErrorBoundary>
        </div>
      </main>

      <nav
        aria-label="التنقل الرئيسي للموبايل"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur lg:hidden"
      >
        <div className="flex overflow-x-auto px-2 py-2">
          {navigation.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex min-h-14 min-w-20 shrink-0 flex-col items-center justify-center gap-1 rounded-xl px-2 py-1 text-[11px] font-bold transition duration-200 ${focusRing} ${
                  isActive ? 'bg-amber-100 text-amber-900' : 'text-slate-500 hover:bg-stone-100 hover:text-slate-950'
                }`
              }
            >
              <item.icon aria-hidden="true" className="h-5 w-5" />
              <span className="whitespace-nowrap">{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
