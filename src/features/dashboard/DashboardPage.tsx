export function DashboardPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-black text-slate-900">لوحة التحكم</h1>
      <p className="text-slate-600">مرحباً بك في نظام LENA لإدارة محل الفساتين</p>
      
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <h3 className="text-sm font-bold text-slate-600">الفساتين</h3>
          <p className="mt-2 text-3xl font-black text-slate-900">--</p>
        </div>
      </div>
    </div>
  );
}
