import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  BadgeAlert,
  BellRing,
  CalendarDays,
  Gem,
  PackageCheck,
  Plus,
  Shirt,
  UsersRound,
  Wallet,
  WalletCards,
  Wrench,
} from 'lucide-react';
import { PageHeader } from '../../components/shared/PageHeader';
import { Section } from '../../components/shared/Section';
import { SummaryCard } from '../../components/shared/SummaryCard';
import { EmptyState } from '../../components/shared/StateViews';
import { AMBER_FOCUS_RING_CLASS_NAME } from '../../shared/domain/formConstants';
import {
  COMPACT_SECONDARY_BUTTON_CLASS_NAME,
  COMPACT_PRIMARY_BUTTON_CLASS_NAME,
} from '../../shared/domain/uiConstants';
import { RESERVATION_STATUS_LABELS, RESERVATION_STATUS_STYLES } from '../../shared/domain/reservationConstants';
import { formatTimeLabel } from '../../shared/utils/date';
import { formatMoneyOMR } from '../../shared/utils/format';
import { getDashboardSnapshot, isShowroomEmpty, type DashboardTask } from './dashboard.service';
import { SetupChecklistCard } from './SetupChecklistCard';
import { AboutSupportCard } from './AboutSupportCard';

const shortcuts = [
  { to: '/reservations?new=1', label: 'حجز جديد', hint: 'إنشاء حجز', icon: CalendarDays },
  { to: '/delivery-return', label: 'تسليم واسترجاع', hint: 'عمليات اليوم', icon: PackageCheck },
  { to: '/payments', label: 'تحصيل دفعة', hint: 'تسجيل مبلغ', icon: WalletCards },
  { to: '/inventory', label: 'المخزون', hint: 'إدارة العناصر', icon: Shirt },
  { to: '/accessories', label: 'الملحقات', hint: 'الطرح والتيجان', icon: Gem },
  { to: '/customers', label: 'العميلات', hint: 'سجل العميلات', icon: UsersRound },
];

