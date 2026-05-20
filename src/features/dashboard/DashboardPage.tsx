import { PageHeader } from '../../components/shared/PageHeader';
import { SummaryCard } from '../../components/shared/SummaryCard';
import { useNavigate } from 'react-router-dom';
import { getTodayReport, formatReportMoney } from '../reports/report.service';
import { getReservations, summarizeReservations } from '../reservations/reservation.service';
import { getDresses, summarizeDresses } from '../dresses/dress.service';

export function DashboardPage() {
  const navigate = useNavigate();
  const today = getTodayReport();
  const reservationSummary = summarizeReservations(getReservations());
  const dressSummary = summarizeDresses(getDresses());

  const todayCards = [
    { label: 'حجوزات اليوم', value: reservationSummary.today },
    { label: 'تسليم اليوم', value: today.pickupsToday },
    { label: 'استرجاع اليوم', value: today.returnsToday },
    { label: 'مدفوعات اليوم', value: formatReportMoney(today.paymentsToday) },
  ];

  const quickActions = [
    { label: 'حجز جديد', to: '/reservations' },
    { label: 'إضافة فستان', to: '/dresses' },
    { label: 'إضافة عميلة', to: '/customers' },
    { label: 'تسجيل دفعة', to: '/payments' },
  ];

  return (
    <section className="space-y-6">
      <PageHeader eyebrow="لوحة التشغيل" title="لوحة العمليات اليومية" description="نظرة أنيقة على الحجوزات، التسليمات، الاسترجاعات، والمدفوعات لضمان تشغيل منظم." />
      <article className="rounded-2xl border border-[#E8DED2] bg-white p-5 shadow-sm">
        <h2 className="text-xl font-semibold">مرحباً بك في صالة التشغيل الفاخرة</h2>
        <p className="mt-2 text-[#7A7168]">تابعي أعمال اليوم بسرعة: ما يحتاج متابعة فورية، وما تم إنجازه، وما ينتظر التأكيد.</p>
      </article>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{todayCards.map((c)=><SummaryCard key={c.label} label={c.label} value={c.value} />)}</div>
      <div className="grid gap-4 xl:grid-cols-2">
        <article className="rounded-2xl border border-[#E8DED2] bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold">إجراءات سريعة</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {quickActions.map((action) => (
              <button
                key={action.label}
                onClick={() => navigate(action.to)}
                className="rounded-xl border border-[#E8DED2] bg-[#FAF7F2] px-4 py-3 text-sm font-semibold text-[#8B5E3C]"
              >
                {action.label}
              </button>
            ))}
          </div>
        </article>
        <article className="rounded-2xl border border-[#E8DED2] bg-white p-5 shadow-sm">
          <h3 className="text-lg font-semibold">تنبيهات تشغيلية</h3>
          <ul className="mt-4 space-y-3 text-sm text-[#7A7168]">
            <li className="rounded-xl bg-[#FAF7F2] p-3">حجوزات نشطة: <span className="font-bold text-[#1F1B18]">{reservationSummary.active}</span></li>
            <li className="rounded-xl bg-[#FAF7F2] p-3">فساتين بحاجة خدمة: <span className="font-bold text-[#1F1B18]">{dressSummary.inService}</span></li>
            <li className="rounded-xl bg-[#FFF3DF] p-3 text-[#D69E2E]">استرجاعات متأخرة: <span className="font-bold">{reservationSummary.overdue}</span></li>
          </ul>
        </article>
      </div>
    </section>
  );
}
