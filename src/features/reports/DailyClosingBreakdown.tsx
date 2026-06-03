import type { DayCloseBreakdown } from './report.types';
import { formatReportMoney } from './report.service';

const methods: Array<{ key: keyof DayCloseBreakdown; label: string }> = [
  { key: 'cash', label: 'نقداً' },
  { key: 'card', label: 'بطاقة' },
  { key: 'bankTransfer', label: 'تحويل بنكي' },
  { key: 'other', label: 'أخرى' },
];

type Props = { breakdown: DayCloseBreakdown };

export function DailyClosingBreakdown({ breakdown }: Props) {
  return (
    <div className="mt-4 grid gap-2 md:grid-cols-2">
      {methods.map(({ key, label }) => {
        const item = breakdown[key];
        return (
          <p key={key} className="rounded-lg bg-stone-50 p-3 text-xs">
            <b>{label}</b> — تحصيل {formatReportMoney(item.collections)} · استرجاع {formatReportMoney(item.refunds)} · مصروف {formatReportMoney(item.expenses)} · صافي {formatReportMoney(item.net)}
          </p>
        );
      })}
    </div>
  );
}
