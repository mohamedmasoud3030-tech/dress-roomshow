import { useMemo, useState } from 'react';
import { filterReservations, getReservations, summarizeReservations } from './reservation.service';
import type { ReservationFilters } from './reservation.types';

export function ReservationsPage() {
  const [filters, setFilters] = useState<ReservationFilters>({ search: '', status: 'all', timing: 'all' });
  const reservations = getReservations();

  const filteredReservations = useMemo(() => filterReservations(reservations, filters), [reservations, filters]);
  const summary = useMemo(() => summarizeReservations(reservations), [reservations]);

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-semibold text-violet-700">الحجوزات</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">إدارة الحجوزات</h1>
        <p className="mt-2 text-slate-600">متابعة الحجوزات ومواعيد الاستلام والإرجاع.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">إجمالي الحجوزات</p>
          <p className="mt-2 text-3xl font-bold">{summary.total}</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">حجوزات نشطة</p>
          <p className="mt-2 text-3xl font-bold text-emerald-700">{summary.active}</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">اليوم</p>
          <p className="mt-2 text-3xl font-bold text-sky-700">{summary.today}</p>
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">متأخرة</p>
          <p className="mt-2 text-3xl font-bold text-red-700">{summary.overdue}</p>
        </article>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 lg:grid-cols-[1fr_180px_180px]">
          <input
            value={filters.search}
            onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
            placeholder="ابحث برقم الحجز، العميلة، الهاتف أو الفستان"
            className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none ring-violet-200 transition focus:border-violet-300 focus:ring-4"
          />

          <select
            value={filters.status}
            onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value as ReservationFilters['status'] }))}
            className="h-12 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-violet-300"
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
            className="h-12 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm outline-none focus:border-violet-300"
          >
            <option value="all">كل المواعيد</option>
            <option value="today">اليوم</option>
            <option value="upcoming">القادمة</option>
            <option value="overdue">متأخرة</option>
          </select>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        {filteredReservations.map((reservation) => (
          <div key={reservation.id} className="border-b border-slate-100 p-5 last:border-b-0">
            <p className="text-sm font-semibold text-slate-400">{reservation.reservationNumber}</p>
            <h3 className="mt-1 text-lg font-bold text-slate-950">{reservation.customerName}</h3>
            <p className="mt-1 text-sm text-slate-600">{reservation.dressCode} - {reservation.dressName}</p>
            <p className="mt-2 text-sm text-slate-500">{reservation.pickupDate} / {reservation.returnDate}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
