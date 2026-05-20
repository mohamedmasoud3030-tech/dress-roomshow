import { useMemo, useState } from 'react';
import {
  calculateDepositRefund,
  filterDeliveryReturnRecords,
  getDeliveryReturnRecords,
  summarizeDeliveryReturnRecords,
} from './deliveryReturn.service';
import { EmptyState } from '../../components/shared/EmptyState';
import { FilterPanel } from '../../components/shared/FilterPanel';
import { PageHeader } from '../../components/shared/PageHeader';
import { SimpleModal } from '../../components/shared/SimpleModal';
import { SummaryCard } from '../../components/shared/SummaryCard';
import type { DeliveryReturnFilters, DeliveryReturnRecord, DeliveryReturnStatus } from './deliveryReturn.types';

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
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [records, setRecords] = useState<DeliveryReturnRecord[]>(() => getDeliveryReturnRecords());
  const [formError, setFormError] = useState('');
  const [draft, setDraft] = useState({
    reservationNumber: '',
    customerName: '',
    dressCode: '',
    dressName: '',
    status: 'pending_delivery' as DeliveryReturnStatus,
    notes: '',
  });

  const [filters, setFilters] = useState<DeliveryReturnFilters>({
    search: '',
    status: 'all',
  });

  const filteredRecords = useMemo(
    () => filterDeliveryReturnRecords(records, filters),
    [records, filters],
  );

  const summary = useMemo(
    () => summarizeDeliveryReturnRecords(filteredRecords),
    [filteredRecords],
  );

  function closeCreateModal(): void {
    setIsCreateModalOpen(false);
    setFormError('');
    setDraft({
      reservationNumber: '',
      customerName: '',
      dressCode: '',
      dressName: '',
      status: 'pending_delivery',
      notes: '',
    });
  }

  function handleCreateRecord(): void {
    const payload = {
      reservationNumber: draft.reservationNumber.trim(),
      customerName: draft.customerName.trim(),
      dressCode: draft.dressCode.trim(),
      dressName: draft.dressName.trim(),
      notes: draft.notes.trim(),
    };

    if (!payload.reservationNumber || !payload.customerName || !payload.dressCode || !payload.dressName) {
      setFormError('يرجى تعبئة الحقول المطلوبة قبل الحفظ.');
      return;
    }

    const newRecord: DeliveryReturnRecord = {
      id: `dr-local-${Date.now()}`,
      reservationNumber: payload.reservationNumber,
      customerName: payload.customerName,
      dressCode: payload.dressCode,
      dressName: payload.dressName,
      status: draft.status,
      depositAmount: 0,
      lateFee: 0,
      damageFee: 0,
      depositRefundAmount: calculateDepositRefund(0, 0, 0),
      notes: payload.notes || undefined,
    };

    setRecords((current) => [newRecord, ...current]);
    closeCreateModal();
  }

  return (
    <section className="space-y-6">
      <PageHeader
        eyebrow="التسليم والاسترجاع"
        title="إدارة التسليم والاسترجاع"
        description="متابعة تسليم الفساتين واسترجاعها مع الرسوم والملاحظات التشغيلية."
        action={<button className="rounded-xl bg-[#8B5E3C] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#7A5133]" onClick={() => setIsCreateModalOpen(true)}>عملية تسليم / استرجاع جديدة</button>}
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="بانتظار التسليم" value={summary.pendingDelivery} />
        <SummaryCard label="تم التسليم / خارج المحل" value={summary.deliveredOut} />
        <SummaryCard label="تم الاسترجاع" value={summary.returned} />
        <SummaryCard label="متأخر أو متضرر" value={summary.lateOrDamaged} />
      </div>

      <FilterPanel>
        <div className="grid gap-3 md:grid-cols-3">
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
      </FilterPanel>

      {filteredRecords.length === 0 ? (
        <EmptyState title="لا توجد نتائج مطابقة" description="غيّر الفلاتر الحالية لعرض نتائج أخرى." />
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
      <SimpleModal open={isCreateModalOpen} onClose={closeCreateModal} title='عملية تسليم / استرجاع جديدة' footer={<button onClick={handleCreateRecord} className='rounded-xl bg-[#8B5E3C] px-4 py-2 text-sm font-semibold text-white'>حفظ محلي</button>}>
        <div className='grid gap-3 md:grid-cols-2'>
          <input value={draft.reservationNumber} onChange={(e) => setDraft((prev) => ({ ...prev, reservationNumber: e.target.value }))} placeholder='رقم الحجز *' className='h-11 rounded-xl border border-[#E8DED2] bg-[#FAF7F2] px-3 text-sm outline-none focus:border-[#B08A5B]' />
          <input value={draft.customerName} onChange={(e) => setDraft((prev) => ({ ...prev, customerName: e.target.value }))} placeholder='اسم العميلة *' className='h-11 rounded-xl border border-[#E8DED2] bg-[#FAF7F2] px-3 text-sm outline-none focus:border-[#B08A5B]' />
          <input value={draft.dressCode} onChange={(e) => setDraft((prev) => ({ ...prev, dressCode: e.target.value }))} placeholder='كود الفستان *' className='h-11 rounded-xl border border-[#E8DED2] bg-[#FAF7F2] px-3 text-sm outline-none focus:border-[#B08A5B]' />
          <input value={draft.dressName} onChange={(e) => setDraft((prev) => ({ ...prev, dressName: e.target.value }))} placeholder='اسم الفستان *' className='h-11 rounded-xl border border-[#E8DED2] bg-[#FAF7F2] px-3 text-sm outline-none focus:border-[#B08A5B]' />
          <select value={draft.status} onChange={(e) => setDraft((prev) => ({ ...prev, status: e.target.value as DeliveryReturnStatus }))} className='h-11 rounded-xl border border-[#E8DED2] bg-[#FAF7F2] px-3 text-sm outline-none focus:border-[#B08A5B] md:col-span-2'>
            {statusOptions.filter((option) => option.value !== 'all').map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <textarea value={draft.notes} onChange={(e)=>setDraft((prev) => ({ ...prev, notes: e.target.value }))} placeholder='ملاحظات العملية' className='min-h-24 w-full rounded-xl border border-[#E8DED2] bg-[#FAF7F2] px-3 py-2 text-sm md:col-span-2' />
        </div>
        {formError ? <p className='mt-2 text-xs font-semibold text-rose-700'>{formError}</p> : null}
        <p className='mt-2 text-xs text-[#7A7168]'>إجراء واجهة محلي فقط بدون تعديل مصادر البيانات الحالية.</p>
      </SimpleModal>
    </section>
  );
}
