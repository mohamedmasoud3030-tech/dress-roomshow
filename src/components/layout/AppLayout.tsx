import { NavLink, Outlet, useNavigate } from 'react-router-dom';

const navigation = [
  { to: '/', label: 'لوحة التحكم' },
  { to: '/dresses', label: 'الفساتين' },
  { to: '/customers', label: 'العملاء' },
  { to: '/reservations', label: 'الحجوزات' },
  { to: '/delivery-return', label: 'التسليم والاسترجاع' },
  { to: '/payments', label: 'المدفوعات' },
  { to: '/expenses', label: 'المصروفات' },
  { to: '/reports', label: 'التقارير' },
];

const navClass = (isActive: boolean) =>
  `block rounded-xl px-4 py-3 text-sm font-medium transition ${
    isActive ? 'bg-[#B08A5B]/20 text-[#8B5E3C]' : 'text-[#7A7168] hover:bg-[#E8DED2]/50 hover:text-[#1F1B18]'
  }`;

export function AppLayout() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-transparent text-[#1F1B18]" dir="rtl">
      <aside className="fixed inset-y-0 right-0 hidden w-72 border-l border-[#E8DED2] bg-[#FFFCF8] p-5 shadow-sm lg:block">
        <div className="mb-8">
          <p className="text-sm text-[#7A7168]">Dress roomshow</p>
          <h1 className="text-2xl font-bold">إدارة بوتيك الفساتين</h1>
        </div>
        <nav className="space-y-2">
          {navigation.map((item) => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => navClass(isActive)}>
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="min-h-screen pb-24 lg:pb-6 lg:pr-72">
        <header className="sticky top-0 z-10 border-b border-[#E8DED2] bg-[#FFFCF8]/95 px-4 py-4 backdrop-blur sm:px-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-[#7A7168]">منصة التشغيل</p>
              <h2 className="text-xl font-semibold">تشغيل يومي فاخر ومنظم</h2>
            </div>
            <button
              onClick={() => navigate('/reservations')}
              className="rounded-xl bg-[#8B5E3C] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#7A5133]"
            >
              حجز جديد
            </button>
          </div>
        </header>
        <div className="p-4 sm:p-6">
          <Outlet />
        </div>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-4 border-t border-[#E8DED2] bg-[#FFFCF8]/95 p-2 backdrop-blur lg:hidden">
        {navigation.map((item) => (
          <NavLink key={item.to} to={item.to} className={({ isActive }) => `rounded-lg px-2 py-2 text-center text-xs ${isActive ? 'bg-[#B08A5B]/25 text-[#8B5E3C] font-semibold' : 'text-[#7A7168]'}`}>
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
