import { useMemo, useState } from 'react';
import { LockKeyhole, RotateCcw } from 'lucide-react';
import { PageHeader } from '../../components/shared/PageHeader';
import { getTodayISO } from '../../shared/utils/date';
import { closeDay, formatReportMoney, getDayClosings, reopenDay } from './report.service';
import type { DayCloseRecord } from './report.types';

const field = 'mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus-visible:border-amber-500 focus-visible:ring-2 focus-visible:ring-amber-500/30';

export function DailyClosingPage() {
  const [closings, setClosings] = useState<DayCloseRecord[]>(() => getDayClosings());
  const [businessDate, setBusinessDate] = useState(getTodayISO());
  const [openingCash, setOpeningCash] = useState('0');
  const [actualCash, setActualCash] = useState('0');
  const [notes, setNotes] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const closedToday = useMemo(() => closings.some((closing) => closing.businessDate === businessDate), [closings, businessDate]);

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      const closing = closeDay({ businessDate, openingCash: Number(openingCash), actualCash: Number(actualCash), notes });
      setClosings(getDayClosings());
      setFeedback(`تم إقفال يومية ${closing.businessDate}. فرق الخزينة: ${formatReportMoney(closing.difference)}.`);
      setError(null);
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : 'تعذر إقفال اليومية.');
      setFeedback(null);
    }
  };

  const reopen = (closing: DayCloseRecord) => {
    if (!window.confirm(`إعادة فتح يومية ${closing.businessDate} ستسمح بإضافة حركات مالية جديدة. متابعة؟`)) return;
    try {
      reopenDay(closing.id);
      setClosings(getDayClosings());
      setFeedback(`تمت إعادة فتح يومية ${closing.businessDate}.`);
      setError(null);
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : 'تعذر إعادة فتح اليومية.');
    }
  };

  return (
    <section className="space-y-6">
      <PageHeader eyebrow="الخزينة" title="إقفال اليومية النقدية" description="ثبّتي رصيد الخزينة الفعلي بعد مراجعة التحصيل والاسترجاعات والمصروفات. بعد الإقفال تُمنع الحركات المالية الجديدة على نفس التاريخ حتى إعادة فتح اليومية." />
      {feedback && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">{feedback}</div>}
      {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-800">{error}</div>}

      <form onSubmit={submit} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-3">
          <label className="text-sm font-bold text-slate-700">تاريخ اليومية<input required type="date" max={getTodayISO()} value={businessDate} onChange={(event) => setBusinessDate(event.target.value)} className={field} /></label>
          <label className="text-sm font-bold text-slate-700">رصيد بداية اليوم<input required type="number" min="0" step="0.001" value={openingCash} onChange={(event) => setOpeningCash(event.target.value)} className={field} /></label>
          <label className="text-sm font-bold text-slate-700">الرصيد النقدي الفعلي<input required type="number" min="0" step="0.001" value={actualCash} onChange={(event) => setActualCash(event.target.value)} className={field} /></label>
        </div>
        <label className="mt-4 block text-sm font-bold text-slate-700">ملاحظات<textarea rows={3} maxLength={500} value={notes} onChange={(event) => setNotes(event.target.value)} className={field} /></label>
        <button type="submit" disabled={closedToday} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"><LockKeyhole aria-hidden="true" className="h-4 w-4" />{closedToday ? 'اليومية مقفلة' : 'إقفال اليومية'}</button>
      </form>

      <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold">سجل الإقفالات</h2>
        {closings.length === 0 ? <p className="mt-3 text-sm text-slate-500">لا توجد يوميات مقفلة حتى الآن.</p> : (
          <div className="mt-4 space-y-3">
            {closings.map((closing) => (
              <div key={closing.id} className="rounded-xl border border-slate-200 p-4 text-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div><p className="font-bold">{closing.businessDate}</p><p className="mt-1 text-xs text-slate-500">تم الإقفال: {new Date(closing.closedAt).toLocaleString('ar-OM')}</p></div>
                  <button type="button" onClick={() => reopen(closing)} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-stone-50"><RotateCcw aria-hidden="true" className="h-4 w-4" />إعادة فتح</button>
                </div>
                <div className="mt-3 grid gap-2 md:grid-cols-4"><p>المتوقع: <b>{formatReportMoney(closing.expectedCash)}</b></p><p>الفعلي: <b>{formatReportMoney(closing.actualCash)}</b></p><p>الفرق: <b className={closing.difference === 0 ? 'text-emerald-700' : 'text-rose-700'}>{formatReportMoney(closing.difference)}</b></p><p>مصروفات نقدية: <b>{formatReportMoney(closing.breakdown.cashExpenses)}</b></p></div>
              </div>
            ))}
          </div>
        )}
      </article>
    </section>
  );
}
