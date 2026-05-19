import { formatReservationStatusLabel, getReservations } from './reservation.service';

export function ReservationsPage() {
  const reservations = getReservations();

  return (
    <section className="space-y-4">
      <h1 className="text-3xl font-bold tracking-tight">إدارة الحجوزات</h1>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {reservations.map((reservation) => (
          <article key={reservation.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-slate-500">{reservation.reservationNumber}</p>
            <h2 className="mt-1 text-lg font-semibold text-slate-950">{reservation.customerName}</h2>
            <p className="text-sm text-slate-600">الفستان: {reservation.dressCode}</p>
            <p className="text-sm text-slate-600">تاريخ المناسبة: {reservation.eventDate}</p>
            <p className="mt-2 text-sm font-medium text-violet-700">{formatReservationStatusLabel(reservation.status)}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
