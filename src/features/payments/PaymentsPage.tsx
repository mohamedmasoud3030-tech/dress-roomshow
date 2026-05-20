import { useEffect, useMemo, useState } from 'react';
import {
  filterPayments,
  formatPaymentDirectionLabel,
  formatPaymentMethodLabel,
  formatPaymentTypeLabel,
  getPayments,
  getPaymentsFromLocalDb,
  summarizePayments,
} from './payment.service';
import { EmptyState } from '../../components/shared/EmptyState';
import { FilterPanel } from '../../components/shared/FilterPanel';
import { PageHeader } from '../../components/shared/PageHeader';
import { SimpleModal } from '../../components/shared/SimpleModal';
import { SummaryCard } from '../../components/shared/SummaryCard';
import { formatDateByLocale, formatMoneyByLocale } from '../../services/localeFormatters';
import type {
  PaymentDirection,
  PaymentFilters,
  PaymentMethod,
  PaymentType,
} from './payment.types';

const typeOptions: Array<{ value: PaymentType | 'all'; label: string }> = [
  { value: 'all', label: 'كل الأنواع' },
  { value: 'rental', label: 'إيجار' },
  { value: 'deposit', label: 'عربون' },
  { value: 'penalty', label: 'غرامة' },
  { value: 'refund', label: 'استرجاع' },
  { value: 'adjustment', label: 'تسوية' },
];

const methodOptions: Array<{ value: PaymentMethod | 'all'; label: string }> = [
  { value: 'all', label: 'كل وسائل الدفع' },
  { value: 'cash', label: 'نقداً' },
  { value: 'card', label: 'بطاقة' },
  { value: 'bank_transfer', label: 'تحويل بنكي' },
  { value: 'other', label: 'أخرى' },
];

const directionOptions: Array<{ value: PaymentDirection | 'all'; label: string }> = [
  { value: 'all', label: 'كل الاتجاهات' },
  { value: 'income', label: 'تحصيل' },
  { value: 'refund', label: 'استرجاع' },
];

const typeBadgeClasses: Record<PaymentType, string> = {
  rental: 'bg-blue-100 text-blue-800',
  deposit: 'bg-[#B08A5B]/20 text-[#7A5133]',
  penalty: 'bg-orange-100 text-orange-800',
  refund: 'bg-emerald-100 text-emerald-800',
  adjustment: 'bg-[#E8DED2] text-slate-800',
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
};

