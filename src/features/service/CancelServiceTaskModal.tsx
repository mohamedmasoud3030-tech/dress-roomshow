import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Button } from '../../components/shared/Button';
import { Modal } from '../../components/shared/Modal';
import { UserFacingErrorAlert } from '../../components/shared/UserFacingErrorAlert';
import { STACKED_FORM_FIELD_CLASS_NAME, STACKED_FORM_LABEL_CLASS_NAME } from '../../shared/domain/formConstants';
import { createSubmissionKey } from '../../shared/utils/submissionKey';
import type { ServiceTask } from './service.types';
import { cancelServiceTaskCommand } from '../workflows';

type Props = { task: ServiceTask | null; onClose: () => void; onCancelled: (task: ServiceTask) => void };

/**
 * Cancelling is the only way out of a task that was opened by mistake, or of a
 * piece whose condition changed. The reason is mandatory: the item returns to
 * the shelf through an explicit, auditable decision, never by accident.
 */
export function CancelServiceTaskModal({ task, onClose, onCancelled }: Props) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState<unknown>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionKey, setSubmissionKey] = useState(() => createSubmissionKey('srv-cancel'));

  useEffect(() => {
    if (!task) return;
    setReason('');
    setError(null);
    setIsSubmitting(false);
    setSubmissionKey(createSubmissionKey('srv-cancel'));
  }, [task]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!task || isSubmitting) return;
    setError(null);
    setIsSubmitting(true);
    try {
      const cancelled = cancelServiceTaskCommand(task.id, reason, submissionKey);
      onCancelled(cancelled);
      onClose();
    } catch (reason_: unknown) {
      setIsSubmitting(false);
      setError(reason_);
    }
  };

  return (
    <Modal open={task !== null} onClose={onClose} title="إلغاء عمل الخدمة" className="max-w-xl">
      <form onSubmit={submit} className="space-y-4" noValidate>
        {error !== null ? <UserFacingErrorAlert error={error} fallback="تعذر إلغاء عمل الخدمة." /> : null}

        <p className="rounded-xl bg-stone-50 p-3 text-sm text-slate-600">
          {task ? `سيُعاد العنصر ${task.dressCode} إلى حالته قبل فتح العمل (${task.previousItemStatus ?? 'غير محدد'}).` : ''}
        </p>

        <label className={STACKED_FORM_LABEL_CLASS_NAME}>
          سبب الإلغاء
          <textarea
            required
            rows={3}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            className={STACKED_FORM_FIELD_CLASS_NAME}
            placeholder="مثال: اتضح أن القطعة لا تحتاج غسيلاً."
          />
        </label>

        <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>
            رجوع
          </Button>
          <Button type="submit" variant="danger" disabled={isSubmitting} loading={isSubmitting} loadingLabel="جارٍ الحفظ…">
            إلغاء العمل
          </Button>
        </div>
      </form>
    </Modal>
  );
}
