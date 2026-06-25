import {
  ArrowLeft,
  CalendarCheck,
  CircleAlert,
  PackageCheck,
  ReceiptText,
  Shirt,
  UsersRound,
  WalletCards,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../../components/shared/PageHeader';
import { SummaryCard } from '../../components/shared/SummaryCard';
import { getTodayISO } from '../../shared/utils/date';
import { formatMoneyOMR } from '../../shared/utils/format';
import { getCustomers, summarizeCustomers } from '../customers/customer.service';
import { getDresses, summarizeDresses } from '../dresses/dress.service';
import { getFinancialSummary } from '../reports/report.service';
import { getReservations, summarizeReservations } from '../reservations/reservation.service';
import type { Reservation } from '../reservations/reservation.types';

const reservationStatusLabels: Record<Reservation['status'], string> = {
  pending: 'بانتظار التأكيد',
  confirmed: 'مؤكد',
  delivered: 'تم التسليم',
  returned: 'تم الإرجاع',
  overdue: 'متأخر',
  cancelled: 'ملغي',
};

const quickActions = [
  { to: '/reservations', label: 'إدارة الحجوزات', description: 'متابعة التأكيدات ومواعيد التسليم', icon: CalendarCheck },
  { to: '/delivery-return', label: 'التسليم والاسترجاع', description: 'تنفيذ عمليات التسليم والمرتجعات', icon: PackageCheck },
  { to: '/payments', label: 'تسجيل دفعة', description: 'متابعة العربون والتحصيلات', icon: WalletCards },
  { to: '/expenses', label: 'تسجيل مصروف', description: 'إضافة التكاليف التشغيلية', icon: ReceiptText },
] as const;

function ReservationRow({ reservation }: { reservation: Reservation }) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-xs font-bold text-slate-400">{reservation.reservationNumber}</p>
        <p className="mt-1 font-bold text-slate-950">{reservation.customerName}</p>
        <p className="mt-1 text-sm text-slate-500">{reservation.dressCode} — {reservation.dressName}</p>
      </div>
      <div className="text-sm sm:text-left">
        <p className="font-semibold text-slate-700">{reservationStatusLabels[reservation.status]}</p>
        <p className="mt-1 text-slate-500">الإرجاع: {reservation.returnDate}</p>
      </div>
    </div>
  );
}

