import { useState } from 'react';
import { Plus, CalendarCheck, AlertTriangle } from 'lucide-react';
import { PageHeader } from '../../components/shared/PageHeader';
import { SummaryCard } from '../../components/shared/SummaryCard';
import { StatusBadge, reservationStatusBadge } from '../../components/shared/StatusBadge';
import { getReservations, filterReservations, summarizeReservations, cancelReservation } from './reservation.service';
import { CreateReservationModal } from './CreateReservationModal';
import type { Reservation, ReservationFilters } from './reservation.types';
import { formatDateAr } from '../../shared/utils/date';
import { formatMoneyOMR } from '../../shared/utils/format';

export function ReservationsPage() {
  const [reservations, setReservations] = useState<Reservation[]>(() => getReservations());
  const [filters, setFilters] = useState<ReservationFilters>({ search: '', status: 'all', timing: 'all' });
  const [showCreate, setShowCreate] = useState(false);

  const filtered = filterReservations(reservations, filters);
  const summary = summarizeReservations(reservations);

  const handleCancel = (id: string) => {
    if (!confirm('هل أنت متأكدة من إلغاء هذا الحجز؟')) return;
    cancelReservation(id);
    setReservations(getReservations());
  };

  return (
    <div className="min-h-full">
      <PageHeader
        title="الحجوزات"
        subtitle={`${summary.total} حجز`}
        action={
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 bg-violet-700 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-violet-800 transition"
          >
            <Plus className="w-4 h-4" />
            حجز جديد
          </button>
        }
      />

      {/* Summary */}
      <div className="px-4 md:px-6 py-4 grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard label="الكل" value={summary.total} icon={CalendarCheck} color="violet" />
        <SummaryCard label="نشط" value={summary.active} icon={CalendarCheck} color="blue" />
        <SummaryCard label="اليوم" value={summary.today} icon={CalendarCheck} color="emerald" />
        <SummaryCard label="متأخر" value={summary.overdue} icon={AlertTriangle} color="rose" />
      </div>

      {/* Filters */}
      <div className="px-4 md:px-6 pb-3 flex flex-wrap gap-2">
        <input
          type="search"
          placeholder="بحث بالعميلة أو الفستان..."
          value={filters.search}
          onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
          className="flex-1 min-w-48 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
        />
        <select
          value={filters.status}
          onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value as ReservationFilters['status'] }))}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white focus:outline-none"
        >
          <option value="all">كل الحالات</option>
          <option value="pending">معلق</option>
          <option value="confirmed">مؤكد</option>
          <option value="delivered">سُلِّم</option>
          <option value="returned">مُسترجع</option>
          <option value="overdue">متأخر</option>
          <option value="cancelled">ملغي</option>
        </select>
        <select
          value={filters.timing}
          onChange={(e) => setFilters((f) => ({ ...f, timing: e.target.value as ReservationFilters['timing'] }))}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white focus:outline-none"
        >
          <option value="all">كل الأوقات</option>
          <option value="today">اليوم</option>
          <option value="upcoming">قادمة</option>
          <option value="overdue">متأخرة</option>
        </select>
      </div>

      {/* List */}
      <div className="px-4 md:px-6 pb-8 space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <CalendarCheck className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">
              {reservations.length === 0 ? 'لا توجد حجوزات. ابدأ بإنشاء حجز جديد.' : 'لا توجد نتائج.'}
            </p>
          </div>
        ) : (
          filtered.map((r) => {
            const { label, color } = reservationStatusBadge(r.status);
            return (
              <div key={r.id} className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-slate-900">{r.customerName}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{r.reservationNumber} • {r.dressCode} — {r.dressName}</p>
                  </div>
                  <StatusBadge label={label} color={color} />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3 pt-3 border-t border-slate-100">
                  <div>
                    <p className="text-xs text-slate-400">تاريخ الاستلام</p>
                    <p className="text-sm font-medium text-slate-700">{formatDateAr(r.pickupDate)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">تاريخ الإرجاع</p>
                    <p className="text-sm font-medium text-slate-700">{formatDateAr(r.returnDate)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">المبلغ الكلي</p>
                    <p className="text-sm font-bold text-slate-900">{formatMoneyOMR(r.totalAmount)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">المتبقي</p>
                    <p className={`text-sm font-bold ${r.remainingAmount > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {formatMoneyOMR(r.remainingAmount)}
                    </p>
                  </div>
                </div>
                {r.status !== 'cancelled' && r.status !== 'returned' && (
                  <div className="mt-3 flex justify-end">
                    <button
                      onClick={() => handleCancel(r.id)}
                      className="text-xs text-slate-400 hover:text-rose-600 transition"
                    >
                      إلغاء الحجز
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <CreateReservationModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onSuccess={(res) => setReservations((prev) => [res, ...prev])}
      />
    </div>
  );
}
