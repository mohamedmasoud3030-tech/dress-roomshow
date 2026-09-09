import { useMemo, useState } from 'react';
import { CalendarCheck, CircleAlert, Download, Plus, Printer, Shirt, UserRound, XCircle } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { downloadCsv } from '@platform/download';
import {
  ALERT_STYLES,
  ALERT_BASE_CLASS_NAME,
  SUMMARY_GRID_CLASS_NAME,
  CARD_GRID_CLASS_NAME,
} from '../../shared/domain/uiConstants';
import { buildReservationsCsv, ledgerFileName } from '../reports/ledgerExports';
import { Button } from '../../components/shared/Button';
import { FilterBar, SearchFilter, SelectFilter } from '../../components/shared/FilterBar';
import { PageHeader } from '../../components/shared/PageHeader';
import { EmptyState } from '../../components/shared/StateViews';
import { SummaryCard } from '../../components/shared/SummaryCard';
import { RESERVATION_STATUS_LABELS, RESERVATION_STATUS_STYLES } from '../../shared/domain/reservationConstants';
import { formatMoneyOMR } from '../../shared/utils/format';
import { CreateReservationModal } from './CreateReservationModal';
import { ReservationAccessoriesPanel } from './ReservationAccessoriesPanel';
import { formatTimeLabel } from '../../shared/utils/date';
import { getReservationTimes } from './reservation.service';
import { cancelReservationCommand } from '../workflows';
import { filterReservations, getReservations, summarizeReservations } from './reservation.service';
import { ReservationCalendar } from './ReservationCalendar';
import { printRentalContract } from './printRentalContract';
import { getReservationLines, isMultiItemReservation, getOutstandingLines, getPendingDeliveryLines, getReturnedLines } from './contractLineHelpers';
import type { Reservation, ReservationFilters } from './reservation.types';

