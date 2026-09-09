import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, Circle, ListChecks, X } from 'lucide-react';
import { Button } from '../../components/shared/Button';
import { AMBER_FOCUS_RING_CLASS_NAME } from '../../shared/domain/formConstants';
import { getBrowserLocalStorage } from '@platform/storage';
import { getSetupChecklist, SETUP_CHECKLIST_DISMISS_KEY } from './setupChecklist';

/**
 * «جاهزية المعرض» — the three-step setup checklist (UX-M1).
 *
 * Shown until every step is genuinely done (derived live from the stores) or
 * the operator dismisses it; dismissal is device-local and survives reloads,
 * exactly like other UI preferences — it is never part of backups or sync.
 */
export function SetupChecklistCard() {
  const checklist = useMemo(() => getSetupChecklist(), []);
  const [dismissed, setDismissed] = useState(
    () => getBrowserLocalStorage()?.getItem(SETUP_CHECKLIST_DISMISS_KEY) === '1',
  );

  if (checklist.isComplete || dismissed) return null;

  const dismiss = () => {
    getBrowserLocalStorage()?.setItem(SETUP_CHECKLIST_DISMISS_KEY, '1');
    setDismissed(true);
  };

  return (
    <article aria-label="جاهزية المعرض" className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <ListChecks aria-hidden="true" className="h-6 w-6 text-amber-700" />
          <div>
            <h2 className="text-lg font-bold text-slate-950">جاهزية المعرض</h2>
            <p className="mt-0.5 text-sm text-slate-600">
              أتممتِ {checklist.completed} من {checklist.total} خطوات — ثلاث خطوات فقط وبياناتك تبدأ تعمل.
            </p>
          </div>
        </div>
        <Button type="button" variant="quiet" size="sm" onClick={dismiss} aria-label="إخفاء تلميحات البداية" className="text-slate-600 hover:bg-amber-100">
          <X aria-hidden="true" className="h-4 w-4" />
          إخفاء
        </Button>
      </div>

      <ol className="mt-4 space-y-2">
        {checklist.steps.map((step) => (
          <li key={step.key}>
            {step.done ? (
              <p className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-900">
                <CheckCircle2 aria-hidden="true" className="h-5 w-5 text-emerald-600" />
                {step.doneLabel}
                <span className="sr-only">(مكتملة)</span>
              </p>
            ) : (
              <Link
                to={step.to}
                className={`flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-bold text-slate-800 ring-1 ring-amber-200 transition hover:bg-amber-50 ${AMBER_FOCUS_RING_CLASS_NAME}`}
              >
                <Circle aria-hidden="true" className="h-5 w-5 text-amber-500" />
                {step.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </article>
  );
}
