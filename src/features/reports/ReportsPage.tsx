import { useMemo, useState } from 'react';
import {
  formatReportMoney,
  getCustomerBalances,
  getDressPerformance,
  getFinancialSummary,
  getReportSummary,
  getTodayReport,
} from './report.service';
import type { DateRangeFilter } from './report.types';
import type { DressStatus } from '../dresses/dress.types';
import { EmptyState } from '../../components/shared/EmptyState';
import { FilterPanel } from '../../components/shared/FilterPanel';
import { PageHeader } from '../../components/shared/PageHeader';
import { SummaryCard } from '../../components/shared/SummaryCard';

const statusLabel: Record<Extract<DressStatus, 'available' | 'reserved' | 'maintenance'>, string> = {
  available: 'متاح',
  reserved: 'محجوز',
  maintenance: 'صيانة',
};

export function ReportsPage() {
  const [range, setRange] = useState<DateRangeFilter>({ from: '', to: '' });
  const [appliedRange, setAppliedRange] = useState<DateRangeFilter>({ from: '', to: '' });

  const summary = useMemo(() => getReportSummary(), []);
  const today = useMemo(() => getTodayReport(), []);
  const dressPerformance = useMemo(() => getDressPerformance(), []);
  const customerBalances = useMemo(() => getCustomerBalances(), []);
  const financial = useMemo(() => getFinancialSummary(), []);

  return (
    <section className="space-y-6">
      <PageHeader eyebrow="التقارير" title="التقارير البسيطة" description="نظرة سريعة على الأداء التشغيلي والمالي اعتماداً على بيانات النظام الحالية." />

      {appliedRange.from || appliedRange.to ? (
        <p className="rounded-xl bg-[#FAF7F2] px-3 py-2 text-sm text-[#7A7168]">
          الفترة المطبقة: {appliedRange.from || '—'} إلى {appliedRange.to || '—'}
        </p>
      ) : null}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <SummaryCard label="إجمالي الفساتين" value={summary.totalDresses} />
        <SummaryCard label="الحجوزات النشطة" value={summary.activeReservations} />
        <SummaryCard label="إجمالي التحصيل" value={formatReportMoney(summary.totalCollected)} />
        <SummaryCard label="إجمالي المصروفات" value={formatReportMoney(summary.totalExpenses)} />
        <SummaryCard label="الصافي" value={formatReportMoney(summary.netAmount)} />
        <SummaryCard label="عملاء عليهم رصيد" value={summary.customersWithBalance} />
      </div>

      <FilterPanel>
        <h2 className="text-lg font-semibold">فلتر الفترة</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <input type="date" value={range.from} onChange={(e)=>setRange((p)=>({...p,from:e.target.value}))} className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
          <input type="date" value={range.to} onChange={(e)=>setRange((p)=>({...p,to:e.target.value}))} className="rounded-xl border border-slate-300 px-3 py-2 text-sm" />
          <button onClick={() => setAppliedRange(range)} className="rounded-xl bg-[#8B5E3C] px-4 py-2 text-sm font-semibold text-white hover:bg-[#7A5133]">تطبيق الفترة</button>
        </div>
      </FilterPanel>

      <article className="rounded-2xl border border-[#E8DED2] bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold">تقرير اليوم ({today.date})</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4 text-sm">
          <p>استلامات اليوم: <span className="font-bold">{today.pickupsToday}</span></p>
          <p>مرتجعات اليوم: <span className="font-bold">{today.returnsToday}</span></p>
          <p>مدفوعات اليوم: <span className="font-bold">{formatReportMoney(today.paymentsToday)}</span></p>
          <p>مصروفات اليوم: <span className="font-bold">{formatReportMoney(today.expensesToday)}</span></p>
        </div>
      </article>

      <div className="grid gap-4 xl:grid-cols-2">
        <article className="rounded-2xl border border-[#E8DED2] bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">أداء الفساتين</h2>
          {dressPerformance.length === 0 ? <EmptyState title="لا توجد بيانات أداء" description="لا توجد بيانات أداء حالياً." /> : (
            <div className="mt-3 space-y-2 text-sm">{dressPerformance.slice(0, 5).map((dress) => <div key={dress.id} className="flex items-center justify-between rounded-xl bg-[#FAF7F2] p-3"><p>{dress.code} - {dress.name}</p><p className="font-semibold">{dress.timesRented} | {statusLabel[dress.status]}</p></div>)}</div>
          )}
        </article>

        <article className="rounded-2xl border border-[#E8DED2] bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold">أرصدة العملاء</h2>
          {customerBalances.length === 0 ? <EmptyState title="لا يوجد أرصدة عملاء" description="لا يوجد عملاء عليهم رصيد." /> : (
            <div className="mt-3 space-y-2 text-sm">{customerBalances.map((customer)=><div key={customer.id} className="flex items-center justify-between rounded-xl bg-[#FAF7F2] p-3"><p>{customer.name} - {customer.phone}</p><p className="font-semibold text-rose-700">{formatReportMoney(customer.remainingBalance)}</p></div>)}</div>
          )}
        </article>
      </div>

      <article className="rounded-2xl border border-[#E8DED2] bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold">الملخص المالي</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4 text-sm">
          <p>التحصيل: <span className="font-bold">{formatReportMoney(financial.totalCollected)}</span></p>
          <p>الاسترجاعات: <span className="font-bold">{formatReportMoney(financial.totalRefunded)}</span></p>
          <p>المصروفات: <span className="font-bold">{formatReportMoney(financial.totalExpenses)}</span></p>
          <p>الصافي: <span className="font-bold">{formatReportMoney(financial.netAmount)}</span></p>
        </div>
      </article>
    </section>
  );
}