function LineStatusBadge({ deliveryStatus }: { deliveryStatus: string }) {
  const styles: Record<string, string> = {
    pending_delivery: 'bg-amber-50 text-amber-800 ring-amber-200',
    delivered: 'bg-sky-50 text-sky-800 ring-sky-200',
    returned: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
    late: 'bg-rose-50 text-rose-800 ring-rose-200',
  };
  const labels: Record<string, string> = {
    pending_delivery: 'بانتظار التسليم',
    delivered: 'مسلَّم',
    returned: 'مسترجع',
    late: 'متأخر',
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ${styles[deliveryStatus] ?? 'bg-slate-100 text-slate-600 ring-slate-200'}`}>
      {labels[deliveryStatus] ?? deliveryStatus}
    </span>
  );
}

function ReservationCard({ reservation, onCancel, onPrint }: { reservation: Reservation; onCancel: (id: string) => void; onPrint: (reservation: Reservation) => void }) {
  const rentalStillCollected = Math.max((reservation.rentalCollectedAmount ?? 0) - (reservation.rentalRefundedAmount ?? 0), 0);
  const depositLiability = Math.max(
    (reservation.securityDepositCollectedAmount ?? 0)
      - (reservation.securityDepositRefundedAmount ?? 0)
      - (reservation.securityDepositRetainedAmount ?? 0),
    0,
  );
  const hasOnlyBookingAdvance = (reservation.bookingAdvanceCollectedAmount ?? 0) > 0
    && rentalStillCollected === 0
    && depositLiability === 0;
  const canCancel = ['pending', 'confirmed'].includes(reservation.status)
    && (reservation.paidAmount === 0 || hasOnlyBookingAdvance);
  const times = getReservationTimes(reservation);
  const lines = getReservationLines(reservation);
  const isMulti = isMultiItemReservation(reservation);
  const outstandingLines = getOutstandingLines(reservation);
  const pendingLines = getPendingDeliveryLines(reservation);
  const returnedLines = getReturnedLines(reservation);

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-bold text-slate-400">{reservation.reservationNumber}</p>
          <h2 className="mt-1 text-lg font-bold text-slate-950">{reservation.customerName}</h2>
          <p className="mt-1 text-sm text-slate-600">{reservation.customerPhone}</p>
          <div className="mt-2 flex flex-wrap gap-2 text-sm font-medium">
            <Link
              to={`/customers?search=${encodeURIComponent(reservation.customerPhone)}`}
              className="inline-flex min-h-9 items-center gap-1 rounded-lg bg-stone-100 px-2.5 font-bold text-slate-700 transition hover:bg-stone-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
            >
              <UserRound aria-hidden="true" className="h-4 w-4" />
              بيانات العميلة
            </Link>
          </div>
        </div>
        <span className={`w-fit rounded-full px-3 py-1 text-xs font-bold ring-1 ${RESERVATION_STATUS_STYLES[reservation.status]}`}>
          {RESERVATION_STATUS_LABELS[reservation.status]}
        </span>
      </div>

      {/* ── Contract Lines ─────────────────────────────────────────────── */}
      <div className="mt-4 space-y-2">
        {lines.map((line) => (
          <div key={line.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-stone-50 p-3 ring-1 ring-slate-100">
            <div className="flex items-center gap-2 min-w-0">
              <Shirt aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-400" />
              <Link
                to={`/inventory/${encodeURIComponent(line.dressCodeSnapshot)}`}
                className="text-sm font-bold text-slate-900 hover:underline"
              >
                {line.dressCodeSnapshot} — {line.dressNameSnapshot}
              </Link>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600">{formatMoneyOMR(line.rentalPrice)}</span>
              <LineStatusBadge deliveryStatus={line.deliveryStatus} />
            </div>
          </div>
        ))}
      </div>

      {/* ── Line summary ───────────────────────────────────────────────── */}
      {isMulti && (
        <div className="mt-3 grid gap-2 rounded-xl bg-slate-50 p-3 text-xs sm:grid-cols-3">
          {pendingLines.length > 0 && (
            <div><span className="font-bold text-amber-700">{pendingLines.length}</span> <span className="text-slate-600">بانتظار التسليم</span></div>
          )}
          {outstandingLines.length > 0 && (
            <div><span className="font-bold text-sky-700">{outstandingLines.length}</span> <span className="text-slate-600">مسلّمة</span></div>
          )}
          {returnedLines.length > 0 && (
            <div><span className="font-bold text-emerald-700">{returnedLines.length}</span> <span className="text-slate-600">مسترجعة</span></div>
          )}
        </div>
      )}

      <div className="mt-4 grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2 xl:grid-cols-4">
        <div><p className="text-xs font-bold text-slate-400">الاستلام</p><p className="mt-1 text-sm font-semibold text-slate-800">{reservation.pickupDate} · {formatTimeLabel(times.pickupTime)}</p></div>
        <div><p className="text-xs font-bold text-slate-400">الإرجاع</p><p className="mt-1 text-sm font-semibold text-slate-800">{reservation.returnDate} · {formatTimeLabel(times.returnTime)}</p></div>
        <div><p className="text-xs font-bold text-slate-400">الإجمالي</p><p className="mt-1 text-sm font-bold text-slate-950">{formatMoneyOMR(reservation.totalAmount)}</p></div>
        <div><p className="text-xs font-bold text-slate-400">المتبقي</p><p className={`mt-1 text-sm font-bold ${reservation.remainingAmount > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>{formatMoneyOMR(reservation.remainingAmount)}</p></div>
      </div>

      {reservation.notes && <p className="mt-4 rounded-xl bg-stone-50 p-3 text-sm leading-6 text-slate-600">{reservation.notes}</p>}
      <ReservationAccessoriesPanel reservation={reservation} />
      <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
        <Button type="button" variant="secondary" size="sm" onClick={() => onPrint(reservation)}>
          <Printer aria-hidden="true" className="h-4 w-4" />
          طباعة العقد
        </Button>
      </div>
      {canCancel && (
        <div className="mt-2 flex justify-end">
          <Button type="button" variant="quiet" size="sm" onClick={() => onCancel(reservation.id)} className="text-slate-500 hover:bg-rose-50 hover:text-rose-700">
            <XCircle aria-hidden="true" className="h-4 w-4" />
            إلغاء الحجز
          </Button>
        </div>
      )}
    </article>
  );
}

export function ReservationsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [reservations, setReservations] = useState<Reservation[]>(() => getReservations());
  const [filters, setFilters] = useState<ReservationFilters>(() => {
    const timing = searchParams.get('timing');
    const status = searchParams.get('status');
    const safeStatus = status && Object.prototype.hasOwnProperty.call(RESERVATION_STATUS_LABELS, status) ? status as ReservationFilters['status'] : 'all';
    return {
      search: searchParams.get('search') ?? '',
      status: safeStatus,
      timing: timing === 'today' || timing === 'upcoming' || timing === 'overdue' ? timing : 'all',
    };
  });
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'danger'; message: string } | null>(null);

  const showCreateModal = searchParams.get('new') === '1';
  const createPrefill = useMemo(() => ({
    customerId: searchParams.get('customer') ?? undefined,
    dressCode: searchParams.get('dress') ?? undefined,
    pickupDate: searchParams.get('pickup') ?? undefined,
    returnDate: searchParams.get('return') ?? undefined,
    waitlistEntryId: searchParams.get('waitlist') ?? undefined,
  }), [searchParams]);
  const filteredReservations = useMemo(() => filterReservations(reservations, filters), [reservations, filters]);
  const summary = useMemo(() => summarizeReservations(reservations), [reservations]);
  const openCreateModal = () => { setFeedback(null); const nextParams = new URLSearchParams(searchParams); nextParams.set('new', '1'); setSearchParams(nextParams); };
  const closeCreateModal = () => { const nextParams = new URLSearchParams(searchParams); nextParams.delete('new'); setSearchParams(nextParams, { replace: true }); };
  const updateFilters = (updates: Partial<ReservationFilters>) => {
    const nextFilters = { ...filters, ...updates };
    setFilters(nextFilters);
    const nextParams = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(nextFilters)) {
      if (value === 'all' || value === '') nextParams.delete(key);
      else nextParams.set(key, value);
    }
    setSearchParams(nextParams, { replace: true });
  };
  const clearFilters = () => updateFilters({ search: '', status: 'all', timing: 'all' });
  const hasActiveFilters = filters.search !== '' || filters.status !== 'all' || filters.timing !== 'all';
  const handleCreated = (reservation: Reservation) => { setReservations((current) => [reservation, ...current]); setFeedback({ tone: 'success', message: `تم إنشاء الحجز ${reservation.reservationNumber} بنجاح.` }); };
  const handleCancel = (id: string) => {
    const reservation = reservations.find((item) => item.id === id);
    if (!reservation || !window.confirm(`هل تريدين إلغاء الحجز ${reservation.reservationNumber}؟`)) return;
    const hasBookingAdvance = (reservation.bookingAdvanceCollectedAmount ?? 0) > 0;
    const cancellationReason = hasBookingAdvance
      ? window.prompt('اكتبي سبب الإلغاء. ستبقى دفعة الحجز المحصلة غير مستردة وفق السياسة:')
      : undefined;
    if (hasBookingAdvance && cancellationReason === null) return;
    if (hasBookingAdvance && !window.confirm('تأكيد: تم إبلاغ العميلة بأن دفعة الحجز المحصلة غير مستردة، وسيتم حفظ هذا الإقرار في السجل؟')) return;
    try { cancelReservationCommand({ id, cancellationReason: cancellationReason ?? undefined, cancellationPolicyAck: hasBookingAdvance }); setReservations(getReservations()); setFeedback({ tone: 'success', message: `تم إلغاء الحجز ${reservation.reservationNumber}.` }); }
    catch (error: unknown) { setFeedback({ tone: 'danger', message: error instanceof Error ? error.message : 'تعذر إلغاء الحجز.' }); }
  };
  const handleOpenFromCalendar = (reservation: Reservation) => {
    updateFilters({ search: reservation.reservationNumber, status: 'all', timing: 'all' });
    setFeedback({ tone: 'success', message: `تم فتح الحجز ${reservation.reservationNumber} من التقويم.` });
  };
  const handleExport = () => {
    downloadCsv(ledgerFileName('سجل-الحجوزات'), buildReservationsCsv(filteredReservations));
  };

  const handlePrint = (reservation: Reservation) => {
    try { printRentalContract(reservation); }
    catch (error: unknown) { setFeedback({ tone: 'danger', message: error instanceof Error ? error.message : 'تعذر طباعة العقد.' }); }
  };

  return <section className="space-y-6">
    <PageHeader
      eyebrow="الحجوزات"
      title="إدارة الحجوزات"
      actions={(
        <>
          <Button type="button" variant="secondary" onClick={handleExport}>
            <Download aria-hidden="true" className="h-5 w-5" />
            تصدير CSV
          </Button>
          <Button type="button" variant="primary" onClick={openCreateModal}>
            <Plus aria-hidden="true" className="h-5 w-5" />
            حجز جديد
          </Button>
        </>
      )}
    />
    {feedback && (
      <div
        role="status"
        className={`${ALERT_BASE_CLASS_NAME} ${feedback.tone === 'success' ? ALERT_STYLES.success : ALERT_STYLES.danger}`}
      >
        {feedback.message}
      </div>
    )}
    <div className={SUMMARY_GRID_CLASS_NAME}>
      <SummaryCard label="إجمالي الحجوزات" value={summary.total} />
      <SummaryCard label="الحجوزات النشطة" value={summary.active} tone="positive" />
      <SummaryCard label="عمليات اليوم" value={summary.today} hint="استلام أو إرجاع" />
      <SummaryCard label="متأخرة" value={summary.overdue} tone={summary.overdue > 0 ? 'danger' : 'default'} />
    </div>
    <FilterBar>
      <SearchFilter
        label="البحث في الحجوزات"
        value={filters.search}
        onChange={(search) => updateFilters({ search })}
        placeholder="ابحثي برقم الحجز أو العميلة أو العنصر"
      />
      <SelectFilter
        label="حالة الحجز"
        value={filters.status}
        onChange={(status) => updateFilters({ status })}
        options={[
          { value: 'all', label: 'كل الحالات' },
          ...Object.entries(RESERVATION_STATUS_LABELS).map(([value, label]) => ({ value: value as ReservationFilters['status'], label })),
        ]}
      />
      <SelectFilter
        label="توقيت الحجز"
        value={filters.timing}
        onChange={(timing) => updateFilters({ timing })}
        options={[
          { value: 'all', label: 'كل المواعيد' },
          { value: 'today', label: 'اليوم' },
          { value: 'upcoming', label: 'القادمة' },
          { value: 'overdue', label: 'المتأخرة' },
        ]}
      />
      {hasActiveFilters ? (
        <Button type="button" variant="quiet" size="sm" onClick={clearFilters} className="justify-self-start text-slate-600 hover:bg-stone-100 xl:justify-self-end">
          مسح الفلاتر
        </Button>
      ) : null}
    </FilterBar>
    <ReservationCalendar reservations={reservations} onOpenReservation={handleOpenFromCalendar} />
    {filteredReservations.length > 0 ? (
      <div className={CARD_GRID_CLASS_NAME}>
        {filteredReservations.map((reservation) => (
          <ReservationCard key={reservation.id} reservation={reservation} onCancel={handleCancel} onPrint={handlePrint} />
        ))}
      </div>
    ) : reservations.length === 0
      ? (
        <EmptyState
          icon={<CalendarCheck className="h-10 w-10" />}
          title="لا توجد حجوزات حتى الآن"
          description="ابدئي بإنشاء أول حجز وربطه بعميلة وقطعة وفترة واضحة."
          action={
            <Button type="button" size="sm" onClick={openCreateModal}>
              <Plus aria-hidden="true" className="h-4 w-4" />
              إنشاء أول حجز
            </Button>
          }
        />
      )
      : (
        <EmptyState
          icon={<CircleAlert className="h-10 w-10" />}
          title="لا توجد حجوزات مطابقة"
          description="غيّري البحث أو الفلاتر الحالية لعرض نتائج أخرى."
        />
      )}
    <CreateReservationModal open={showCreateModal} onClose={closeCreateModal} onCreated={handleCreated} prefill={createPrefill} />
  </section>;
}
