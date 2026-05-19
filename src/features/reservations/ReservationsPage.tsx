import { getReservations, summarizeReservations } from './reservation.service';

export function ReservationsPage() {
  const reservations = getReservations();
  const summary = summarizeReservations(reservations);

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

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        {reservations.map((reservation) => (
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
