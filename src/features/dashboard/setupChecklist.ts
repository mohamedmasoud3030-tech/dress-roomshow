import { getAccessories } from '../accessories/accessory.service';
import { getCustomers } from '../customers/customer.service';
import { getDresses } from '../dresses/dress.service';
import { getReservations } from '../reservations/reservation.service';

/**
 * First-run setup checklist («جاهزية المعرض»).
 *
 * The empty dashboard already *describes* the three first steps as prose, but
 * once the operator has added one piece the page stops being "empty" and the
 * guidance disappears with it. This derivation keeps the momentum: progress is
 * computed from the existing operational stores, so it can never disagree with
 * reality and needs no stored state of its own. Dismissal is a device-local
 * UI preference only (never part of backups).
 */

export const SETUP_CHECKLIST_DISMISS_KEY = 'dress-roomshow:setup-checklist-dismissed:v1';

export type SetupChecklistStepKey = 'inventory' | 'customer' | 'reservation';

export type SetupChecklistStep = {
  key: SetupChecklistStepKey;
  /** The pending instruction, verb-first for the operator. */
  label: string;
  /** What the step reads as once satisfied. */
  doneLabel: string;
  /** Where the operator goes to complete it. */
  to: string;
  done: boolean;
};

export type SetupChecklist = {
  steps: readonly SetupChecklistStep[];
  completed: number;
  total: 3;
  isComplete: boolean;
};

export function getSetupChecklist(): SetupChecklist {
  const hasPieces = getDresses().length > 0 || getAccessories().length > 0;
  const hasCustomers = getCustomers().length > 0;
  const hasReservations = getReservations().length > 0;

  const steps: readonly SetupChecklistStep[] = [
    { key: 'inventory', label: 'أضيفي أول قطعة إلى المخزون', doneLabel: 'المخزون بدأ', to: '/inventory', done: hasPieces },
    { key: 'customer', label: 'سجلي أول عميلة', doneLabel: 'سجل العميلات بدأ', to: '/customers', done: hasCustomers },
    { key: 'reservation', label: 'أنشئي أول حجز', doneLabel: 'أول حجز تم', to: '/reservations?new=1', done: hasReservations },
  ];

  const completed = steps.filter((step) => step.done).length;
  return { steps, completed, total: 3, isComplete: completed === 3 };
}
