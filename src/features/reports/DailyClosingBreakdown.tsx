import type { DayCloseBreakdown } from './report.types';
import { formatReportMoney } from './report.service';
import { BASIC_PAYMENT_METHOD_LABELS } from '../payments/payment.constants';

const methods: Array<{ key: keyof DayCloseBreakdown; label: string }> = [
  { key: 'cash', label: BASIC_PAYMENT_METHOD_LABELS.cash },
  { key: 'card', label: BASIC_PAYMENT_METHOD_LABELS.card },
  { key: 'bankTransfer', label: BASIC_PAYMENT_METHOD_LABELS.bank_transfer },
  { key: 'other', label: BASIC_PAYMENT_METHOD_LABELS.other },
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
