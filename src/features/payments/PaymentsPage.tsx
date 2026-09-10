import { useMemo, useState } from 'react';
import { Download, Plus } from 'lucide-react';
import { downloadCsv } from '@platform/download';
import { buildPaymentsCsv, ledgerFileName } from '../reports/ledgerExports';
import { Button } from '../../components/shared/Button';
import { DataTable } from '../../components/shared/DataTable';
import { PageHeader } from '../../components/shared/PageHeader';
import { SummaryCard } from '../../components/shared/SummaryCard';
import { EmptyState } from '../../components/shared/StateViews';
import { FilterBar, SearchFilter, SelectFilter } from '../../components/shared/FilterBar';
import { AddPaymentModal } from './AddPaymentModal';
import {
  PAYMENT_DIRECTION_FILTER_OPTIONS,
  PAYMENT_METHOD_FILTER_OPTIONS,
  PAYMENT_TYPE_FILTER_OPTIONS,
} from './payment.constants';
import {
  filterPayments,
  formatPaymentDirectionLabel,
  formatPaymentMethodLabel,
  formatPaymentTypeLabel,
  getPayments,
  summarizePayments,
} from './payment.service';
import type {
  PaymentDirection,
  PaymentFilters,
  PaymentMethod,
  PaymentRecord,
  PaymentType,
} from './payment.types';

const typeBadgeClasses: Record<PaymentType, string> = {
  rental: 'bg-blue-100 text-blue-800',
  deposit: 'bg-violet-100 text-violet-800',
  late_fee: 'bg-orange-100 text-orange-800',
  damage_fee: 'bg-rose-100 text-rose-800',
  deposit_settlement: 'bg-slate-200 text-slate-800',
  retained_deposit: 'bg-amber-100 text-amber-800',
  penalty: 'bg-orange-100 text-orange-800',
  refund: 'bg-emerald-100 text-emerald-800',
  adjustment: 'bg-slate-200 text-slate-800',
  booking_advance: 'bg-emerald-100 text-emerald-800',
  rental_payment: 'bg-blue-100 text-blue-800',
  security_deposit_collection: 'bg-violet-100 text-violet-800',
  security_deposit_refund: 'bg-rose-100 text-rose-800',
  security_deposit_retention: 'bg-amber-100 text-amber-800',
  reversal: 'bg-slate-200 text-slate-800',
};

const methodBadgeClasses: Record<PaymentMethod, string> = {
  cash: 'bg-amber-100 text-amber-800',
  card: 'bg-indigo-100 text-indigo-800',
  bank_transfer: 'bg-cyan-100 text-cyan-800',
  other: 'bg-slate-100 text-slate-700',
};

const directionBadgeClasses: Record<PaymentDirection, string> = {
  income: 'bg-emerald-100 text-emerald-800',
  refund: 'bg-rose-100 text-rose-800',
  settlement: 'bg-slate-200 text-slate-800',
};

