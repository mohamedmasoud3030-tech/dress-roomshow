import { useMemo, useState } from 'react';
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
  deposit: 'bg-violet-100 text-violet-800',
  penalty: 'bg-orange-100 text-orange-800',
  refund: 'bg-emerald-100 text-emerald-800',
  adjustment: 'bg-slate-200 text-slate-800',
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

export function PaymentsPage() {
  const [filters, setFilters] = useState<PaymentFilters>({
    search: '',
    type: 'all',
    method: 'all',
    direction: 'all',
  });

  const payments = useMemo(() => getPayments(), []);
  const filteredPayments = useMemo(
    () => filterPayments(payments, filters),
    [payments, filters],
  );
  const summary = useMemo(
    () => summarizePayments(filteredPayments),
    [filteredPayments],
  );

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">إدارة المدفوعات</h1>
          <p className="mt-2 text-slate-600">متابعة التحصيل والاسترجاع المرتبط بالحجوزات والتسليم والاسترجاع.</p>
        </div>
        <button className="rounded-xl bg-violet-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-violet-800">
          تسجيل دفعة جديدة
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">إجمالي التحصيل</p><p className="mt-2 text-2xl font-bold">{formatAmount(summary.totalCollected)}</p></article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">العربونات</p><p className="mt-2 text-2xl font-bold">{formatAmount(summary.deposits)}</p></article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">الغرامات</p><p className="mt-2 text-2xl font-bold">{formatAmount(summary.penalties)}</p></article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">الاسترجاعات</p><p className="mt-2 text-2xl font-bold">{formatAmount(summary.totalRefunded)}</p></article>
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><p className="text-sm text-slate-500">الرصيد المتبقي</p><p className="mt-2 text-2xl font-bold">{formatAmount(summary.remainingBalance)}</p></article>
      </div>

      <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-4">
        <input value={filters.search} onChange={(e)=>setFilters((p)=>({...p,search:e.target.value}))} placeholder="بحث برقم الدفعة أو الحجز أو العميل أو الفستان" className="rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100" />
        <select value={filters.type} onChange={(e)=>setFilters((p)=>({...p,type:e.target.value as PaymentType | 'all'}))} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100">{typeOptions.map((o)=><option key={o.value} value={o.value}>{o.label}</option>)}</select>
        <select value={filters.method} onChange={(e)=>setFilters((p)=>({...p,method:e.target.value as PaymentMethod | 'all'}))} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100">{methodOptions.map((o)=><option key={o.value} value={o.value}>{o.label}</option>)}</select>
        <select value={filters.direction} onChange={(e)=>setFilters((p)=>({...p,direction:e.target.value as PaymentDirection | 'all'}))} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100">{directionOptions.map((o)=><option key={o.value} value={o.value}>{o.label}</option>)}</select>
      </div>

      {filteredPayments.length === 0 ? <article className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm"><p className="text-sm text-slate-500">لا توجد مدفوعات مطابقة للفلاتر الحالية.</p></article> : (
        <div className="grid gap-4 xl:grid-cols-2">{filteredPayments.map((payment)=><article key={payment.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between gap-3"><div><p className="text-sm text-slate-500">رقم الدفعة: {payment.paymentNumber}</p><h2 className="mt-1 text-lg font-semibold text-slate-950">{payment.customerName}</h2><p className="text-sm text-slate-600">{payment.reservationNumber} — {payment.dressCode} / {payment.dressName}</p></div><p className={`text-sm font-bold ${payment.direction === 'income' ? 'text-emerald-700' : 'text-rose-700'}`}>{payment.direction === 'income' ? '+' : '-'} {formatAmount(payment.amount)}</p></div><div className="mt-3 flex flex-wrap gap-2"><span className={`rounded-full px-3 py-1 text-xs font-semibold ${typeBadgeClasses[payment.type]}`}>{formatPaymentTypeLabel(payment.type)}</span><span className={`rounded-full px-3 py-1 text-xs font-semibold ${methodBadgeClasses[payment.method]}`}>{formatPaymentMethodLabel(payment.method)}</span><span className={`rounded-full px-3 py-1 text-xs font-semibold ${directionBadgeClasses[payment.direction]}`}>{formatPaymentDirectionLabel(payment.direction)}</span></div><dl className="mt-4 text-sm text-slate-700"><dt className="text-slate-500">تاريخ الدفع</dt><dd>{formatDate(payment.paymentDate)}</dd></dl>{payment.notes ? <p className="mt-3 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">{payment.notes}</p> : null}</article>)}</div>
      )}
    </section>
  );
}
