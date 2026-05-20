import { useMemo, useState } from 'react';
import {
  filterDeliveryReturnRecords,
  getDeliveryReturnRecords,
  summarizeDeliveryReturnRecords,
} from './deliveryReturn.service';
import { SimpleModal } from '../../components/shared/SimpleModal';
import type { DeliveryReturnFilters, DeliveryReturnStatus } from './deliveryReturn.types';

const statusOptions: Array<{ value: DeliveryReturnStatus | 'all'; label: string }> = [
  { value: 'all', label: 'كل الحالات' },
  { value: 'pending_delivery', label: 'بانتظار التسليم' },
  { value: 'delivered', label: 'تم التسليم' },
  { value: 'returned', label: 'تم الاسترجاع' },
  { value: 'late', label: 'متأخر' },
  { value: 'damaged', label: 'متضرر' },
];

const statusBadgeClasses: Record<DeliveryReturnStatus, string> = {
  pending_delivery: 'bg-amber-100 text-amber-800',
  delivered: 'bg-blue-100 text-blue-800',
  returned: 'bg-emerald-100 text-emerald-800',
  late: 'bg-orange-100 text-orange-800',
  damaged: 'bg-rose-100 text-rose-800',
};

const statusLabels: Record<DeliveryReturnStatus, string> = {
  pending_delivery: 'بانتظار التسليم',
  delivered: 'تم التسليم',
  returned: 'تم الاسترجاع',
  late: 'متأخر',
  damaged: 'متضرر',
};

function formatDateTime(dateTime?: string): string {
  if (!dateTime) return '—';

  return new Date(dateTime).toLocaleString('ar-EG', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function DeliveryReturnPage() {
  const [openModal, setOpenModal] = useState(false);
  const [localNote, setLocalNote] = useState('');

  const [filters, setFilters] = useState<DeliveryReturnFilters>({
    search: '',
    status: 'all',
  });

  const records = useMemo(() => getDeliveryReturnRecords(), []);

  const filteredRecords = useMemo(
    () => filterDeliveryReturnRecords(records, filters),
    [records, filters],
  );

  const summary = useMemo(
    () => summarizeDeliveryReturnRecords(filteredRecords),
    [filteredRecords],
  );

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">إدارة التسليم والاسترجاع</h1>
          <p className="mt-2 text-[#7A7168]">متابعة تسليم الفساتين واسترجاعها مع الرسوم والملاحظات التشغيلية.</p>
        </div>
        <button className="rounded-xl bg-[#8B5E3C] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#7A5133]" onClick={() => setOpenModal(true)}>
          عملية تسليم / استرجاع جديدة
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border border-[#E8DED2] bg-white p-5 shadow-sm">
          <p className="text-sm text-[#7A7168]">بانتظار التسليم</p>
          <p className="mt-2 text-3xl font-bold text-[#1F1B18]">{summary.pendingDelivery}</p>
        </article>
        <article className="rounded-2xl border border-[#E8DED2] bg-white p-5 shadow-sm">
          <p className="text-sm text-[#7A7168]">تم التسليم / خارج المحل</p>
          <p className="mt-2 text-3xl font-bold text-[#1F1B18]">{summary.deliveredOut}</p>
        </article>
        <article className="rounded-2xl border border-[#E8DED2] bg-white p-5 shadow-sm">
          <p className="text-sm text-[#7A7168]">تم الاسترجاع</p>
          <p className="mt-2 text-3xl font-bold text-[#1F1B18]">{summary.returned}</p>
        </article>
        <article className="rounded-2xl border border-[#E8DED2] bg-white p-5 shadow-sm">
          <p className="text-sm text-[#7A7168]">متأخر أو متضرر</p>
          <p className="mt-2 text-3xl font-bold text-[#1F1B18]">{summary.lateOrDamaged}</p>
        </article>
      </div>

      <div className="grid gap-3 rounded-2xl border border-[#E8DED2] bg-white p-4 shadow-sm md:grid-cols-3">
        <input
          value={filters.search}
          onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
          placeholder="بحث برقم الحجز أو اسم العميل أو كود الفستان"
          className="rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-[#B08A5B] focus:outline-none focus:ring-2 focus:ring-[#B08A5B]/20"
        />
        <select
          value={filters.status}
          onChange={(event) =>
            setFilters((prev) => ({
              ...prev,
              status: event.target.value as DeliveryReturnStatus | 'all',
            }))
          }
          className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:border-[#B08A5B] focus:outline-none focus:ring-2 focus:ring-[#B08A5B]/20"
        >
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {filteredRecords.length === 0 ? (
        <article className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
          <p className="text-sm text-[#7A7168]">لا توجد نتائج مطابقة للفلتر الحالي.</p>
        </article>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {filteredRecords.map((record) => (
            <article key={record.id} className="rounded-2xl border border-[#E8DED2] bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-[#7A7168]">رقم الحجز: {record.reservationNumber}</p>
                  <h2 className="mt-1 text-lg font-semibold text-[#1F1B18]">{record.customerName}</h2>
                  <p className="text-sm text-[#7A7168]">
                    {record.dressCode} — {record.dressName}
                  </p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusBadgeClasses[record.status]}`}>
                  {statusLabels[record.status]}
                </span>
              </div>

              <dl className="mt-4 grid gap-2 text-sm text-slate-700 md:grid-cols-2">
                <div>
                  <dt className="text-[#7A7168]">تاريخ/وقت التسليم</dt>
                  <dd>{formatDateTime(record.deliveryDateTime)}</dd>
                </div>
                <div>
                  <dt className="text-[#7A7168]">تاريخ/وقت الاسترجاع</dt>
                  <dd>{formatDateTime(record.returnDateTime)}</dd>
                </div>
                <div>
                  <dt className="text-[#7A7168]">حالة التسليم</dt>
                  <dd>{record.deliveryCondition ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-[#7A7168]">حالة الاسترجاع</dt>
                  <dd>{record.returnCondition ?? '—'}</dd>
                </div>
                <div>
                  <dt className="text-[#7A7168]">رسوم التأخير</dt>
                  <dd>{record.lateFee} ر.ع</dd>
                </div>
                <div>
                  <dt className="text-[#7A7168]">رسوم الضرر</dt>
                  <dd>{record.damageFee} ر.ع</dd>
                </div>
                <div>
                  <dt className="text-[#7A7168]">استرجاع العربون</dt>
                  <dd>{record.depositRefundAmount} ر.ع</dd>
                </div>
              </dl>

              {record.notes ? <p className="mt-3 rounded-xl bg-[#FAF7F2] p-3 text-sm text-[#7A7168]">{record.notes}</p> : null}
            </article>
          ))}
        </div>
      )}
      <SimpleModal open={openModal} onClose={() => setOpenModal(false)} title='عملية تسليم / استرجاع جديدة' footer={<button onClick={() => setOpenModal(false)} className='rounded-xl bg-[#8B5E3C] px-4 py-2 text-sm font-semibold text-white'>حفظ محلي</button>}>
        <textarea value={localNote} onChange={(e)=>setLocalNote(e.target.value)} placeholder='ملاحظات العملية' className='min-h-24 w-full rounded-xl border border-[#E8DED2] bg-[#FAF7F2] px-3 py-2 text-sm' />
        <p className='text-xs text-[#7A7168]'>إجراء واجهة محلي فقط بدون تعديل مصادر البيانات الحالية.</p>
      </SimpleModal>
    </section>
  );
}
