import { useMemo, useState } from 'react';
import { LockKeyhole, RotateCcw } from 'lucide-react';
import { Button } from '../../components/shared/Button';
import { PageHeader } from '../../components/shared/PageHeader';
import { UserFacingErrorAlert } from '../../components/shared/UserFacingErrorAlert';
import { MAX_NOTES_LENGTH, MIN_ZERO_AMOUNT, MONEY_STEP } from '../../shared/domain/businessRules';
import { STACKED_FORM_FIELD_CLASS_NAME } from '../../shared/domain/formConstants';
import { getTodayISO } from '../../shared/utils/date';
import { createSubmissionKey } from '../../shared/utils/submissionKey';
import { DailyClosingBreakdown } from './DailyClosingBreakdown';
import { formatReportMoney, getDayClosings } from './report.service';
import { closeDayCommand, reopenDayCommand } from '../workflows';
import type { DayCloseRecord } from './report.types';
import { describeCloudCopyStatus, exportBackupForDownload } from '../preferences/backupExport.service';
import { useAuth } from '../auth/AuthContext';

export function DailyClosingPage() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const [closings, setClosings] = useState<DayCloseRecord[]>(() => getDayClosings());
  const [businessDate, setBusinessDate] = useState(getTodayISO());
  const [openingCash, setOpeningCash] = useState('0');
  const [actualCash, setActualCash] = useState('0');
  const [notes, setNotes] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [backupWarning, setBackupWarning] = useState<string | null>(null);
  const [backupRetry, setBackupRetry] = useState<DayCloseRecord | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  const [submissionKey, setSubmissionKey] = useState(() => createSubmissionKey('daily-close'));
  const closedToday = useMemo(() => closings.some((closing) => closing.businessDate === businessDate && closing.status === 'closed'), [closings, businessDate]);

  const exportClosingBackup = async (closing: DayCloseRecord) => {
    try {
      const { cloudCopy } = await exportBackupForDownload({ businessDate: closing.businessDate, source: 'daily-close' });
      setBackupWarning(null);
      setBackupRetry(null);
      setFeedback(`تم إقفال يومية ${closing.businessDate}. تم تجهيز النسخة الاحتياطية الكاملة للتحميل.${describeCloudCopyStatus(cloudCopy)}`);
    } catch {
      setBackupRetry(closing);
      setBackupWarning('تم إقفال اليومية، لكن تعذر تجهيز النسخة الاحتياطية. نزّليها الآن قبل متابعة العمل.');
    }
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isClosing) return;
    setIsClosing(true);
    try {
      const closing = closeDayCommand({ businessDate, openingCash: Number(openingCash), actualCash: Number(actualCash), notes, idempotencyKey: submissionKey });
      setClosings(getDayClosings());
      setSubmissionKey(createSubmissionKey('daily-close'));
      setFeedback(`تم إقفال يومية ${closing.businessDate}. فرق الخزينة: ${formatReportMoney(closing.difference)}.`);
      setError(null);
      await exportClosingBackup(closing);
    } catch (reason: unknown) {
      setError(reason);
      setFeedback(null);
    } finally {
      setIsClosing(false);
    }
  };

  const reopen = (closing: DayCloseRecord) => {
    if (!window.confirm(`إعادة فتح يومية ${closing.businessDate} ستسمح بإضافة حركات مالية جديدة. متابعة؟`)) return;
    const reopenReason = window.prompt('اكتبي سبب إعادة فتح اليومية ليظهر في سجل التدقيق:');
    if (reopenReason === null) return;
    try {
      reopenDayCommand(closing.id, reopenReason, createSubmissionKey('daily-reopen'));
      setClosings(getDayClosings());
      setFeedback(`تمت إعادة فتح يومية ${closing.businessDate} مع الاحتفاظ بالسجل التاريخي.`);
      setError(null);
    } catch (reason: unknown) {
      setError(reason);
    }
  };

  return (
    <section className="space-y-6">
      <PageHeader eyebrow="الخزينة" title="إقفال اليومية النقدية" />
      {feedback && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">{feedback}</div>}
      {backupWarning && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900">
          <span>{backupWarning}</span>
          {backupRetry && <Button type="button" variant="secondary" onClick={() => void exportClosingBackup(backupRetry)} className="border-amber-400">تجهيز النسخة الآن</Button>}
        </div>
      )}
      {error !== null && <UserFacingErrorAlert error={error} fallback="تعذر إكمال عملية إقفال اليومية." />}

      <form onSubmit={submit} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-3">
          <label className="text-sm font-bold text-slate-700">تاريخ اليومية<input required type="date" max={getTodayISO()} value={businessDate} onChange={(event) => setBusinessDate(event.target.value)} className={STACKED_FORM_FIELD_CLASS_NAME} /></label>
          <label className="text-sm font-bold text-slate-700">رصيد بداية اليوم<input required type="number" min={MIN_ZERO_AMOUNT} step={MONEY_STEP} value={openingCash} onChange={(event) => setOpeningCash(event.target.value)} className={STACKED_FORM_FIELD_CLASS_NAME} /></label>
          <label className="text-sm font-bold text-slate-700">الرصيد النقدي الفعلي<input required type="number" min={MIN_ZERO_AMOUNT} step={MONEY_STEP} value={actualCash} onChange={(event) => setActualCash(event.target.value)} className={STACKED_FORM_FIELD_CLASS_NAME} /></label>
        </div>
        <label className="mt-4 block text-sm font-bold text-slate-700">ملاحظات<textarea rows={3} maxLength={MAX_NOTES_LENGTH} value={notes} onChange={(event) => setNotes(event.target.value)} className={STACKED_FORM_FIELD_CLASS_NAME} /></label>
        <Button type="submit" disabled={closedToday || isClosing} loading={isClosing} loadingLabel="جارٍ الإقفال..." className="mt-4">
          <LockKeyhole aria-hidden="true" className="h-4 w-4" />
          {closedToday ? 'اليومية مقفلة' : 'إقفال اليومية'}
        </Button>
      </form>

      <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold">سجل الإقفالات التاريخي</h2>
        {closings.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">لا توجد يوميات مقفلة حتى الآن.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {closings.map((closing) => (
              <div key={closing.id} className="rounded-xl border border-slate-200 p-4 text-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-bold">{closing.businessDate} · {closing.status === 'closed' ? 'مقفلة' : 'أعيد فتحها'}</p>
                    <p className="mt-1 text-xs text-slate-500">تم الإقفال: {new Date(closing.closedAt).toLocaleString('ar-OM')}</p>
                    {closing.reopenedAt && <p className="mt-1 text-xs text-amber-800">إعادة الفتح: {new Date(closing.reopenedAt).toLocaleString('ar-OM')} — {closing.reopenReason}</p>}
                  </div>
                  {closing.status === 'closed' && isAdmin && (
                    <Button type="button" variant="secondary" size="sm" onClick={() => reopen(closing)}>
                      <RotateCcw aria-hidden="true" className="h-4 w-4" />
                      إعادة فتح
                    </Button>
                  )}
                </div>
                <div className="mt-3 grid gap-2 md:grid-cols-4">
                  <p>البداية: <b>{formatReportMoney(closing.openingCash)}</b></p>
                  <p>المتوقع: <b>{formatReportMoney(closing.expectedCash)}</b></p>
                  <p>الفعلي: <b>{formatReportMoney(closing.actualCash)}</b></p>
                  <p>الفرق: <b>{formatReportMoney(closing.difference)}</b></p>
                </div>
                <DailyClosingBreakdown breakdown={closing.breakdown} />
              </div>
            ))}
          </div>
        )}
      </article>
    </section>
  );
}
