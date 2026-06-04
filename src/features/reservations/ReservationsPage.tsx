import { useEffect, useMemo, useState } from 'react';
import { filterReservations, getReservations, getReservationsFromLocalDb, summarizeReservations } from './reservation.service';
import type { ReservationFilters, ReservationStatus } from './reservation.types';
import { printRentalContract } from './printRentalContract';
import { EmptyState } from '../../components/shared/EmptyState';
import { FilterPanel } from '../../components/shared/FilterPanel';
import { PageHeader } from '../../components/shared/PageHeader';
import { SummaryCard } from '../../components/shared/SummaryCard';

export function ReservationsPage() {
  const [filters, setFilters] = useState<ReservationFilters>({ search: '', status: 'all', timing: 'all' });
  const [selectedReservationId, setSelectedReservationId] = useState<string | null>(null);
  const [localReservations, setLocalReservations] = useState(getReservations());
  const reservations = localReservations;

  useEffect(() => {
    void (async () => {
      const rows = await getReservationsFromLocalDb();
      if (rows) setLocalReservations(rows);
    })();
  }, []);

  const filteredReservations = useMemo(() => filterReservations(reservations, filters), [reservations, filters]);
  const summary = useMemo(() => summarizeReservations(reservations), [reservations]);
  const selectedReservation = useMemo(
    () => filteredReservations.find((reservation) => reservation.id === selectedReservationId) ?? filteredReservations[0] ?? null,
    [filteredReservations, selectedReservationId],
  );

  return (
    <section className="space-y-6">
      <PageHeader eyebrow="الحجوزات" title="إدارة الحجوزات" description="متابعة الحجوزات ومواعيد الاستلام والإرجاع." />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="إجمالي الحجوزات" value={summary.total} />
        <SummaryCard label="حجوزات نشطة" value={summary.active} valueClassName="text-emerald-700" />
        <SummaryCard label="اليوم" value={summary.today} valueClassName="text-sky-700" />
        <SummaryCard label="متأخرة" value={summary.overdue} valueClassName="text-red-700" />
      </div>

      <FilterPanel>
        <div className="grid gap-3 lg:grid-cols-[1fr_180px_180px]">
          <input
            value={filters.search}
            onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
            placeholder="ابحث برقم الحجز، العميلة، الهاتف أو الفستان"
            className="h-12 w-full rounded-xl border border-[#E8DED2] bg-[#FAF7F2] px-3 text-sm outline-none ring-[#E8DED2] transition focus:border-[#B08A5B] focus:ring-4"
          />

          <select
            value={filters.status}
            onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value as ReservationFilters['status'] }))}
            className="h-12 rounded-xl border border-[#E8DED2] bg-[#FAF7F2] px-3 text-sm outline-none focus:border-[#B08A5B]"
          >
            <option value="all">كل الحالات</option>
            <option value="pending">قيد الانتظار</option>
            <option value="confirmed">مؤكد</option>
            <option value="delivered">تم التسليم</option>
            <option value="returned">تم الإرجاع</option>
            <option value="cancelled">ملغي</option>
            <option value="overdue">متأخر</option>
          </select>

          <select
            value={filters.timing}
            onChange={(event) => setFilters((current) => ({ ...current, timing: event.target.value as ReservationFilters['timing'] }))}
            className="h-12 rounded-xl border border-[#E8DED2] bg-[#FAF7F2] px-3 text-sm outline-none focus:border-[#B08A5B]"
          >
            <option value="all">كل المواعيد</option>
            <option value="today">اليوم</option>
            <option value="upcoming">القادمة</option>
            <option value="overdue">متأخرة</option>
          </select>
        </div>
      </FilterPanel>

      {filteredReservations.length === 0 ? (
        <EmptyState title="لا توجد حجوزات مطابقة" description="غيّر البحث أو الفلاتر الحالية لعرض نتائج أخرى." />
      ) : (
      <div className="rounded-2xl border border-[#E8DED2] bg-white shadow-sm">
        {filteredReservations.map((reservation) => (
          <button
            type="button"
            key={reservation.id}
            onClick={() => setSelectedReservationId(reservation.id)}
            className={`block w-full border-b border-slate-100 p-5 text-start last:border-b-0 ${selectedReservation?.id === reservation.id ? 'bg-[#FAF7F2]' : ''}`}
          >
            <p className="text-sm font-semibold text-slate-400">{reservation.reservationNumber}</p>
            <h3 className="mt-1 text-lg font-bold text-[#1F1B18]">{reservation.customerName}</h3>
            <p className="mt-1 text-sm text-[#7A7168]">{reservation.dressCode} - {reservation.dressName}</p>
            <p className="mt-2 text-sm text-[#7A7168]">{reservation.pickupDate} / {reservation.returnDate}</p>
            <span className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusBadgeClasses[reservation.status]}`}>
              {statusLabels[reservation.status]}
            </span>
            <span
              role="button"
              tabIndex={0}
              onClick={(event) => {
                event.stopPropagation();
                printRentalContract(reservation);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.stopPropagation();
                  printRentalContract(reservation);
                }
              }}
              className="mt-3 me-2 inline-flex rounded-full bg-[#8B5E3C] px-3 py-1 text-xs font-semibold text-white"
            >
              طباعة عقد الإيجار
            </span>
          </button>
        ))}
      </div>
      )}
    </section>
  );
}

const statusLabels: Record<ReservationStatus, string> = {
  pending: 'قيد الانتظار',
  confirmed: 'مؤكد',
  delivered: 'تم التسليم',
  returned: 'تم الإرجاع',
  cancelled: 'ملغي',
  overdue: 'متأخر',
};

const statusBadgeClasses: Record<ReservationStatus, string> = {
  pending: 'bg-amber-100 text-amber-800',
  confirmed: 'bg-blue-100 text-blue-800',
  delivered: 'bg-indigo-100 text-indigo-800',
  returned: 'bg-emerald-100 text-emerald-800',
  cancelled: 'bg-slate-100 text-slate-700',
  overdue: 'bg-rose-100 text-rose-800',
};
