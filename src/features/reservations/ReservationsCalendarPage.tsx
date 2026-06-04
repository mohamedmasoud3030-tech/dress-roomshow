import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '../../components/shared/PageHeader';
import { getTodayISO } from '../../shared/utils/date';
import { getReservations, getReservationsFromLocalDb, hasReservationOverlap } from './reservation.service';
import type { Reservation } from './reservation.types';

const bufferDays = 2;
const activeStatuses = new Set(['pending', 'confirmed', 'delivered', 'overdue']);

function addDays(date: string, amount: number): string {
  const value = new Date(`${date}T00:00:00`);
  value.setDate(value.getDate() + amount);
  return getTodayISO(value);
}

export function ReservationsCalendarPage() {
  const [reservations, setReservations] = useState<Reservation[]>(getReservations());
  const [month, setMonth] = useState(getTodayISO().slice(0, 7));

  useEffect(() => {
    void (async () => {
      const rows = await getReservationsFromLocalDb();
      if (rows) setReservations(rows);
    })();
  }, []);

  const days = useMemo(() => {
    const [year, monthNumber] = month.split('-').map(Number);
    const count = new Date(year, monthNumber, 0).getDate();
    return Array.from({ length: count }, (_, index) => `${month}-${String(index + 1).padStart(2, '0')}`);
  }, [month]);

  const activeReservations = reservations.filter((reservation) => activeStatuses.has(reservation.status));

  return (
    <section className="space-y-6">
      <PageHeader eyebrow="التقويم" title="تقويم الحجوزات" description="عرض الفترات المحجوزة وأيام التجهيز قبل وبعد الحجز حسب إعداد buffer الحالي." />
      <div className="rounded-2xl border border-[#E8DED2] bg-white p-4 shadow-sm">
        <input type="month" value={month} onChange={(event) => setMonth(event.target.value)} className="rounded-xl border border-[#E8DED2] bg-[#FAF7F2] px-3 py-2 text-sm" />
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {days.map((day) => {
          const dayReservations = activeReservations.filter((reservation) => reservation.pickupDate <= day && day <= reservation.returnDate);
          const blocked = activeReservations.filter((reservation) => dayReservations.every((item) => item.id !== reservation.id) && hasReservationOverlap({ dressCode: reservation.dressCode, pickupDate: addDays(day, -bufferDays), returnDate: addDays(day, bufferDays) }, [reservation]));
          return <article key={day} className="min-h-36 rounded-2xl border border-[#E8DED2] bg-white p-4 shadow-sm"><p className="font-bold">{day}</p><div className="mt-3 space-y-2">{dayReservations.map((reservation) => <p key={reservation.id} className="rounded-xl bg-[#8B5E3C] px-3 py-2 text-xs font-semibold text-white">محجوز: {reservation.dressCode}<br />{reservation.pickupDate} ← {reservation.returnDate}</p>)}{blocked.map((reservation) => <p key={`${reservation.id}-buffer`} className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">تجهيز ±{bufferDays}: {reservation.dressCode}</p>)}</div></article>;
        })}
      </div>
    </section>
  );
}
