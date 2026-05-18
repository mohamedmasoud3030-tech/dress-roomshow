import { NavLink, Outlet } from 'react-router-dom';

const navigation = [
  { to: '/', label: 'لوحة التحكم' },
  { to: '/dresses', label: 'الفساتين' },
  { to: '/customers', label: 'العملاء' },
  { to: '/reservations', label: 'الحجوزات' },
  { to: '/delivery-return', label: 'التسليم والاسترجاع' },
  { to: '/payments', label: 'المدفوعات' },
  { to: '/expenses', label: 'المصروفات' },
  { to: '/reports', label: 'التقارير البسيطة' },
];

export function AppLayout() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-950" dir="rtl">
      <aside className="fixed inset-y-0 right-0 hidden w-72 border-l border-slate-200 bg-white p-5 shadow-sm lg:block">
        <div className="mb-8">
          <p className="text-sm text-slate-500">Dress roomshow</p>
          <h1 className="text-2xl font-bold">إدارة محل الفساتين</h1>
        </div>
        <nav className="space-y-2">
          {navigation.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `block rounded-xl px-4 py-3 text-sm font-medium transition ${
                  isActive ? 'bg-violet-100 text-violet-800' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="min-h-screen lg:pr-72">
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 px-6 py-4 backdrop-blur">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-slate-500">خطة البداية</p>
              <h2 className="text-xl font-semibold">تشغيل يومي سريع ومنظم</h2>
            </div>
            <button className="rounded-xl bg-violet-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-violet-800">
              حجز جديد
            </button>
          </div>
        </header>
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
