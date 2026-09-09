import { useMemo, useState } from 'react';
import { ArrowRight, CalendarDays, Phone, UserRound } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { EmptyState } from '../../components/shared/StateViews';
import { KeyValueList } from '../../components/shared/DataTable';
import { PageHeader } from '../../components/shared/PageHeader';
import { SummaryCard } from '../../components/shared/SummaryCard';
import { formatMoneyOMR } from '../../shared/utils/format';
import { normalizePhoneForSearch } from '../../shared/utils/search';
import { getReservations } from '../reservations/reservation.service';
import { CustomerConductPanel } from './CustomerConductPanel';
import { MeasurementsPanel } from './MeasurementsPanel';
import { getCustomers } from './customer.service';
import type { Customer } from './customer.types';
import type { Reservation } from '../reservations/reservation.types';

function reservationsForCustomer(customer: Customer): Reservation[] {
  return getReservations()
    .filter((reservation) => reservation.customerId === customer.id || normalizePhoneForSearch(reservation.customerPhone) === normalizePhoneForSearch(customer.phone))
    .sort((left, right) => right.pickupDate.localeCompare(left.pickupDate));
}

export function CustomerDetailsPage() {
  const { id = '' } = useParams();
  const [refreshToken, setRefreshToken] = useState(0);
  const customer = useMemo(() => getCustomers().find((item) => item.id === id), [id, refreshToken]);
  const reservations = useMemo(() => (customer ? reservationsForCustomer(customer) : []), [customer, refreshToken]);

  if (!customer) {
    return (
      <section className="min-w-0 space-y-4">
        <PageHeader eyebrow="ملف العميلة" title="العميلة غير موجودة" />
        <EmptyState
          title="تعذر العثور على سجل العميلة"
          description="ربما تم حذف السجل، أو أن الرابط قديم. عودي إلى القائمة لاختيار سجل آخر."
          action={(
            <Link to="/customers" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500">
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
              العودة إلى العميلات
            </Link>
          )}
        />
      </section>
    );
  }

  const refresh = () => setRefreshToken((current) => current + 1);

  return (
    <section className="min-w-0 space-y-6">
      <PageHeader
        eyebrow="ملف العميلة"
        title={customer.name}
        actions={(
          <Link to="/customers" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-800 transition hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2">
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
            العودة إلى العميلات
          </Link>
        )}
      />

      <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-2 xl:grid-cols-4">
        <div className="flex min-w-0 items-center gap-3">
          <UserRound aria-hidden="true" className="h-5 w-5 shrink-0 text-amber-700" />
          <div className="min-w-0"><p className="text-xs text-slate-500">الاسم</p><p className="truncate font-bold text-slate-950">{customer.name}</p></div>
        </div>
        <div className="flex min-w-0 items-center gap-3">
          <Phone aria-hidden="true" className="h-5 w-5 shrink-0 text-amber-700" />
          <div className="min-w-0"><p className="text-xs text-slate-500">الهاتف</p><p className="truncate font-bold text-slate-950" dir="ltr">{customer.phone}</p></div>
        </div>
        <div className="flex min-w-0 items-center gap-3">
          <CalendarDays aria-hidden="true" className="h-5 w-5 shrink-0 text-amber-700" />
          <div className="min-w-0"><p className="text-xs text-slate-500">آخر حجز</p><p className="truncate font-bold text-slate-950">{customer.lastReservationDate ?? 'لا يوجد'}</p></div>
        </div>
        <div className="min-w-0"><p className="text-xs text-slate-500">الحالة</p><p className="font-bold text-slate-950">{customer.status === 'trusted' ? 'موثوقة' : customer.status === 'warning' ? 'تنبيه' : customer.status === 'blocked' ? 'محظورة' : 'عادية'}</p></div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <SummaryCard label="إجمالي الحجوزات" value={customer.totalReservations} />
        <SummaryCard label="الحجوزات النشطة" value={customer.activeReservations} />
        <SummaryCard label="إجمالي المدفوع" value={formatMoneyOMR(customer.totalPaid)} tone="positive" />
        <SummaryCard label="المتبقي" value={formatMoneyOMR(customer.remainingBalance)} tone={customer.remainingBalance > 0 ? 'warning' : 'default'} />
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-slate-950">بيانات العميلة</h2>
        <div className="mt-4">
          <KeyValueList items={[
            { label: 'العنوان', value: customer.address || 'غير مسجل' },
            { label: 'المقاسات النصية القديمة', value: customer.measurements || 'غير مسجلة' },
            { label: 'ملاحظات عامة', value: customer.notes || 'لا توجد ملاحظات' },
            { label: 'معرّف السجل', value: <span dir="ltr">{customer.id}</span> },
          ]} />
        </div>
      </section>

      <CustomerConductPanel customer={customer} />
      <MeasurementsPanel customer={customer} onSaved={refresh} />

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-slate-950">سجل الحجوزات ({reservations.length})</h2>
        {reservations.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">لا توجد حجوزات مرتبطة بهذا السجل بعد.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {reservations.map((reservation) => (
              <li key={reservation.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-slate-950" dir="ltr">{reservation.reservationNumber}</p>
                    <p className="mt-1 text-sm text-slate-600">{reservation.dressCode} — {reservation.dressName}</p>
                  </div>
                  <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-bold text-slate-700">{reservation.status}</span>
                </div>
                <div className="mt-3 grid gap-2 text-sm text-slate-700 sm:grid-cols-3">
                  <p>الاستلام: <b>{reservation.pickupDate}</b></p>
                  <p>الإرجاع: <b>{reservation.returnDate}</b></p>
                  <p>المتبقي: <b>{formatMoneyOMR(reservation.remainingAmount)}</b></p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}
