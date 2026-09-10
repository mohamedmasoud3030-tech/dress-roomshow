import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BellRing, Check, Copy, MessageCircle } from 'lucide-react';
import { Button } from '../../components/shared/Button';
import { PageHeader } from '../../components/shared/PageHeader';
import { SummaryCard } from '../../components/shared/SummaryCard';
import { EmptyState } from '../../components/shared/StateViews';
import { UserFacingErrorAlert } from '../../components/shared/UserFacingErrorAlert';
import { copyMessageToClipboard, openWhatsAppChat } from '@platform/messaging';
import { AMBER_FOCUS_RING_CLASS_NAME } from '../../shared/domain/formConstants';
import { formatMoneyOMR } from '../../shared/utils/format';
import { getReminders, summarizeReminders } from './reminder.service';
import { dismissReminderCommand } from '../workflows';
import type { Reminder } from './reminder.types';

const urgencyStyles = {
  critical: 'border-rose-300 bg-rose-50',
  warning: 'border-amber-300 bg-amber-50',
  info: 'border-slate-200 bg-white',
} as const;

const urgencyBadge = {
  critical: 'bg-rose-600 text-white',
  warning: 'bg-amber-500 text-white',
  info: 'bg-slate-200 text-slate-700',
} as const;

function ReminderCard({
  reminder,
  onSend,
  onCopy,
  onDismiss,
}: {
  reminder: Reminder;
  onSend: (reminder: Reminder) => void;
  onCopy: (reminder: Reminder) => void;
  onDismiss: (reminder: Reminder) => void;
}) {
  return (
    <article className={`min-w-0 rounded-2xl border p-4 shadow-sm ${urgencyStyles[reminder.urgency]}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-extrabold ${urgencyBadge[reminder.urgency]}`}>
            {reminder.title}
          </span>
          <h2 className="mt-2 truncate text-base font-bold text-slate-950">{reminder.customerName}</h2>
          <p className="mt-0.5 truncate text-xs text-slate-600">
            {reminder.reservation.dressCode} — {reminder.reservation.dressName}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            <span dir="ltr">{reminder.customerPhone}</span> · {reminder.dueDate}
          </p>
        </div>
        {reminder.amount !== undefined && reminder.amount > 0 && (
          <span className="shrink-0 text-sm font-extrabold text-rose-700">{formatMoneyOMR(reminder.amount)}</span>
        )}
      </div>

      {/* The exact text that will be sent — nothing leaves without being seen. */}
      <p className="mt-3 whitespace-pre-line rounded-xl bg-white/70 p-3 text-xs leading-6 text-slate-700 ring-1 ring-slate-200">
        {reminder.message}
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <Button type="button" variant="secondary" onClick={() => onSend(reminder)} className="border-emerald-300 bg-emerald-600 text-white hover:bg-emerald-700">
          <MessageCircle aria-hidden="true" className="h-4 w-4" />
          فتح واتساب
        </Button>
        <Button type="button" variant="secondary" onClick={() => onCopy(reminder)} aria-label={`نسخ رسالة ${reminder.customerName}`}>
          <Copy aria-hidden="true" className="h-4 w-4" />
          نسخ
        </Button>
        <Button type="button" variant="secondary" onClick={() => onDismiss(reminder)}>
          <Check aria-hidden="true" className="h-4 w-4" />
          تمت المتابعة
        </Button>
        <Link
          to={`/reservations?search=${encodeURIComponent(reminder.reservation.reservationNumber)}`}
          className={`inline-flex min-h-11 items-center rounded-xl px-3 text-sm font-bold text-slate-600 underline-offset-2 transition hover:underline ${AMBER_FOCUS_RING_CLASS_NAME}`}
        >
          فتح الحجز
        </Link>
      </div>
    </article>
  );
}

/**
 * The follow-up queue.
 *
 * Every reminder shows the exact message before it is sent, because the
 * operator is the one accountable for what reaches a customer.
 */
export function RemindersPage() {
  const [showHandled, setShowHandled] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);

  const reminders = useMemo(() => getReminders(showHandled), [showHandled, refreshToken]);
  const summary = useMemo(() => summarizeReminders(reminders), [reminders]);

  const refresh = () => setRefreshToken((current) => current + 1);

  const handleSend = (reminder: Reminder) => {
    setError(null);
    try {
      openWhatsAppChat(reminder.customerPhone, reminder.message);
      // Sending is a follow-up, so the reminder is marked handled for today.
      dismissReminderCommand(reminder.id, 'whatsapp');
      setFeedback(`تم فتح محادثة واتساب مع ${reminder.customerName}.`);
      refresh();
    } catch (reason: unknown) {
      setError(reason);
    }
  };

  const handleCopy = (reminder: Reminder) => {
    setError(null);
    void copyMessageToClipboard(reminder.message)
      .then(() => setFeedback('تم نسخ الرسالة.'))
      .catch((reason: unknown) => setError(reason));
  };

  const handleDismiss = (reminder: Reminder) => {
    setError(null);
    dismissReminderCommand(reminder.id, 'manual');
    setFeedback(`تمت متابعة تذكير ${reminder.customerName}.`);
    refresh();
  };

  return (
    <section className="min-w-0 space-y-6">
      <PageHeader
        eyebrow="يدوي - يفتح واتساب فقط"
        title="تذكيرات العميلات"
        actions={
          <Button
            type="button"
            variant="secondary"
            onClick={() => setShowHandled((current) => !current)}
            aria-pressed={showHandled}
          >
            {showHandled ? 'إخفاء ما تمت متابعته' : 'عرض ما تمت متابعته'}
          </Button>
        }
      />

      {feedback && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">{feedback}</div>}
      {error !== null && <UserFacingErrorAlert error={error} fallback="تعذر إرسال التذكير." />}

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <SummaryCard label="تحتاج متابعة" value={summary.total} tone={summary.total > 0 ? 'warning' : 'default'} />
        <SummaryCard label="عاجلة" value={summary.critical} tone={summary.critical > 0 ? 'danger' : 'default'} />
        <SummaryCard label="استلام غداً" value={summary.pickupTomorrow} />
        <SummaryCard label="إرجاع غداً" value={summary.returnTomorrow} />
      </div>

      {reminders.length === 0 ? (
        <EmptyState
          icon={<BellRing className="h-10 w-10" />}
          title={showHandled ? 'لا توجد تذكيرات' : 'لا توجد متابعات مطلوبة اليوم'}
          description="ستظهر هنا تلقائياً تذكيرات الاستلام والإرجاع والقطع المتأخرة والمبالغ غير المسددة."
        />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {reminders.map((reminder) => (
            <ReminderCard
              key={reminder.id}
              reminder={reminder}
              onSend={handleSend}
              onCopy={handleCopy}
              onDismiss={handleDismiss}
            />
          ))}
        </div>
      )}

      <p className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-xs leading-6 text-amber-900">
        <strong>تنبيه:</strong> الرسائل تُفتح في واتساب عبر رابط wa.me لمراجعتها قبل الإرسال، ولا تُرسل تلقائياً عبر API. أنتِ ترسلينها يدوياً من هاتفك. التذكير الذي تتم متابعته يختفي لبقية اليوم، ويعود في اليوم التالي إذا بقي سببه قائماً.
      </p>
    </section>
  );
}
