import { useMemo } from 'react';
import { formatMoneyOMR } from '../../shared/utils/format';
import { getSales } from '../dresses/sale.service';

const methodLabels = {
  cash: 'نقداً',
  card: 'بطاقة',
  bank_transfer: 'تحويل بنكي',
  other: 'أخرى',
} as const;

export function SalesHistoryPanel() {
  const sales = useMemo(
    () => [...getSales()].sort((a, b) => b.saleDate.localeCompare(a.saleDate)),
    [],
  );

  return <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <h2 className="text-lg font-semibold">سجل المبيعات</h2>
    <p className="mt-1 text-sm text-slate-500">آخر عمليات بيع الفساتين المسجلة محلياً.</p>
    {sales.length === 0 ? <p className="mt-4 text-sm text-slate-500">لا توجد مبيعات مسجلة حالياً.</p> : <div className="mt-4 space-y-2 text-sm">
      {sales.slice(0, 10).map((sale) => <div key={sale.id} className="flex flex-col gap-2 rounded-xl bg-stone-50 p-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-bold text-slate-950">{sale.saleNumber} — {sale.dressCode}</p>
          <p className="mt-1 text-slate-600">{sale.customerName} — {sale.saleDate}</p>
        </div>
        <div className="text-sm sm:text-left">
          <p className="font-bold text-emerald-700">{formatMoneyOMR(sale.amount)}</p>
          <p className="mt-1 text-slate-500">{methodLabels[sale.paymentMethod]}</p>
        </div>
      </div>)}
    </div>}
  </article>;
}
