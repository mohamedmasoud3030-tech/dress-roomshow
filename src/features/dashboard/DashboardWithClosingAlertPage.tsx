import { LockKeyhole } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getTodayISO } from '../../shared/utils/date';
import { getDayClosings } from '../reports/report.service';
import { DashboardPage } from './DashboardPage';

export function DashboardWithClosingAlertPage() {
  const today = getTodayISO();
  const closedToday = getDayClosings().some(
    (closing) => closing.businessDate === today && closing.status === 'closed',
  );

  return (
    <div className="space-y-6">
      {!closedToday && (
        <Link
          to="/daily-closing"
          className="flex items-center justify-between gap-4 rounded-3xl border border-amber-200 bg-amber-50/95 p-5 text-amber-950 shadow-sm ring-1 ring-amber-100 transition hover:-translate-y-0.5 hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
        >
          <div>
            <p className="text-xs font-bold text-amber-700">إجراء مطلوب اليوم</p>
            <p className="mt-1 font-bold">لم يتم إقفال يومية {today} حتى الآن</p>
            <p className="mt-1 text-sm text-amber-800">راجعي التحصيلات والمصروفات وفرق الخزينة قبل انتهاء الوردية.</p>
          </div>
          <LockKeyhole aria-hidden="true" className="h-7 w-7 shrink-0 text-amber-700" />
        </Link>
      )}
      <DashboardPage />
    </div>
  );
}
