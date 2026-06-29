import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, Package, Plus, Shirt, UsersRound, WalletCards } from 'lucide-react';
import { SummaryCard } from '../../components/shared/SummaryCard';
import { getDresses, summarizeDresses } from '../dresses/dress.service';
import { summarizeReservations, getReservations } from '../reservations/reservation.service';
import { getCustomers } from '../customers/customer.service';

export function DashboardPage() {
  const dressSummary = useMemo(() => summarizeDresses(), []);
  const reservationSummary = useMemo(() => summarizeReservations(getReservations()), []);
  const customerCount = useMemo(() => getCustomers().length, []);
  const recentDresses = useMemo(() => getDresses().slice(0, 4), []);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-bold text-amber-700">الرئيسية</p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight text-slate-950">لوحة التحكم</h1>
        <p className="mt-2 text-sm text-slate-500">ملخص سريع لحالة المخزون والحجوزات والعملاء.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="إجمالي المخزون" value={dressSummary.total} hint={`${dressSummary.available} متاح`} tone="positive" />
        <SummaryCard label="الحجوزات النشطة" value={reservationSummary.active} hint={`${reservationSummary.today} عملية اليوم`} />
        <SummaryCard label="العملاء" value={customerCount} />
        <SummaryCard label="مؤجرة حالياً" value={dressSummary.rented} tone={dressSummary.rented > 0 ? 'warning' : 'default'} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">آخر عناصر المخزون</h2>
            <Link to="/inventory" className="text-sm font-bold text-amber-700 hover:text-amber-900">عرض الكل</Link>
          </div>
          {recentDresses.length === 0 ? (
            <div className="mt-4 text-center">
              <Shirt className="mx-auto h-10 w-10 text-slate-300" />
              <p className="mt-3 text-sm text-slate-500">لا توجد عناصر في المخزون بعد.</p>
              <Link to="/inventory" className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800">
                <Plus className="h-4 w-4" />
                إضافة أول عنصر
              </Link>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {recentDresses.map((dress) => (
                <Link key={dress.id} to={`/inventory/${dress.code}`} className="flex items-center gap-3 rounded-xl bg-stone-50 p-3 transition hover:bg-stone-100">
                  {dress.images[0] ? (
                    <img src={dress.images[0]} alt={dress.name} className="h-12 w-12 rounded-lg object-cover" />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-violet-100">
                      <Shirt className="h-5 w-5 text-violet-700" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-bold text-slate-900">{dress.name}</p>
                    <p className="text-xs text-slate-500">{dress.code} • {dress.category}</p>
                  </div>
                  <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700">
                    {dress.status === 'available' ? 'متاح' : 'غير متاح'}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">اختصارات سريعة</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Link to="/inventory" className="flex items-center gap-3 rounded-xl bg-stone-50 p-4 transition hover:bg-stone-100">
                <div className="rounded-xl bg-violet-50 p-3 text-violet-700"><Package className="h-5 w-5" /></div>
                <div><p className="text-sm font-bold text-slate-900">المخزون</p><p className="text-xs text-slate-500">إدارة العناصر</p></div>
              </Link>
              <Link to="/reservations?new=1" className="flex items-center gap-3 rounded-xl bg-stone-50 p-4 transition hover:bg-stone-100">
                <div className="rounded-xl bg-emerald-50 p-3 text-emerald-700"><CalendarDays className="h-5 w-5" /></div>
                <div><p className="text-sm font-bold text-slate-900">حجز جديد</p><p className="text-xs text-slate-500">إنشاء حجز</p></div>
              </Link>
              <Link to="/customers" className="flex items-center gap-3 rounded-xl bg-stone-50 p-4 transition hover:bg-stone-100">
                <div className="rounded-xl bg-amber-50 p-3 text-amber-700"><UsersRound className="h-5 w-5" /></div>
                <div><p className="text-sm font-bold text-slate-900">العملاء</p><p className="text-xs text-slate-500">{customerCount} عميلة</p></div>
              </Link>
              <Link to="/payments" className="flex items-center gap-3 rounded-xl bg-stone-50 p-4 transition hover:bg-stone-100">
                <div className="rounded-xl bg-sky-50 p-3 text-sky-700"><WalletCards className="h-5 w-5" /></div>
                <div><p className="text-sm font-bold text-slate-900">المدفوعات</p><p className="text-xs text-slate-500">تحصيل ومتابعة</p></div>
              </Link>
            </div>
          </div>

          {reservationSummary.overdue > 0 && (
            <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-4 shadow-sm">
              <p className="text-sm font-bold text-rose-900">تنبيه: {reservationSummary.overdue} حجز متأخر عن موعد الإرجاع</p>
              <Link to="/reservations?timing=overdue" className="mt-2 inline-flex text-sm font-bold text-rose-700 hover:text-rose-900">عرض الحجوزات المتأخرة →</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