function TaskRow({ task }: { task: DashboardTask }) {
  const { reservation } = task;
  return (
    <li>
      <Link
        to={`/reservations?search=${encodeURIComponent(reservation.reservationNumber)}`}
        className={`flex items-center gap-3 rounded-xl p-3 transition ${AMBER_FOCUS_RING_CLASS_NAME}`}
        style={{ background: 'var(--surface-2)' }}
      >
        <span
          className="shrink-0 rounded-lg px-2 py-1 text-xs font-bold"
          style={{ background: 'var(--surface)', color: 'var(--ink)', boxShadow: 'inset 0 0 0 1px var(--line)' }}
        >
          {formatTimeLabel(task.time)}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold">{reservation.customerName}</span>
          <span className="block truncate text-xs" style={{ color: 'var(--muted)' }}>
            {reservation.dressCode} — {reservation.dressName}
            {task.accessoryCount > 0 ? ` · ${task.accessoryCount} ملحق` : ''}
          </span>
        </span>
        <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold ring-1 ${RESERVATION_STATUS_STYLES[reservation.status]}`}>
          {RESERVATION_STATUS_LABELS[reservation.status]}
        </span>
      </Link>
    </li>
  );
}

function TaskList({ tasks, emptyText }: { tasks: DashboardTask[]; emptyText: string }) {
  if (tasks.length === 0) return <p className="text-sm" style={{ color: 'var(--muted)' }}>{emptyText}</p>;
  return <ul className="space-y-2">{tasks.map((task) => <TaskRow key={`${task.reservation.id}-${task.time}`} task={task} />)}</ul>;
}

export function DashboardPage() {
  const snapshot = useMemo(() => getDashboardSnapshot(), []);
  const empty = useMemo(() => isShowroomEmpty(), []);
  const { money, reservations, service, depositLiability } = snapshot;

  if (empty) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="الرئيسية" title="لوحة التحكم" />
        <SetupChecklistCard />
        <EmptyState
          icon={<Shirt className="h-10 w-10" />}
          title="لم تبدأ بيانات المعرض بعد"
          description="أضيفي أول فستان إلى المخزون، ثم أضيفي عميلة، ثم أنشئي أول حجز. ستمتلئ هذه اللوحة تلقائياً بمهام اليوم والمبالغ المستحقة."
          action={
            <div className="flex flex-wrap justify-center gap-3">
              <Link to="/inventory" className={COMPACT_PRIMARY_BUTTON_CLASS_NAME}>
                <Plus aria-hidden="true" className="h-4 w-4" />
                إضافة أول عنصر
              </Link>
              <Link to="/customers" className={COMPACT_SECONDARY_BUTTON_CLASS_NAME}>
                <UsersRound aria-hidden="true" className="h-4 w-4" />
                إضافة أول عميلة
              </Link>
            </div>
          }
        />
        <AboutSupportCard />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="الرئيسية" title="لوحة التحكم" />

      <SetupChecklistCard />

      {money.outstandingCount > 0 && (
        <div role="alert" className="rounded-2xl border p-4" style={{ borderColor: 'color-mix(in srgb, var(--warn) 40%, transparent)', background: 'var(--gold-dim)' }}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <BadgeAlert aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" style={{ color: 'var(--warn)' }} />
              <div className="min-w-0">
                <p className="text-sm font-semibold">
                  مبالغ غير محصّلة: {formatMoneyOMR(money.outstandingTotal)} على {money.outstandingCount} حجز
                </p>
                {money.outstandingOverdueTotal > 0 && (
                  <p className="mt-1 text-xs font-medium" style={{ color: 'var(--danger)' }}>
                    منها {formatMoneyOMR(money.outstandingOverdueTotal)} على حجوزات انتهت مدتها ولم تُسدَّد.
                  </p>
                )}
              </div>
            </div>
            <Link to="/payments" className={COMPACT_PRIMARY_BUTTON_CLASS_NAME}>
              تحصيل الآن
              <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            </Link>
          </div>

          <ul className="mt-3 space-y-1.5">
            {snapshot.outstandingBalances.slice(0, 4).map((row) => (
              <li key={row.reservationNumber} className="flex flex-wrap items-center justify-between gap-2 rounded-xl px-3 py-2 text-xs" style={{ background: 'var(--surface)' }}>
                <span className="min-w-0 truncate font-medium">
                  {row.customerName} · {row.dressCode}
                  {row.isOverdue && (
                    <span className="mr-1 rounded px-1.5 py-0.5 text-[10px] font-bold" style={{ background: 'color-mix(in srgb, var(--danger) 16%, transparent)', color: 'var(--danger)' }}>
                      متأخر
                    </span>
                  )}
                </span>
                <span className="shrink-0 font-semibold" style={{ color: 'var(--danger)' }}>{formatMoneyOMR(row.remainingAmount)}</span>
              </li>
            ))}
            {snapshot.outstandingBalances.length > 4 && (
              <li className="px-3 text-xs font-medium" style={{ color: 'var(--muted)' }}>و{snapshot.outstandingBalances.length - 4} حجزاً آخر…</li>
            )}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <SummaryCard label="عمليات اليوم" value={reservations.today} hint={`${snapshot.pickupsToday.length} تسليم · ${snapshot.returnsToday.length} إرجاع`} />
        <SummaryCard label="محصّل اليوم" value={formatMoneyOMR(money.collectedToday)} hint={`صافي ${formatMoneyOMR(money.netToday)}`} tone="positive" />
        <SummaryCard label="غير محصّل" value={formatMoneyOMR(money.outstandingTotal)} tone={money.outstandingTotal > 0 ? 'warning' : 'default'} hint={`${money.outstandingCount} حجز`} />
        <SummaryCard label="متأخرة" value={reservations.overdue} tone={reservations.overdue > 0 ? 'danger' : 'default'} hint="تجاوزت موعد الإرجاع" />
      </div>

      {(snapshot.reminders.total > 0 || reservations.overdue > 0 || depositLiability.held > 0) && (
        <div className="grid gap-3 lg:grid-cols-3">
          {snapshot.reminders.total > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4" style={{ borderColor: 'var(--line)', background: 'var(--surface)' }}>
              <div className="flex min-w-0 items-center gap-3">
                <BellRing aria-hidden="true" className="h-5 w-5 shrink-0" style={{ color: 'var(--gold)' }} />
                <p className="min-w-0 text-sm font-medium">
                  {snapshot.reminders.total} متابعة مطلوبة مع العميلات اليوم
                  {snapshot.reminders.critical > 0 ? ` · ${snapshot.reminders.critical} عاجلة` : ''}
                </p>
              </div>
              <Link to="/reminders" className={COMPACT_SECONDARY_BUTTON_CLASS_NAME}>فتح التذكيرات</Link>
            </div>
          )}
          {reservations.overdue > 0 && (
            <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4" style={{ borderColor: 'color-mix(in srgb, var(--danger) 35%, transparent)', background: 'var(--surface)' }}>
              <p className="text-sm font-semibold">
                {reservations.overdue} حجز تجاوز موعد الإرجاع ولم يُسترجع بعد.
              </p>
              <Link to="/delivery-return" className={COMPACT_SECONDARY_BUTTON_CLASS_NAME}>تسجيل الاسترجاع</Link>
            </div>
          )}
          {depositLiability.held > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4" style={{ borderColor: 'var(--line)', background: 'var(--surface)' }}>
              <div className="flex min-w-0 items-center gap-3">
                <Wallet aria-hidden="true" className="h-5 w-5 shrink-0" style={{ color: 'var(--muted)' }} />
                <div className="min-w-0">
                  <p className="text-sm font-semibold">عرابين محتجزة لديكِ: {formatMoneyOMR(depositLiability.held)}</p>
                  <p className="mt-0.5 text-xs" style={{ color: 'var(--muted)' }}>مبلغ مستحق الرد للعميلات وليس إيراداً. احتفظي بما يغطيه في الصندوق.</p>
                </div>
              </div>
              <Link to="/reports" className={COMPACT_SECONDARY_BUTTON_CLASS_NAME}>تفاصيل الالتزامات</Link>
            </div>
          )}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="تسليمات اليوم" description="الحجوزات المستحقة للتسليم اليوم مرتبة بالوقت." action={<Link to="/delivery-return" className="text-sm font-medium" style={{ color: 'var(--gold)' }}>فتح الشاشة</Link>}>
          <TaskList tasks={snapshot.pickupsToday} emptyText="لا توجد تسليمات مجدولة اليوم." />
        </Section>

        <Section title="إرجاعات اليوم" description="القطع المتوقع عودتها اليوم." action={<Link to="/delivery-return" className="text-sm font-medium" style={{ color: 'var(--gold)' }}>فتح الشاشة</Link>}>
          <TaskList tasks={snapshot.returnsToday} emptyText="لا توجد إرجاعات مجدولة اليوم." />
        </Section>

        {snapshot.overdueReturns.length > 0 && (
          <Section title="إرجاعات متأخرة" description="قطع خارج المحل تجاوزت موعد إرجاعها.">
            <TaskList tasks={snapshot.overdueReturns} emptyText="لا توجد إرجاعات متأخرة." />
          </Section>
        )}

        <Section title="حالة المخزون والخدمة">
          <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            {[
              ['إجمالي المخزون', snapshot.inventory.total],
              ['متاح', snapshot.inventory.available],
              ['مؤجر حالياً', snapshot.inventory.rented],
              ['ملحقات متاحة', snapshot.accessories.available],
              ['ملحقات خارج المحل', snapshot.accessoriesOutCount],
              ['حجوزات الأسبوع القادم', reservations.upcomingWeek],
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-xl p-3" style={{ background: 'var(--surface-2)' }}>
                <dt className="text-xs" style={{ color: 'var(--muted)' }}>{label}</dt>
                <dd className="mt-1 text-lg font-semibold">{value}</dd>
              </div>
            ))}
          </dl>

          {(service.open > 0 || service.inProgress > 0) && (
            <Link
              to="/service"
              className={`mt-3 flex items-center gap-3 rounded-xl p-3 text-sm transition ${AMBER_FOCUS_RING_CLASS_NAME}`}
              style={{ background: 'var(--surface-2)' }}
            >
              <Wrench aria-hidden="true" className="h-5 w-5 shrink-0" />
              <span className="min-w-0 flex-1 font-medium">
                طابور الخدمة: {service.open} بانتظار البدء · {service.inProgress} قيد التنفيذ
                {service.overdue > 0 ? ` · ${service.overdue} متأخرة` : ''}
              </span>
              <ArrowLeft aria-hidden="true" className="h-4 w-4 shrink-0" />
            </Link>
          )}
        </Section>

        <Section title="اختصارات سريعة">
          <div className="grid gap-2 sm:grid-cols-2">
            {shortcuts.map((shortcut) => (
              <Link
                key={shortcut.to}
                to={shortcut.to}
                className={`flex items-center gap-3 rounded-xl p-3 transition ${AMBER_FOCUS_RING_CLASS_NAME}`}
                style={{ background: 'var(--surface-2)' }}
              >
                <shortcut.icon aria-hidden="true" className="h-4 w-4" style={{ color: 'var(--gold)' }} />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{shortcut.label}</span>
                  <span className="block truncate text-xs" style={{ color: 'var(--muted)' }}>{shortcut.hint}</span>
                </span>
              </Link>
            ))}
          </div>
        </Section>
      </div>

      <AboutSupportCard />
    </div>
  );
}
