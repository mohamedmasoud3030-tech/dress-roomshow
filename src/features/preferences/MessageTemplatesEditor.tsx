import { useRef, useState } from 'react';
import { RotateCcw, Save } from 'lucide-react';
import { UserFacingErrorAlert } from '../../components/shared/UserFacingErrorAlert';
import { AMBER_FOCUS_RING_CLASS_NAME } from '../../shared/domain/formConstants';
import { REMINDER_KIND_LABELS } from '../reminders/reminder.service';
import {
  DEFAULT_MESSAGE_TEMPLATES,
  MAX_TEMPLATE_LENGTH,
  TEMPLATE_PLACEHOLDERS,
  buildTemplateVariables,
  getMessageTemplates,
  insertTemplateToken,
  renderTemplate,
  type MessageTemplates,
} from '../reminders/messageTemplates';
import { resetMessageTemplatesCommand, saveMessageTemplatesCommand } from '../workflows';
import type { ReminderKind } from '../reminders/reminder.types';

/**
 * Reminder message editor.
 *
 * A live preview sits under every field, filled with representative values.
 * Without it the owner is editing placeholder syntax blind and only discovers a
 * mistake when a real customer receives the broken message — which is exactly
 * the failure the WhatsApp hand-off was designed to avoid, since the message is
 * sent under the showroom's name.
 */

const PREVIEW_VARIABLES = buildTemplateVariables({
  customerName: 'نورة',
  dressName: 'فستان زفاف كلاسيكي',
  reservationNumber: 'RSV-000123',
  pickupDate: '2026-09-20',
  pickupTime: '10:00 صباحاً',
  returnDate: '2026-09-22',
  returnTime: '08:00 مساءً',
  remainingAmount: 45,
  accessoryNames: ['طرحة طويلة', 'تاج'],
  brandName: 'LENA',
});

const KINDS: ReminderKind[] = ['pickup_tomorrow', 'return_tomorrow', 'overdue_return', 'outstanding_balance'];

export function MessageTemplatesEditor() {
  const [templates, setTemplates] = useState<MessageTemplates>(() => getMessageTemplates());
  const [error, setError] = useState<unknown>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  // The chips insert into whichever message was focused last (default: the first).
  const [activeKind, setActiveKind] = useState<ReminderKind>(KINDS[0]);
  const textareaRefs = useRef<Partial<Record<ReminderKind, HTMLTextAreaElement | null>>>({});

  const insertPlaceholder = (placeholder: (typeof TEMPLATE_PLACEHOLDERS)[number]) => {
    const field = textareaRefs.current[activeKind];
    const { text, caret } = insertTemplateToken(templates[activeKind], placeholder.token, field ? field.selectionStart : null);
    setTemplates((current) => ({ ...current, [activeKind]: text }));
    setError(null);
    setFeedback(`أُدرج رمز «${placeholder.label}» في رسالة «${REMINDER_KIND_LABELS[activeKind]}». لا تنسي الحفظ.`);
    requestAnimationFrame(() => {
      const target = textareaRefs.current[activeKind];
      if (target) {
        target.focus();
        target.setSelectionRange(caret, caret);
      }
    });
  };

  const handleSave = () => {
    setError(null);
    try {
      setTemplates(saveMessageTemplatesCommand(templates));
      setFeedback('تم حفظ نصوص الرسائل.');
    } catch (caught) {
      setFeedback(null);
      setError(caught);
    }
  };

  const handleReset = () => {
    setError(null);
    setTemplates(resetMessageTemplatesCommand());
    setFeedback('تمت إعادة النصوص إلى الصياغة الافتراضية.');
  };

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-bold">نصوص رسائل التذكير</h2>
      <p className="mt-1 text-xs leading-5 text-slate-600">
        هذه هي الرسائل التي تُرسل باسم المعرض عبر واتساب. عدّليها بصياغتك، واستخدمي الرموز أدناه لإدراج بيانات الحجز.
      </p>

      {error !== null && <div className="mt-3"><UserFacingErrorAlert error={error} fallback="تعذر حفظ النصوص." /></div>}
      {feedback && (
        <p role="status" className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">
          {feedback}
        </p>
      )}

      <div className="mt-3 rounded-xl bg-stone-50 p-3">
        <p className="text-xs font-bold text-slate-700">الرموز المتاحة</p>
        <p className="mt-1 text-xs text-slate-500">اضغطي أي رمز لإدراجه مكان المؤشر في الرسالة التي تعملين عليها — لا حاجة لكتابة الرمز يدويًا.</p>
        <ul className="mt-2 flex flex-wrap gap-2">
          {TEMPLATE_PLACEHOLDERS.map((placeholder) => (
            <li key={placeholder.token}>
              <button
                type="button"
                onClick={() => insertPlaceholder(placeholder)}
                aria-label={`إدراج رمز ${placeholder.label}`}
                className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-slate-700 ring-1 ring-slate-200 transition hover:bg-amber-50 hover:ring-amber-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
              >
                <span dir="ltr">{`{{${placeholder.token}}}`}</span> — {placeholder.label}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-4 space-y-5">
        {KINDS.map((kind) => (
          <div key={kind} className="min-w-0">
            <label className="block text-sm font-bold text-slate-700">
              {REMINDER_KIND_LABELS[kind]}
              <textarea
                ref={(element) => {
                  textareaRefs.current[kind] = element;
                }}
                rows={5}
                value={templates[kind]}
                maxLength={MAX_TEMPLATE_LENGTH}
                onFocus={(event) => {
                  setActiveKind(kind);
                  // Chip-insert happens at the caret; a fresh focus reports 0 and
                  // would prepend the token instead of extending the sentence.
                  // Rest the caret at the end of a never-edited message; an
                  // explicit click still repositions it anywhere afterwards.
                  const target = event.currentTarget;
                  if (target.value.length > 0 && target.selectionStart === 0 && target.selectionEnd === 0) {
                    target.setSelectionRange(target.value.length, target.value.length);
                  }
                }}
                onChange={(event) => setTemplates((current) => ({ ...current, [kind]: event.target.value }))}
                className="mt-1.5 min-h-11 w-full rounded-xl border border-slate-300 bg-stone-50 px-3 py-2 text-sm leading-6 text-slate-950 transition focus-visible:border-amber-500 focus-visible:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/30"
              />
            </label>
            {/* Editing placeholder syntax blind is how a broken message reaches
                a real customer under the showroom's name. */}
            <div className="mt-2 rounded-xl border border-slate-200 bg-stone-50 p-3">
              <p className="text-xs font-bold text-slate-500">معاينة</p>
              <p className="mt-1 whitespace-pre-line text-sm leading-6 text-slate-800">
                {renderTemplate(templates[kind], PREVIEW_VARIABLES)}
              </p>
            </div>
            {templates[kind] !== DEFAULT_MESSAGE_TEMPLATES[kind] && (
              <p className="mt-1 text-xs text-amber-800">نص مخصص (يختلف عن الصياغة الافتراضية).</p>
            )}
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleSave}
          className={`inline-flex min-h-11 items-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-bold text-white transition hover:bg-slate-800 ${AMBER_FOCUS_RING_CLASS_NAME}`}
        >
          <Save aria-hidden="true" className="h-4 w-4" />
          حفظ النصوص
        </button>
        <button
          type="button"
          onClick={handleReset}
          className={`inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-stone-100 ${AMBER_FOCUS_RING_CLASS_NAME}`}
        >
          <RotateCcw aria-hidden="true" className="h-4 w-4" />
          إعادة الصياغة الافتراضية
        </button>
      </div>
    </article>
  );
}
