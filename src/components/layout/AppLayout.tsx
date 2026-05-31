import {
  BarChart3,
  CalendarDays,
  LayoutDashboard,
  PackageCheck,
  Plus,
  ReceiptText,
  Shirt,
  UsersRound,
  WalletCards,
} from 'lucide-react';
import { Link, NavLink, Outlet } from 'react-router-dom';

const navigation = [
  { to: '/', label: 'لوحة التحكم', icon: LayoutDashboard },
  { to: '/dresses', label: 'الفساتين', icon: Shirt },
  { to: '/customers', label: 'العملاء', icon: UsersRound },
  { to: '/reservations', label: 'الحجوزات', icon: CalendarDays },
  { to: '/delivery-return', label: 'التسليم والاسترجاع', icon: PackageCheck },
  { to: '/payments', label: 'المدفوعات', icon: WalletCards },
  { to: '/expenses', label: 'المصروفات', icon: ReceiptText },
  { to: '/reports', label: 'التقارير', icon: BarChart3 },
] as const;

const focusRing =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2';

export function AppLayout() {
  return (
    <div className="min-h-screen bg-stone-50 text-slate-950" dir="rtl">
      <a
        href="#main-content"
        className={`fixed right-4 top-4 z-50 -translate-y-24 rounded-xl bg-slate-950 px-4 py-3 text-sm font-bold text-white shadow-lg transition focus:translate-y-0 ${focusRing}`}
      >
        الانتقال إلى المحتوى الرئيسي
      </a>

      <aside className="fixed inset-y-0 right-0 hidden w-72 border-l border-slate-800 bg-slate-950 px-5 py-6 text-stone-100 shadow-xl lg:block">
        <div className="mb-8 border-b border-slate-800 pb-6">
          <p className="text-sm font-medium tracking-wide text-amber-300">Dress roomshow</p>
          <h1 className="mt-2 text-2xl font-bold">إدارة محل الفساتين</h1>
          <p className="mt-2 text-xs leading-6 text-slate-400">تشغيل يومي منظم للمخزون والحجوزات والتحصيل.</p>
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
                    ? 'bg-amber-300 text-slate-950 shadow-sm'
                    : 'text-slate-300 hover:bg-slate-900 hover:text-stone-50'
                }`
              }
            >
              <item.icon aria-hidden="true" className="h-5 w-5 shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      <main id="main-content" className="min-h-screen pb-24 lg:pr-72 lg:pb-0">
        <header className="sticky top-0 z-20 border-b border-stone-200 bg-stone-50/95 px-4 py-4 shadow-sm backdrop-blur sm:px-6">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-amber-700">Dress roomshow</p>
              <h2 className="mt-1 text-lg font-bold text-slate-950 sm:text-xl">تشغيل يومي سريع ومنظم</h2>
            </div>
            <Link
              to="/reservations"
              className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white shadow-sm transition duration-200 hover:bg-slate-800 ${focusRing}`}
            >
              <Plus aria-hidden="true" className="h-4 w-4" />
              <span>حجز جديد</span>
            </Link>
          </div>
        </header>

        <div className="mx-auto max-w-7xl p-4 sm:p-6">
          <Outlet />
        </div>
      </main>

      <nav
        aria-label="التنقل الرئيسي للموبايل"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-stone-200 bg-white/95 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur lg:hidden"
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