export function DashboardPage() {
  const dressesSummary = summarizeDresses(getDresses());
  const customersSummary = summarizeCustomers(getCustomers());
  const reservations = getReservations();
  const reservationsSummary = summarizeReservations(reservations);
  const financialSummary = getFinancialSummary();
  const today = getTodayISO();

  const todayReservations = reservations.filter(
    (reservation) => reservation.pickupDate === today || reservation.returnDate === today,
  );
  const overdueReservations = reservations.filter((reservation) => reservation.status === 'overdue');

  return (
    <section className="space-y-6">
      <div className="overflow-hidden rounded-[2rem] border border-white/70 bg-white/75 p-5 shadow-xl shadow-slate-200/60 backdrop-blur sm:p-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <PageHeader
            eyebrow="لوحة التشغيل"
            title="نظرة سريعة على المحل"
            description="متابعة المخزون والحجوزات والتحصيلات والتنبيهات المهمة من مكان واحد."
          />
          <div className="rounded-3xl bg-slate-950 p-4 text-white shadow-lg shadow-slate-950/10 sm:min-w-64">
            <p className="text-xs font-bold text-amber-300">تاريخ التشغيل</p>
            <p className="mt-2 text-2xl font-extrabold">{today}</p>
            <p className="mt-2 text-sm text-slate-300">{reservationsSummary.today} عملية مرتبطة باليوم</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="إجمالي الفساتين" value={dressesSummary.total} hint={`${dressesSummary.available} متاحة الآن`} tone="positive" />
        <SummaryCard label="العملاء" value={customersSummary.total} hint={`${customersSummary.withBalance} عليهم رصيد`} />
        <SummaryCard label="الحجوزات النشطة" value={reservationsSummary.active} hint={`${reservationsSummary.today} عملية مرتبطة باليوم`} tone="warning" />
        <SummaryCard label="الصافي المالي" value={formatMoneyOMR(financialSummary.netAmount, 2)} hint="بعد الخصومات والمصروفات" tone={financialSummary.netAmount >= 0 ? 'positive' : 'danger'} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {quickActions.map((action) => (
          <Link
            key={action.to}
            to={action.to}
            className="group rounded-3xl border border-white bg-white/85 p-5 shadow-sm ring-1 ring-slate-200/70 transition duration-200 hover:-translate-y-1 hover:border-amber-200 hover:shadow-xl hover:shadow-amber-100/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
          >
            <div className="flex items-start justify-between gap-4">
              <span className="rounded-2xl bg-amber-100 p-3 text-amber-800">
                <action.icon aria-hidden="true" className="h-6 w-6" />
              </span>
              <ArrowLeft aria-hidden="true" className="h-5 w-5 text-slate-300 transition group-hover:-translate-x-1 group-hover:text-amber-700" />
            </div>
            <h2 className="mt-4 font-extrabold text-slate-950">{action.label}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">{action.description}</p>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <article className="rounded-3xl border border-white bg-white/90 p-5 shadow-sm ring-1 ring-slate-200/70">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold text-amber-700">{today}</p>
              <h2 className="mt-1 text-lg font-bold text-slate-950">أعمال اليوم</h2>
            </div>
            <CalendarCheck aria-hidden="true" className="h-6 w-6 text-amber-700" />
          </div>

          {todayReservations.length > 0 ? (
            <div className="mt-4 space-y-3">
              {todayReservations.map((reservation) => (
                <ReservationRow key={reservation.id} reservation={reservation} />
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 p-5 text-sm text-slate-500">
              لا توجد عمليات تسليم أو استرجاع مسجلة لليوم.
            </div>
          )}
        </article>

        <article className="rounded-3xl border border-white bg-white/90 p-5 shadow-sm ring-1 ring-slate-200/70">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold text-rose-700">تحتاج متابعة</p>
              <h2 className="mt-1 text-lg font-bold text-slate-950">تنبيهات مهمة</h2>
            </div>
            <CircleAlert aria-hidden="true" className="h-6 w-6 text-rose-700" />
          </div>

          {overdueReservations.length > 0 ? (
            <div className="mt-4 space-y-3">
              {overdueReservations.map((reservation) => (
                <ReservationRow key={reservation.id} reservation={reservation} />
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 p-5 text-sm text-slate-500">
              لا توجد حجوزات متأخرة حالياً.
            </div>
          )}
        </article>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          to="/dresses"
          className="flex items-center justify-between gap-4 rounded-3xl border border-slate-800 bg-slate-950 p-5 text-white shadow-lg shadow-slate-950/10 transition duration-200 hover:-translate-y-0.5 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
        >
          <div>
            <p className="text-sm font-bold text-amber-300">المخزون</p>
            <p className="mt-2 text-lg font-bold">{dressesSummary.inService} فساتين في المغسلة أو التعديل</p>
          </div>
          <Shirt aria-hidden="true" className="h-8 w-8 text-amber-300" />
        </Link>

        <Link
          to="/customers"
          className="flex items-center justify-between gap-4 rounded-3xl border border-white bg-white/90 p-5 shadow-sm ring-1 ring-slate-200/70 transition duration-200 hover:-translate-y-0.5 hover:border-amber-200 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
        >
          <div>
            <p className="text-sm font-bold text-amber-700">العملاء</p>
            <p className="mt-2 text-lg font-bold text-slate-950">{customersSummary.blockedOrWarning} حالات تحتاج مراجعة قبل حجز جديد</p>
          </div>
          <UsersRound aria-hidden="true" className="h-8 w-8 text-amber-700" />
        </Link>
      </div>
    </section>
  );
}