export function PaymentsPage() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [payments, setPayments] = useState(() => getPayments());

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [draftPayment, setDraftPayment] = useState({
    reservationNumber: '',
    customerName: '',
    dressCode: '',
    dressName: '',
    paymentDate: '',
    type: 'rental' as PaymentType,
    method: 'cash' as PaymentMethod,
    direction: 'income' as PaymentDirection,
    amount: '',
    notes: '',
  });

  const [filters, setFilters] = useState<PaymentFilters>({
    search: '',
    type: 'all',
    method: 'all',
    direction: 'all',
  });

  useEffect(() => {
    void (async () => {
      const rows = await getPaymentsFromLocalDb();
      if (rows) setPayments(rows);
    })();
  }, []);

  const filteredPayments = useMemo(
    () => filterPayments(payments, filters),
    [payments, filters],
  );
  const summary = useMemo(
    () => summarizePayments(filteredPayments),
    [filteredPayments],
  );

  const resetCreateState = () => {
    setDraftPayment({
      reservationNumber: '',
      customerName: '',
      dressCode: '',
      dressName: '',
      paymentDate: '',
      type: 'rental',
      method: 'cash',
      direction: 'income',
      amount: '',
      notes: '',
    });
    setFormErrors({});
  };

  const closeCreateModal = () => {
    setIsCreateModalOpen(false);
    resetCreateState();
  };

  const submitCreatePayment = () => {
    const trimmed = {
      reservationNumber: draftPayment.reservationNumber.trim(),
      customerName: draftPayment.customerName.trim(),
      dressCode: draftPayment.dressCode.trim(),
      dressName: draftPayment.dressName.trim(),
      notes: draftPayment.notes.trim(),
    };
    const amountNumber = Number(draftPayment.amount);
    const nextErrors: Record<string, string> = {};

    if (!trimmed.reservationNumber) nextErrors.reservationNumber = 'رقم الحجز مطلوب';
    if (!trimmed.customerName) nextErrors.customerName = 'اسم العميل مطلوب';
    if (!trimmed.dressCode) nextErrors.dressCode = 'كود الفستان مطلوب';
    if (!trimmed.dressName) nextErrors.dressName = 'اسم الفستان مطلوب';
    if (!draftPayment.paymentDate) nextErrors.paymentDate = 'تاريخ الدفع مطلوب';
    if (!draftPayment.amount.trim()) {
      nextErrors.amount = 'المبلغ مطلوب';
    } else if (Number.isNaN(amountNumber) || amountNumber <= 0) {
      nextErrors.amount = 'المبلغ يجب أن يكون رقماً أكبر من صفر';
    }

    if (Object.keys(nextErrors).length > 0) {
      setFormErrors(nextErrors);
      return;
    }

    setPayments((prev) => [
      {
        id: `local-payment-${crypto.randomUUID()}`,
        paymentNumber: `PAY-LOCAL-${String(prev.length + 1).padStart(3, '0')}`,
        reservationNumber: trimmed.reservationNumber,
        customerName: trimmed.customerName,
        dressCode: trimmed.dressCode,
        dressName: trimmed.dressName,
        paymentDate: draftPayment.paymentDate,
        type: draftPayment.type,
        method: draftPayment.method,
        direction: draftPayment.direction,
        amount: amountNumber,
        reservationTotal: amountNumber,
        notes: trimmed.notes || undefined,
      },
      ...prev,
    ]);

    closeCreateModal();
  };

  return (
    <section className="space-y-6">
      <PageHeader eyebrow="المدفوعات" title="إدارة المدفوعات" description="متابعة التحصيل والاسترجاع المرتبط بالحجوزات والتسليم والاسترجاع." action={<button className="rounded-xl bg-[#8B5E3C] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#7A5133]" onClick={() => setIsCreateModalOpen(true)}>تسجيل دفعة جديدة</button>} />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <SummaryCard label="إجمالي التحصيل" value={formatMoneyByLocale(summary.totalCollected)} />
        <SummaryCard label="العربونات" value={formatMoneyByLocale(summary.deposits)} />
        <SummaryCard label="الغرامات" value={formatMoneyByLocale(summary.penalties)} />
        <SummaryCard label="الاسترجاعات" value={formatMoneyByLocale(summary.totalRefunded)} />
        <SummaryCard label="الرصيد المتبقي" value={formatMoneyByLocale(summary.remainingBalance)} />
      </div>
      <FilterPanel>
      <div className="grid gap-3 md:grid-cols-4">
        <input value={filters.search} onChange={(e)=>setFilters((p)=>({...p,search:e.target.value}))} placeholder="بحث برقم الدفعة أو الحجز أو العميل أو الفستان" className="rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-[#B08A5B] focus:outline-none focus:ring-2 focus:ring-[#B08A5B]/20" />
        <select value={filters.type} onChange={(e)=>setFilters((p)=>({...p,type:e.target.value as PaymentType | 'all'}))} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:border-[#B08A5B] focus:outline-none focus:ring-2 focus:ring-[#B08A5B]/20">{typeOptions.map((o)=><option key={o.value} value={o.value}>{o.label}</option>)}</select>
        <select value={filters.method} onChange={(e)=>setFilters((p)=>({...p,method:e.target.value as PaymentMethod | 'all'}))} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:border-[#B08A5B] focus:outline-none focus:ring-2 focus:ring-[#B08A5B]/20">{methodOptions.map((o)=><option key={o.value} value={o.value}>{o.label}</option>)}</select>
        <select value={filters.direction} onChange={(e)=>setFilters((p)=>({...p,direction:e.target.value as PaymentDirection | 'all'}))} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:border-[#B08A5B] focus:outline-none focus:ring-2 focus:ring-[#B08A5B]/20">{directionOptions.map((o)=><option key={o.value} value={o.value}>{o.label}</option>)}</select>
      </div>
      </FilterPanel>

      {filteredPayments.length === 0 ? <EmptyState title="لا توجد مدفوعات مطابقة" description="غيّر الفلاتر الحالية لعرض نتائج أخرى." /> : (
        <div className="grid gap-4 xl:grid-cols-2">{filteredPayments.map((payment)=><article key={payment.id} className="rounded-2xl border border-[#E8DED2] bg-white p-5 shadow-sm"><div className="flex items-start justify-between gap-3"><div><p className="text-sm text-[#7A7168]">رقم الدفعة: {payment.paymentNumber}</p><h2 className="mt-1 text-lg font-semibold text-[#1F1B18]">{payment.customerName}</h2><p className="text-sm text-[#7A7168]">{payment.reservationNumber} — {payment.dressCode} / {payment.dressName}</p></div><p className={`text-sm font-bold ${payment.direction === 'income' ? 'text-emerald-700' : 'text-rose-700'}`}>{payment.direction === 'income' ? '+' : '-'} {formatMoneyByLocale(payment.amount)}</p></div><div className="mt-3 flex flex-wrap gap-2"><span className={`rounded-full px-3 py-1 text-xs font-semibold ${typeBadgeClasses[payment.type]}`}>{formatPaymentTypeLabel(payment.type)}</span><span className={`rounded-full px-3 py-1 text-xs font-semibold ${methodBadgeClasses[payment.method]}`}>{formatPaymentMethodLabel(payment.method)}</span><span className={`rounded-full px-3 py-1 text-xs font-semibold ${directionBadgeClasses[payment.direction]}`}>{formatPaymentDirectionLabel(payment.direction)}</span></div><dl className="mt-4 text-sm text-slate-700"><dt className="text-[#7A7168]">تاريخ الدفع</dt><dd>{formatDateByLocale(payment.paymentDate)}</dd></dl>{payment.notes ? <p className="mt-3 rounded-xl bg-[#FAF7F2] p-3 text-sm text-[#7A7168]">{payment.notes}</p> : null}</article>)}</div>
      )}
      <SimpleModal open={isCreateModalOpen} onClose={closeCreateModal} title='تسجيل دفعة جديدة' footer={<button onClick={submitCreatePayment} className='rounded-xl bg-[#8B5E3C] px-4 py-2 text-sm font-semibold text-white'>حفظ محلي</button>}>
        <div className='grid gap-3 md:grid-cols-2'>
          <input value={draftPayment.reservationNumber} onChange={(e)=>setDraftPayment((p)=>({...p,reservationNumber:e.target.value}))} placeholder='رقم الحجز*' className='rounded-xl border border-[#E8DED2] bg-[#FAF7F2] px-3 py-2 text-sm' />
          <input value={draftPayment.customerName} onChange={(e)=>setDraftPayment((p)=>({...p,customerName:e.target.value}))} placeholder='اسم العميل*' className='rounded-xl border border-[#E8DED2] bg-[#FAF7F2] px-3 py-2 text-sm' />
          <input value={draftPayment.dressCode} onChange={(e)=>setDraftPayment((p)=>({...p,dressCode:e.target.value}))} placeholder='كود الفستان*' className='rounded-xl border border-[#E8DED2] bg-[#FAF7F2] px-3 py-2 text-sm' />
          <input value={draftPayment.dressName} onChange={(e)=>setDraftPayment((p)=>({...p,dressName:e.target.value}))} placeholder='اسم الفستان*' className='rounded-xl border border-[#E8DED2] bg-[#FAF7F2] px-3 py-2 text-sm' />
          <input type='date' value={draftPayment.paymentDate} onChange={(e)=>setDraftPayment((p)=>({...p,paymentDate:e.target.value}))} className='rounded-xl border border-[#E8DED2] bg-[#FAF7F2] px-3 py-2 text-sm' />
          <input value={draftPayment.amount} onChange={(e)=>setDraftPayment((p)=>({...p,amount:e.target.value}))} placeholder='المبلغ*' className='rounded-xl border border-[#E8DED2] bg-[#FAF7F2] px-3 py-2 text-sm' />
          <select value={draftPayment.type} onChange={(e)=>setDraftPayment((p)=>({...p,type:e.target.value as PaymentType}))} className='rounded-xl border border-[#E8DED2] bg-[#FAF7F2] px-3 py-2 text-sm'>{typeOptions.filter((o)=>o.value!=='all').map((o)=><option key={o.value} value={o.value}>{o.label}</option>)}</select>
          <select value={draftPayment.method} onChange={(e)=>setDraftPayment((p)=>({...p,method:e.target.value as PaymentMethod}))} className='rounded-xl border border-[#E8DED2] bg-[#FAF7F2] px-3 py-2 text-sm'>{methodOptions.filter((o)=>o.value!=='all').map((o)=><option key={o.value} value={o.value}>{o.label}</option>)}</select>
          <select value={draftPayment.direction} onChange={(e)=>setDraftPayment((p)=>({...p,direction:e.target.value as PaymentDirection}))} className='rounded-xl border border-[#E8DED2] bg-[#FAF7F2] px-3 py-2 text-sm md:col-span-2'>{directionOptions.filter((o)=>o.value!=='all').map((o)=><option key={o.value} value={o.value}>{o.label}</option>)}</select>
        </div>
        {Object.values(formErrors).length > 0 ? <ul className='mt-3 list-disc space-y-1 pr-5 text-xs text-rose-700'>{Object.entries(formErrors).map(([key, message])=><li key={key}>{message}</li>)}</ul> : null}
        <textarea value={draftPayment.notes} onChange={(e)=>setDraftPayment((p)=>({...p,notes:e.target.value}))} placeholder='ملاحظات العملية' className='mt-3 min-h-24 w-full rounded-xl border border-[#E8DED2] bg-[#FAF7F2] px-3 py-2 text-sm' />
        <p className='text-xs text-[#7A7168]'>إجراء واجهة محلي فقط بدون تعديل مصادر البيانات الحالية.</p>
      </SimpleModal>
    </section>
  );
}
