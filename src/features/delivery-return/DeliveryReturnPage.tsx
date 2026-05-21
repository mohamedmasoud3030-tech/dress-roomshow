import { useState } from 'react';
import { Truck, Plus } from 'lucide-react';
import { PageHeader } from '../../components/shared/PageHeader';
import { SummaryCard } from '../../components/shared/SummaryCard';
import { StatusBadge, deliveryStatusBadge } from '../../components/shared/StatusBadge';
import { getDeliveryReturnRecords, filterDeliveryReturnRecords, summarizeDeliveryReturnRecords } from './deliveryReturn.service';
import { DeliveryModal } from './DeliveryModal';
import { ReturnModal } from './ReturnModal';
import type { DeliveryReturnFilters, DeliveryReturnRecord } from './deliveryReturn.types';
import { formatDateTimeAr } from '../../shared/utils/date';
import { formatMoneyOMR } from '../../shared/utils/format';

export function DeliveryReturnPage() {
  const [records, setRecords] = useState<DeliveryReturnRecord[]>(() => getDeliveryReturnRecords());
  const [filters, setFilters] = useState<DeliveryReturnFilters>({ search: '', status: 'all' });
  const [showDeliver, setShowDeliver] = useState(false);
  const [showReturn, setShowReturn] = useState(false);

  const filtered = filterDeliveryReturnRecords(records, filters);
  const summary = summarizeDeliveryReturnRecords(records);

  const refresh = () => setRecords(getDeliveryReturnRecords());

  return (
    <div className="min-h-full">
      <PageHeader
        title="التسليم والاستلام"
        subtitle={`${records.length} سجل`}
        action={
          <div className="flex gap-2">
            <button
              onClick={() => setShowDeliver(true)}
              className="flex items-center gap-1.5 bg-violet-700 text-white text-sm font-medium px-3 py-2 rounded-lg hover:bg-violet-800 transition"
            >
              <Plus className="w-4 h-4" />
              تسليم
            </button>
            <button
              onClick={() => setShowReturn(true)}
              className="flex items-center gap-1.5 bg-emerald-700 text-white text-sm font-medium px-3 py-2 rounded-lg hover:bg-emerald-800 transition"
            >
              <Plus className="w-4 h-4" />
              استلام
            </button>
          </div>
        }
      />

      {/* Summary */}
      <div className="px-4 md:px-6 py-4 grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard label="بانتظار التسليم" value={summary.pendingDelivery} icon={Truck} color="amber" />
        <SummaryCard label="خارج المحل" value={summary.deliveredOut} icon={Truck} color="violet" />
        <SummaryCard label="تم الاستلام" value={summary.returned} icon={Truck} color="emerald" />
        <SummaryCard label="متأخر/تالف" value={summary.lateOrDamaged} icon={Truck} color="rose" />
      </div>

      {/* Filters */}
      <div className="px-4 md:px-6 pb-3 flex flex-wrap gap-2">
        <input
          type="search"
          placeholder="بحث..."
          value={filters.search}
          onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
          className="flex-1 min-w-48 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
        />
        <select
          value={filters.status}
          onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value as DeliveryReturnFilters['status'] }))}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm bg-white focus:outline-none"
        >
          <option value="all">كل الحالات</option>
          <option value="pending_delivery">بانتظار التسليم</option>
          <option value="delivered">مُسلَّم</option>
          <option value="returned">مُسترجع</option>
          <option value="late">متأخر</option>
          <option value="damaged">تالف</option>
        </select>
      </div>

      {/* List */}
      <div className="px-4 md:px-6 pb-8 space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <Truck className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">
              {records.length === 0 ? 'لا توجد سجلات تسليم. سجّلي عملية تسليم أو استلام.' : 'لا توجد نتائج.'}
            </p>
          </div>
        ) : (
          filtered.map((r) => {
            const { label, color } = deliveryStatusBadge(r.status);
            return (
              <div key={r.id} className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-slate-900">{r.customerName}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{r.reservationNumber} • {r.dressCode} — {r.dressName}</p>
                  </div>
                  <StatusBadge label={label} color={color} />
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-3 pt-3 border-t border-slate-100 text-sm">
                  {r.deliveryDateTime && (
                    <div>
                      <p className="text-xs text-slate-400">تاريخ التسليم</p>
                      <p className="text-slate-700">{formatDateTimeAr(r.deliveryDateTime)}</p>
                    </div>
                  )}
                  {r.returnDateTime && (
                    <div>
                      <p className="text-xs text-slate-400">تاريخ الاستلام</p>
                      <p className="text-slate-700">{formatDateTimeAr(r.returnDateTime)}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-slate-400">العربون</p>
                    <p className="text-slate-700">{formatMoneyOMR(r.depositAmount)}</p>
                  </div>
                  {(r.lateFee > 0 || r.damageFee > 0) && (
                    <div>
                      <p className="text-xs text-slate-400">الغرامات</p>
                      <p className="text-rose-600 font-medium">{formatMoneyOMR(r.lateFee + r.damageFee)}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-slate-400">استرجاع العربون</p>
                    <p className="text-emerald-600 font-medium">{formatMoneyOMR(r.depositRefundAmount)}</p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <DeliveryModal open={showDeliver} onClose={() => setShowDeliver(false)} onSuccess={() => refresh()} />
      <ReturnModal open={showReturn} onClose={() => setShowReturn(false)} onSuccess={() => refresh()} />
    </div>
  );
}
