import { useMemo } from 'react';
import { BarChart3, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { PageHeader } from '../../components/shared/PageHeader';
import { SummaryCard } from '../../components/shared/SummaryCard';
import { getReportSummary, getFinancialSummary, getDressPerformance, getCustomerBalances, getTodayReport, formatReportMoney } from './report.service';
import { formatDateAr } from '../../shared/utils/date';

export function ReportsPage() {
  const { summary, financial, todayReport, topDresses, balanceCustomers } = useMemo(() => ({
    summary: getReportSummary(),
    financial: getFinancialSummary(),
    todayReport: getTodayReport(),
    topDresses: getDressPerformance().slice(0, 10),
    balanceCustomers: getCustomerBalances(),
  }), []);

  return (
    <div className="min-h-full">
      <PageHeader title="التقارير" subtitle="ملخص شامل لأداء المحل" />

      <div className="p-4 md:p-6 space-y-6">
        {/* Today */}
        <section>
          <h3 className="text-sm font-semibold text-slate-500 mb-3 uppercase tracking-wide">تقرير اليوم — {formatDateAr(todayReport.date)}</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
              <p className="text-2xl font-bold text-violet-700">{todayReport.pickupsToday}</p>
              <p className="text-xs text-slate-500 mt-1">تسليمات اليوم</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
              <p className="text-2xl font-bold text-emerald-600">{todayReport.returnsToday}</p>
              <p className="text-xs text-slate-500 mt-1">استلامات اليوم</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
              <p className="text-lg font-bold text-blue-600">{formatReportMoney(todayReport.paymentsToday)}</p>
              <p className="text-xs text-slate-500 mt-1">مدفوعات اليوم</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4 text-center">
              <p className="text-lg font-bold text-rose-600">{formatReportMoney(todayReport.expensesToday)}</p>
              <p className="text-xs text-slate-500 mt-1">مصاريف اليوم</p>
            </div>
          </div>
        </section>

        {/* Financial Summary */}
        <section>
          <h3 className="text-sm font-semibold text-slate-500 mb-3 uppercase tracking-wide">الملخص المالي الكلي</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <SummaryCard label="إجمالي المحصّل" value={formatReportMoney(financial.totalCollected)} icon={TrendingUp} color="emerald" />
            <SummaryCard label="إجمالي المسترجع" value={formatReportMoney(financial.totalRefunded)} icon={Minus} color="amber" />
            <SummaryCard label="إجمالي المصاريف" value={formatReportMoney(financial.totalExpenses)} icon={TrendingDown} color="rose" />
            <SummaryCard label="صافي الدخل" value={formatReportMoney(financial.netAmount)} icon={BarChart3} color={financial.netAmount >= 0 ? 'emerald' : 'rose'} />
          </div>
        </section>

        {/* Overall Summary */}
        <section>
          <h3 className="text-sm font-semibold text-slate-500 mb-3 uppercase tracking-wide">إجمالي المحل</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-xs text-slate-400">عدد الفساتين</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{summary.totalDresses}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-xs text-slate-400">الحجوزات النشطة</p>
              <p className="text-2xl font-bold text-violet-700 mt-1">{summary.activeReservations}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-xs text-slate-400">عميلات بأرصدة مستحقة</p>
              <p className="text-2xl font-bold text-rose-600 mt-1">{summary.customersWithBalance}</p>
            </div>
          </div>
        </section>

        {/* Dress Performance */}
        {topDresses.length > 0 && (
          <section>
            <h3 className="text-sm font-semibold text-slate-500 mb-3 uppercase tracking-wide">أداء الفساتين (الأكثر إيجاراً)</h3>
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-right font-semibold text-slate-600 px-4 py-3">الكود</th>
                    <th className="text-right font-semibold text-slate-600 px-4 py-3">الاسم</th>
                    <th className="text-right font-semibold text-slate-600 px-4 py-3">عدد الإيجارات</th>
                    <th className="text-right font-semibold text-slate-600 px-4 py-3">الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {topDresses.map((d, i) => (
                    <tr key={d.id} className={i % 2 === 0 ? '' : 'bg-slate-50'}>
                      <td className="px-4 py-3 font-mono text-slate-600">{d.code}</td>
                      <td className="px-4 py-3 text-slate-800">{d.name}</td>
                      <td className="px-4 py-3 font-bold text-violet-700">{d.timesRented}</td>
                      <td className="px-4 py-3 text-slate-600">{d.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Customer Balances */}
        {balanceCustomers.length > 0 && (
          <section>
            <h3 className="text-sm font-semibold text-slate-500 mb-3 uppercase tracking-wide">عميلات بأرصدة مستحقة</h3>
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="text-right font-semibold text-slate-600 px-4 py-3">الاسم</th>
                    <th className="text-right font-semibold text-slate-600 px-4 py-3">الهاتف</th>
                    <th className="text-right font-semibold text-slate-600 px-4 py-3">الرصيد المستحق</th>
                  </tr>
                </thead>
                <tbody>
                  {balanceCustomers.map((c, i) => (
                    <tr key={c.id} className={i % 2 === 0 ? '' : 'bg-slate-50'}>
                      <td className="px-4 py-3 text-slate-800">{c.name}</td>
                      <td className="px-4 py-3 text-slate-600 font-mono" dir="ltr">{c.phone}</td>
                      <td className="px-4 py-3 font-bold text-rose-600">{formatReportMoney(c.remainingBalance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {topDresses.length === 0 && balanceCustomers.length === 0 && summary.totalDresses === 0 && (
          <div className="text-center py-12 text-slate-400">
            <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">لا توجد بيانات بعد. ابدأ بإضافة فساتين وحجوزات لعرض التقارير.</p>
          </div>
        )}
      </div>
    </div>
  );
}
