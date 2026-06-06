import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { PageHeader } from '../../components/shared/PageHeader';
import { getDresses } from '../dresses/dress.service';
import { getReservationBufferDays, getReservations } from './reservation.service';
import type { Reservation, ReservationStatus } from './reservation.types';

const statusStyles: Record<ReservationStatus, string> = { pending: 'bg-amber-100 text-amber-900', confirmed: 'bg-emerald-100 text-emerald-900', delivered: 'bg-sky-100 text-sky-900', returned: 'bg-slate-100 text-slate-700', overdue: 'bg-rose-100 text-rose-900', cancelled: 'bg-slate-100 text-slate-400 line-through' };

function iso(date: Date): string {
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
}

function addDays(value: string, days: number): string {
  const date = new Date(`${value}T00:00:00`);
  date.setDate(date.getDate() + days);
  return iso(date);
}

function monthDays(monthStart: Date): string[] {
  const first = new Date(monthStart.getFullYear(), monthStart.getMonth(), 1);
  const last = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);
  const days: string[] = [];
  for (let day = 1; day <= last.getDate(); day += 1) days.push(iso(new Date(first.getFullYear(), first.getMonth(), day)));
  return days;
}

function markerLabel(reservation: Reservation, day: string, buffer: number): string {
  if (day === reservation.pickupDate) return 'تسليم';
  if (day === reservation.returnDate) return 'إرجاع';
  if (day >= addDays(reservation.pickupDate, -buffer) && day < reservation.pickupDate) return 'تجهيز';
  if (day > reservation.returnDate && day <= addDays(reservation.returnDate, buffer)) return 'تنظيف';
  return 'محجوز';
}

export function ReservationsCalendarPage() {
  const [month, setMonth] = useState(() => new Date());
  const [dressCode, setDressCode] = useState('all');
  const reservations = useMemo(() => getReservations(), []);
  const dresses = useMemo(() => getDresses(), []);
  const buffer = getReservationBufferDays();
  const days = monthDays(month);
  const visibleReservations = reservations.filter((reservation) => dressCode === 'all' || reservation.dressCode === dressCode);

  function shift(delta: number) {
    setMonth((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1));
  }

  return <section className="space-y-6"><div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between"><PageHeader eyebrow="تقويم الحجوزات" title="رزنامة تشغيل شهرية" description="عرض مواعيد التسليم والإرجاع وأيام التجهيز حسب إعدادات التعارض الحالية." /><Link to="/reservations" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-800">العودة للقائمة</Link></div>
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><div className="flex items-center gap-2"><button type="button" onClick={() => shift(1)} className="rounded-xl border border-slate-200 p-2"><ChevronRight className="h-5 w-5" /></button><h2 className="min-w-48 text-center text-xl font-extrabold">{month.toLocaleDateString('ar', { month: 'long', year: 'numeric' })}</h2><button type="button" onClick={() => shift(-1)} className="rounded-xl border border-slate-200 p-2"><ChevronLeft className="h-5 w-5" /></button></div><select value={dressCode} onChange={(event) => setDressCode(event.target.value)} className="min-h-11 rounded-xl border border-slate-200 bg-stone-50 px-3 text-sm outline-none"><option value="all">كل الفساتين</option>{dresses.map((dress) => <option key={dress.id} value={dress.code}>{dress.code} — {dress.name}</option>)}</select></div><p className="mt-3 text-sm font-semibold text-slate-500">أيام التجهيز المعتمدة: {buffer} يوم قبل وبعد الحجز.</p></div>
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">{days.map((day) => { const dayReservations = visibleReservations.filter((reservation) => day >= addDays(reservation.pickupDate, -buffer) && day <= addDays(reservation.returnDate, buffer)); return <article key={day} className="min-h-36 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"><div className="flex items-center justify-between"><b className="text-sm" dir="ltr">{day}</b>{dayReservations.length > 0 && <CalendarDays className="h-4 w-4 text-amber-700" />}</div><div className="mt-3 space-y-2">{dayReservations.map((reservation) => <Link key={`${reservation.id}-${day}`} to={`/reservations?search=${encodeURIComponent(reservation.reservationNumber)}`} className={`block rounded-xl px-3 py-2 text-xs font-bold ${statusStyles[reservation.status]}`}><span>{markerLabel(reservation, day, buffer)}</span><span className="mx-1">·</span><span dir="ltr">{reservation.dressCode}</span><span className="block truncate font-semibold">{reservation.customerName}</span></Link>)}</div></article>; })}</div>
  </section>;
}
