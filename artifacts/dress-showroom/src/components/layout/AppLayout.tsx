import { Outlet, NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Shirt,
  Users,
  CalendarCheck,
  Truck,
  CreditCard,
  Receipt,
  BarChart3,
} from 'lucide-react';
import { cn } from '../../lib/utils';

const navItems = [
  { to: '/', label: 'الرئيسية', icon: LayoutDashboard, end: true },
  { to: '/dresses', label: 'الفساتين', icon: Shirt },
  { to: '/customers', label: 'العميلات', icon: Users },
  { to: '/reservations', label: 'الحجوزات', icon: CalendarCheck },
  { to: '/delivery-return', label: 'التسليم والاستلام', icon: Truck },
  { to: '/payments', label: 'المدفوعات', icon: CreditCard },
  { to: '/expenses', label: 'المصاريف', icon: Receipt },
  { to: '/reports', label: 'التقارير', icon: BarChart3 },
];

export function AppLayout() {
  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-60 bg-violet-900 text-white shrink-0">
        <div className="px-4 py-5 border-b border-violet-800">
          <h1 className="text-lg font-bold leading-tight">Dress Roomshow</h1>
          <p className="text-violet-300 text-xs mt-0.5">نظام إدارة المحل</p>
        </div>
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors',
                  isActive
                    ? 'bg-violet-700 text-white font-semibold'
                    : 'text-violet-200 hover:bg-violet-800 hover:text-white',
                )
              }
            >
              <item.icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="px-4 py-3 border-t border-violet-800 text-xs text-violet-400">
          v0.1 — وضع عدم الاتصال
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto pb-16 md:pb-0">
          <Outlet />
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50">
        <div className="flex justify-around items-center h-16">
          {navItems.slice(0, 5).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center gap-0.5 px-2 py-1 min-w-0',
                  isActive ? 'text-violet-700' : 'text-slate-500',
                )
              }
            >
              <item.icon className="w-5 h-5 shrink-0" />
              <span className="text-[10px] leading-tight truncate">{item.label}</span>
            </NavLink>
          ))}
          <NavLink
            to="/reports"
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center gap-0.5 px-2 py-1 min-w-0',
                isActive ? 'text-violet-700' : 'text-slate-500',
              )
            }
          >
            <BarChart3 className="w-5 h-5 shrink-0" />
            <span className="text-[10px] leading-tight truncate">المزيد</span>
          </NavLink>
        </div>
      </nav>
    </div>
  );
}
