import { useMemo } from 'react';
import { Shirt, Users, CalendarCheck, CreditCard, Receipt, TrendingUp, AlertCircle, Truck } from 'lucide-react';
import { PageHeader } from '../../components/shared/PageHeader';
import { SummaryCard } from '../../components/shared/SummaryCard';
import { db_getCustomers, db_getDresses, db_getExpenses, db_getPayments, db_getReservations } from '../../services/localDatabase';
import { getTodayISO, formatDateAr } from '../../shared/utils/date';
import { formatMoneyOMR } from '../../shared/utils/format';

export function DashboardPage() {
  const today = getTodayISO();

  const data = useMemo(() => {
    const dresses = db_getDresses();
    const customers = db_getCustomers();
    const reservations = db_getReservations();
    const payments = db_getPayments();
    const expenses = db_getExpenses();

    const activeStatuses = new Set(['pending', 'confirmed', 'delivered', 'overdue']);
    const totalCollected = payments.filter((p) => p.direction === 'income').reduce((s, p) => s + p.amount, 0);
    const totalRefunded = payments.filter((p) => p.direction === 'refund').reduce((s, p) => s + p.amount, 0);
    const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
    const netIncome = totalCollected - totalRefunded - totalExpenses;

    const pickupsToday = reservations.filter((r) => r.pickupDate === today && activeStatuses.has(r.status));
    const returnsToday = reservations.filter((r) => r.returnDate === today && activeStatuses.has(r.status));
    const overdueReservations = reservations.filter((r) => r.status === 'overdue' || (r.returnDate < today && activeStatuses.has(r.status)));
    const customersWithBalance = customers.filter((c) => c.remainingBalance > 0);

    return {
      totalDresses: dresses.length,
      availableDresses: dresses.filter((d) => d.status === 'available').length,
      rentedDresses: dresses.filter((d) => d.status === 'rented').length,
      totalCustomers: customers.length,
      activeReservations: reservations.filter((r) => activeStatuses.has(r.status)).length,
      totalCollected,
      totalExpenses,
      netIncome,
      pickupsToday,
      returnsToday,
      overdueReservations,
      customersWithBalance,
    };
  }, [today]);

  return (
    <div className="min-h-full">
      <PageHeader
        title="لوحة التحكم"
        subtitle={`اليوم: ${formatDateAr(today)}`}
      />

      <div className="p-4 md:p-6 space-y-6">
        {/* KPI Cards */}
        <section>
          <h3 className="text-sm font-semibold text-slate-500 mb-3 uppercase tracking-wide">نظرة عامة</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <SummaryCard label="إجمالي الفساتين" value={data.totalDresses} icon={Shirt} color="violet" />
            <SummaryCard label="فساتين متاحة" value={data.availableDresses} icon={Shirt} color="emerald" />
            <SummaryCard label="العميلات" value={data.totalCustomers} icon={Users} color="blue" />
            <SummaryCard label="حجوزات نشطة" value={data.activeReservations} icon={CalendarCheck} color="amber" />
          </div>
        </section>

        {/* Financial Cards */}
        <section>
          <h3 className="text-sm font-semibold text-slate-500 mb-3 uppercase tracking-wide">المالية</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <SummaryCard label="إجمالي المحصّل" value={formatMoneyOMR(data.totalCollected)} icon={CreditCard} color="emerald" />
            <SummaryCard label="إجمالي المصاريف" value={formatMoneyOMR(data.totalExpenses)} icon={Receipt} color="rose" />
            <SummaryCard label="صافي الدخل" value={formatMoneyOMR(data.netIncome)} icon={TrendingUp} color={data.netIncome >= 0 ? 'emerald' : 'rose'} />
          </div>
        </section>

        {/* Today's Activity */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2 mb-3">
              <Truck className="w-4 h-4 text-violet-600" />
              تسليم اليوم ({data.pickupsToday.length})
            </h3>
            {data.pickupsToday.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">لا توجد تسليمات اليوم</p>
            ) : (
              <ul className="space-y-2">
                {data.pickupsToday.slice(0, 5).map((r) => (
                  <li key={r.id} className="text-sm flex items-center justify-between py-1 border-b border-slate-50 last:border-0">
                    <span className="font-medium text-slate-800">{r.customerName}</span>
                    <span className="text-slate-500 text-xs">{r.dressCode}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2 mb-3">
              <CalendarCheck className="w-4 h-4 text-emerald-600" />
              استلام اليوم ({data.returnsToday.length})
            </h3>
            {data.returnsToday.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">لا توجد استلامات اليوم</p>
            ) : (
              <ul className="space-y-2">
                {data.returnsToday.slice(0, 5).map((r) => (
                  <li key={r.id} className="text-sm flex items-center justify-between py-1 border-b border-slate-50 last:border-0">
                    <span className="font-medium text-slate-800">{r.customerName}</span>
                    <span className="text-slate-500 text-xs">{r.dressCode}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* Alerts */}
        {(data.overdueReservations.length > 0 || data.customersWithBalance.length > 0) && (
          <section>
            <h3 className="text-sm font-semibold text-slate-500 mb-3 uppercase tracking-wide">تنبيهات</h3>
            <div className="space-y-2">
              {data.overdueReservations.length > 0 && (
                <div className="flex items-center gap-3 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3 text-sm text-rose-700">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{data.overdueReservations.length} حجوزات متأخرة الإرجاع</span>
                </div>
              )}
              {data.customersWithBalance.length > 0 && (
                <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{data.customersWithBalance.length} عميلات بأرصدة مستحقة</span>
                </div>
              )}
            </div>
          </section>
        )}

        {data.totalDresses === 0 && (
          <div className="bg-violet-50 border border-violet-200 rounded-2xl p-6 text-center">
            <Shirt className="w-10 h-10 text-violet-400 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-violet-800 mb-1">مرحباً بك في Dress Roomshow</h3>
            <p className="text-sm text-violet-600">ابدأ بإضافة فساتينك من قسم الفساتين، ثم أضف العميلات وابدأ في تسجيل الحجوزات.</p>
          </div>
        )}
      </div>
    </div>
  );
}