function formatAmount(amount: number): string {
  return new Intl.NumberFormat('ar-OM', {
    style: 'currency',
    currency: 'OMR',
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('ar-OM', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

function formatMovementAmount(payment: PaymentRecord): string {
  if (payment.direction === 'income') return `+ ${formatAmount(payment.amount)}`;
  if (payment.direction === 'refund') return `- ${formatAmount(payment.amount)}`;
  return formatAmount(payment.amount);
}

function movementAmountClass(direction: PaymentDirection): string {
  if (direction === 'income') return 'text-emerald-700';
  if (direction === 'refund') return 'text-rose-700';
  return 'text-slate-700';
}

const paymentColumns = [
  {
    key: 'movement',
    header: 'الحركة',
    priority: 'primary' as const,
    render: (payment: PaymentRecord) => (
      <div>
        <p className="font-bold text-slate-950">{payment.customerName}</p>
        <p className="mt-1 text-xs text-slate-500" dir="ltr">{payment.paymentNumber}</p>
      </div>
    ),
  },
  {
    key: 'reservation',
    header: 'الحجز والعنصر',
    priority: 'secondary' as const,
    render: (payment: PaymentRecord) => <span>{payment.reservationNumber} — {payment.dressCode} / {payment.dressName}</span>,
  },
  {
    key: 'date',
    header: 'التاريخ',
    priority: 'secondary' as const,
    render: (payment: PaymentRecord) => formatDate(payment.paymentDate),
  },
  {
    key: 'type',
    header: 'نوع الحركة',
    priority: 'secondary' as const,
    render: (payment: PaymentRecord) => <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${typeBadgeClasses[payment.type]}`}>{formatPaymentTypeLabel(payment.type)}</span>,
  },
  {
    key: 'method',
    header: 'الوسيلة',
    priority: 'secondary' as const,
    render: (payment: PaymentRecord) => <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${methodBadgeClasses[payment.method]}`}>{formatPaymentMethodLabel(payment.method)}</span>,
  },
  {
    key: 'direction',
    header: 'الاتجاه',
    priority: 'secondary' as const,
    render: (payment: PaymentRecord) => <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${directionBadgeClasses[payment.direction]}`}>{formatPaymentDirectionLabel(payment.direction)}</span>,
  },
  {
    key: 'amount',
    header: 'المبلغ',
    priority: 'secondary' as const,
    render: (payment: PaymentRecord) => <span className={`font-extrabold ${movementAmountClass(payment.direction)}`}>{formatMovementAmount(payment)}</span>,
  },
  {
    key: 'notes',
    header: 'ملاحظات',
    priority: 'secondary' as const,
    render: (payment: PaymentRecord) => payment.retentionReason || payment.notes || '—',
  },
];

export function PaymentsPage() {
  const [payments, setPayments] = useState<PaymentRecord[]>(() => getPayments());
  const [filters, setFilters] = useState<PaymentFilters>({
    search: '',
    type: 'all',
    method: 'all',
    direction: 'all',
  });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const filteredPayments = useMemo(
    () => filterPayments(payments, filters),
    [payments, filters],
  );
  const summary = useMemo(
    () => summarizePayments(payments),
    [payments],
  );
  const hasActiveFilters = filters.search !== '' || filters.type !== 'all' || filters.method !== 'all' || filters.direction !== 'all';

  const handleCreated = (payment: PaymentRecord) => {
    setPayments((current) => [payment, ...current]);
    setFeedback(`تم تسجيل الدفعة ${payment.paymentNumber} بنجاح.`);
  };

  const handleExport = () => {
    downloadCsv(ledgerFileName('سجل-المدفوعات'), buildPaymentsCsv(filteredPayments));
  };

  return (
    <section className="min-w-0 space-y-6">
      <PageHeader
        eyebrow="دفتر يدوي - لا يوجد دفع إلكتروني أونلاين"
        title="دفتر التحصيل اليدوي (المدفوعات)"
        actions={(
          <>
            <Button type="button" variant="secondary" onClick={handleExport}>
              <Download aria-hidden="true" className="h-5 w-5" />
              تصدير CSV
            </Button>
            <Button type="button" onClick={() => { setFeedback(null); setShowCreateModal(true); }} className="min-h-11">
              <Plus aria-hidden="true" className="h-5 w-5" />
              تسجيل دفعة جديدة
            </Button>
          </>
        )}
      />

      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
        <strong>تنبيه:</strong> هذا الدفتر يسجل مدفوعات يدوية فقط (نقدي/بطاقة في المحل/تحويل). لا يوجد دفع إلكتروني أونلاين ولا بوابة بطاقات. كل حركة تُحفظ في الخادم مع منع التكرار.
      </div>

      {feedback && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">{feedback}</div>}

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <SummaryCard label="إجمالي التحصيل النقدي" value={formatAmount(summary.totalCollected)} tone="positive" />
        <SummaryCard label="دفعة الحجز" value={formatAmount(summary.bookingAdvanceCollected)} hint="تقلل المتبقي من الإيجار" />
        <SummaryCard label="التأمين المسترد المحصل" value={formatAmount(summary.securityDepositsCollected)} hint="التزام مستحق الرد" />
        <SummaryCard label="التأمين المحتجز" value={formatAmount(summary.securityDepositsRetained)} hint="دخل من احتجاز" />
        <SummaryCard label="التأمين المسترد المتبقي (التزام)" value={formatAmount(summary.securityDepositLiability)} tone="warning" />
        <SummaryCard label="الاسترجاعات النقدية" value={formatAmount(summary.totalRefunded)} />
        <SummaryCard label="المتبقي من الإيجار" value={formatAmount(summary.remainingBalance)} tone={summary.remainingBalance > 0 ? 'warning' : 'default'} />
      </div>

      <FilterBar>
        <SearchFilter
          label="البحث في المدفوعات"
          value={filters.search}
          onChange={(search) => setFilters((current) => ({ ...current, search }))}
          placeholder="بحث برقم الدفعة أو الحجز أو العميلة"
        />
        <SelectFilter label="نوع الحركة" value={filters.type} onChange={(type) => setFilters((current) => ({ ...current, type }))} options={PAYMENT_TYPE_FILTER_OPTIONS} />
        <SelectFilter label="وسيلة الدفع" value={filters.method} onChange={(method) => setFilters((current) => ({ ...current, method }))} options={PAYMENT_METHOD_FILTER_OPTIONS} />
        <SelectFilter label="اتجاه الحركة" value={filters.direction} onChange={(direction) => setFilters((current) => ({ ...current, direction }))} options={PAYMENT_DIRECTION_FILTER_OPTIONS} />
        {hasActiveFilters ? (
          <Button type="button" variant="quiet" size="sm" onClick={() => setFilters({ search: '', type: 'all', method: 'all', direction: 'all' })} className="justify-self-start text-slate-600 hover:bg-stone-100 xl:justify-self-end">
            مسح الفلاتر
          </Button>
        ) : null}
      </FilterBar>

      {filteredPayments.length === 0 ? (
        <EmptyState
          title={payments.length === 0 ? 'لا توجد حركات مالية بعد' : 'لا توجد مدفوعات مطابقة'}
          description={payments.length === 0 ? 'سجّلي أول دفعة على حجز قائم لتظهر هنا.' : 'غيّري البحث أو الفلاتر الحالية لعرض نتائج أخرى.'}
        />
      ) : (
        <DataTable
          rows={filteredPayments}
          columns={paymentColumns}
          rowKey={(payment) => payment.id}
          caption="سجل المدفوعات"
        />
      )}

      <AddPaymentModal open={showCreateModal} onClose={() => setShowCreateModal(false)} onCreated={handleCreated} />
    </section>
  );
}
