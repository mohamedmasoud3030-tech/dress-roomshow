import { useEffect, useId, useMemo, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, type FieldErrors } from 'react-hook-form';
import { z } from 'zod';
import { Plus, Trash2 } from 'lucide-react';
import { Button, IconButton } from '../../components/shared/Button';
import { Modal } from '../../components/shared/Modal';
import { UserFacingErrorAlert } from '../../components/shared/UserFacingErrorAlert';
import { ValidationSummary, type ValidationSummaryItem } from '../../components/shared/ValidationSummary';
import { DEFAULT_RESERVATION_DAYS, MAX_NOTES_LENGTH, MIN_ZERO_AMOUNT, MONEY_STEP } from '../../shared/domain/businessRules';
import { FORM_ERROR_CLASS_NAME, FORM_FIELD_CLASS_NAME, FORM_LABEL_CLASS_NAME } from '../../shared/domain/formConstants';
import { getTodayISO } from '../../shared/utils/date';
import { formatMoneyOMR } from '../../shared/utils/format';
import { getCustomers } from '../customers/customer.service';
import type { Customer } from '../customers/customer.types';
import { AddCustomerModal } from '../customers/AddCustomerModal';
import { getDresses } from '../dresses/dress.service';
import { AddDressModal } from '../dresses/AddDressModal';
import { getBookablePieces } from '../dresses/design.service';
import type { Dress } from '../dresses/dress.types';
import { getDressEffectiveRentalPrice, getDressSecurityDepositAmount } from '../dresses/dress.types';
import { SearchableSelect, type SearchableOption } from '../../components/shared/SearchableSelect';
import { createReservationCommand } from '../workflows';
import { getReservationTimeDefaults } from './reservation.service';
import { getBufferSettings } from './reservationConflicts';
import type { Reservation, CreateReservationLineInput } from './reservation.types';
import { createSubmissionKey } from '../../shared/utils/submissionKey';
import { Stepper, useStepper, type Step } from '../../components/shared/Stepper';

const RESERVATION_STEPS: Step[] = [
  { id: 'customer', label: 'العميلة', description: 'اختيار العميلة' },
  { id: 'dates', label: 'التواريخ', description: 'الاستلام والإرجاع' },
  { id: 'items', label: 'القطع', description: 'اختيار الفساتين' },
  { id: 'summary', label: 'الملخص', description: 'المراجعة والدفع' },
];

const reservationSchema = z.object({
  customerId: z.string().min(1, 'اختاري العميلة.'),
  pickupDate: z.string().min(1, 'حددي تاريخ الاستلام.'),
  pickupTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'وقت الاستلام غير صالح.'),
  returnDate: z.string().min(1, 'حددي تاريخ الإرجاع.'),
  returnTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'وقت الإرجاع غير صالح.'),
  notes: z.string().max(MAX_NOTES_LENGTH, `الملاحظات يجب ألا تتجاوز ${MAX_NOTES_LENGTH} حرف.`).optional(),
}).superRefine((values, context) => {
  if (values.pickupDate && values.returnDate && values.returnDate <= values.pickupDate) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['returnDate'],
      message: 'يجب أن يكون تاريخ الإرجاع بعد تاريخ الاستلام.',
    });
  }
});

type ReservationFormValues = z.infer<typeof reservationSchema>;

type LineEntry = {
  key: string;
  dressId: string;
  rentalPrice: string;
  securityDepositAmount: string;
  bookingAdvanceAmount: string;
};

type CreateReservationModalProps = {
  open: boolean;
  onClose: () => void;
  onCreated: (reservation: Reservation) => void;
  prefill?: { customerId?: string; dressCode?: string; pickupDate?: string; returnDate?: string; waitlistEntryId?: string };
};

function addDays(dateValue: string, days: number): string {
  const date = new Date(`${dateValue}T00:00:00`);
  date.setDate(date.getDate() + days);
  return getTodayISO(date);
}

function getDefaultValues(): ReservationFormValues {
  const today = getTodayISO();
  const times = getReservationTimeDefaults();
  return {
    customerId: '',
    pickupDate: today,
    pickupTime: times.pickupTime,
    returnDate: addDays(today, DEFAULT_RESERVATION_DAYS),
    returnTime: times.returnTime,
    notes: '',
  };
}

const reservableDressStatuses = new Set(['available', 'reserved', 'rented']);

function getReservableDresses(): Dress[] {
  return getDresses().filter((dress) => dress.isForRent && reservableDressStatuses.has(dress.status));
}

let lineKeyCounter = 0;
function nextLineKey() { return `line-${++lineKeyCounter}`; }

export function CreateReservationModal({ open, onClose, onCreated, prefill }: CreateReservationModalProps) {
  const fieldId = useId();
  const [submitError, setSubmitError] = useState<unknown>(null);
  const { current: currentStep, next: nextStep, prev: previousStep, goTo: goToStep, reset: resetStep } = useStepper(RESERVATION_STEPS.length);
  const [submissionKey, setSubmissionKey] = useState(() => createSubmissionKey('rsv'));
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [dresses, setDresses] = useState<Dress[]>([]);
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [showAddDress, setShowAddDress] = useState(false);
  const [lines, setLines] = useState<LineEntry[]>([]);
  const bufferDays = getBufferSettings();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    trigger,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ReservationFormValues>({
    resolver: zodResolver(reservationSchema),
    defaultValues: getDefaultValues(),
  });

  const pickupDate = watch('pickupDate');
  const returnDate = watch('returnDate');

  const period = useMemo(
    () => (pickupDate && returnDate && returnDate > pickupDate ? { pickupDate, returnDate } : undefined),
    [pickupDate, returnDate],
  );

  const customerOptions = useMemo<SearchableOption[]>(() => customers.map((customer) => ({
    value: customer.id,
    label: customer.name,
    hint: customer.phone,
    disabled: customer.status === 'blocked',
    disabledReason: 'عميلة محظورة — سوّي حالتها أولاً.',
  })), [customers]);

  const dressOptions = useMemo<SearchableOption[]>(() => {
    const source = period
      ? getBookablePieces('', period).filter((dress) => dress.isForRent && reservableDressStatuses.has(dress.status))
      : dresses;
    return source.map((dress) => ({
      value: dress.id,
      label: `${dress.code} — ${dress.name}`,
      hint: `${dress.size} · ${dress.color}${dress.designCode ? ` · ${dress.designCode}` : ''}`,
      badge: formatMoneyOMR(dress.rentalPrice),
    }));
  }, [dresses, period]);

  // ── Computed totals ──────────────────────────────────────────────────
  const rentalTotal = useMemo(() => {
    return lines.reduce((sum, entry) => {
      const dress = dresses.find((d) => d.id === entry.dressId);
      const rental = Number(entry.rentalPrice) || dress?.rentalPrice || 0;
      return sum + rental;
    }, 0);
  }, [lines, dresses]);

  const securityDepositTotal = useMemo(() => {
    return lines.reduce((sum, entry) => {
      const deposit = Number(entry.securityDepositAmount) || 0;
      return sum + deposit;
    }, 0);
  }, [lines]);

  const bookingAdvanceTotal = useMemo(() => {
    return lines.reduce((sum, entry) => {
      const adv = Number(entry.bookingAdvanceAmount) || 0;
      return sum + adv;
    }, 0);
  }, [lines]);

  const cashToCollectToday = useMemo(() => rentalTotal + securityDepositTotal, [rentalTotal, securityDepositTotal]);
  const remainingRentalAfterBooking = useMemo(() => Math.max(rentalTotal - bookingAdvanceTotal, 0), [rentalTotal, bookingAdvanceTotal]);

  const totalDiscount = useMemo(() => {
    return lines.reduce((sum, entry) => {
      const dress = dresses.find((d) => d.id === entry.dressId);
      if (!dress) return sum;
      const rental = Number(entry.rentalPrice) || 0;
      return sum + Math.max(dress.rentalPrice - rental, 0);
    }, 0);
  }, [lines, dresses]);

  // ── Line management ──────────────────────────────────────────────────
  const addLine = () => {
    setLines((current) => [...current, { key: nextLineKey(), dressId: '', rentalPrice: '', securityDepositAmount: '', bookingAdvanceAmount: '' }]);
  };

  const removeLine = (key: string) => {
    setLines((current) => current.length <= 1 ? current : current.filter((l) => l.key !== key));
  };

  const updateLine = (key: string, updates: Partial<LineEntry>) => {
    setLines((current) => current.map((l) => l.key === key ? { ...l, ...updates } : l));
  };

  // ── Initialize ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    try {
      setCustomers(getCustomers());
      const reservable = getReservableDresses();
      setDresses(reservable);

      const defaults = getDefaultValues();
      const prefilledDress = prefill?.dressCode
        ? reservable.find((dress) => dress.code === prefill.dressCode)
        : undefined;

      reset({
        ...defaults,
        customerId: prefill?.customerId || defaults.customerId,
        pickupDate: prefill?.pickupDate || defaults.pickupDate,
        returnDate: prefill?.returnDate || defaults.returnDate,
      });

      if (prefilledDress) {
        setLines([{
          key: nextLineKey(),
          dressId: prefilledDress.id,
          rentalPrice: String(getDressEffectiveRentalPrice(prefilledDress)),
          securityDepositAmount: String(getDressSecurityDepositAmount(prefilledDress)),
          bookingAdvanceAmount: '0',
        }]);
      } else {
        setLines([]);
      }

      setSubmitError(null);
      setSubmissionKey(createSubmissionKey('rsv'));
      resetStep();
    } catch (error: unknown) {
      setSubmitError(error);
    }
  }, [open, reset, resetStep, prefill?.customerId, prefill?.dressCode, prefill?.pickupDate, prefill?.returnDate]);

  // Auto-fill rental price and security deposit when a dress is selected
  useEffect(() => {
    lines.forEach((entry) => {
      if (!entry.dressId) return;
      const dress = dresses.find((d) => d.id === entry.dressId);
      if (dress) {
        if (!entry.rentalPrice) {
          updateLine(entry.key, { rentalPrice: String(getDressEffectiveRentalPrice(dress)) });
        }
        if (!entry.securityDepositAmount) {
          updateLine(entry.key, { securityDepositAmount: String(getDressSecurityDepositAmount(dress)) });
        }
      }
    });
  }, [lines, dresses]);

  const closeModal = () => {
    setSubmitError(null);
    setLines([]);
    resetStep();
    onClose();
  };

  const hasSelectedLine = lines.some((line) => Boolean(line.dressId));

  const validationItems = [
    errors.customerId?.message ? { id: 'customer', label: 'العميلة', message: errors.customerId.message, onSelect: () => goToStep(0) } : null,
    errors.pickupDate?.message ? { id: 'pickup-date', label: 'تاريخ الاستلام', message: errors.pickupDate.message, onSelect: () => goToStep(1) } : null,
    errors.pickupTime?.message ? { id: 'pickup-time', label: 'وقت الاستلام', message: errors.pickupTime.message, onSelect: () => goToStep(1) } : null,
    errors.returnDate?.message ? { id: 'return-date', label: 'تاريخ الإرجاع', message: errors.returnDate.message, onSelect: () => goToStep(1) } : null,
    errors.returnTime?.message ? { id: 'return-time', label: 'وقت الإرجاع', message: errors.returnTime.message, onSelect: () => goToStep(1) } : null,
    errors.notes?.message ? { id: 'notes', label: 'الملاحظات', message: errors.notes.message, onSelect: () => goToStep(3) } : null,
  ].filter(Boolean) as ValidationSummaryItem[];

  const focusFirstInvalid = () => {
    if (typeof window === 'undefined') return;
    window.setTimeout(() => {
      document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
    }, 0);
  };

  const validateLineEntries = () => {
    if (!hasSelectedLine) {
      setSubmitError('أضيفي قطعة واحدة على الأقل قبل مراجعة الحجز.');
      return false;
    }
    if (lines.some((line) => !line.dressId)) {
      setSubmitError('اختاري قطعة لكل بند أو احذفي البند الفارغ قبل المتابعة.');
      return false;
    }

    const selectedIds = lines.map((line) => line.dressId);
    if (new Set(selectedIds).size !== selectedIds.length) {
      setSubmitError('لا يمكن إضافة القطعة نفسها أكثر من مرة داخل الحجز.');
      return false;
    }

    const invalidLine = lines.find((line) => {
      const dress = dresses.find((item) => item.id === line.dressId);
      const rentalPrice = Number(line.rentalPrice);
      const securityDepositAmount = Number(line.securityDepositAmount);
      const bookingAdvanceAmount = Number(line.bookingAdvanceAmount || 0);
      return !dress
        || line.rentalPrice.trim() === ''
        || !Number.isFinite(rentalPrice)
        || rentalPrice < 0
        || rentalPrice > dress.rentalPrice
        || !Number.isFinite(securityDepositAmount)
        || securityDepositAmount < 0
        || !Number.isFinite(bookingAdvanceAmount)
        || bookingAdvanceAmount < 0;
    });

    if (invalidLine) {
      setSubmitError('راجعي قيمة الإيجار والتأمين ودفعة الحجز؛ يجب أن تكون أرقاماً صحيحة غير سالبة، ولا يتجاوز الإيجار السعر المسجل.');
      return false;
    }
    return true;
  };

  const goToNextStep = async () => {
    setSubmitError(null);

    if (currentStep === 0) {
      if (await trigger('customerId', { shouldFocus: true })) nextStep();
      return;
    }

    if (currentStep === 1) {
      const datesAreValid = await trigger(
        ['pickupDate', 'pickupTime', 'returnDate', 'returnTime'],
        { shouldFocus: true },
      );
      if (!datesAreValid) return;
      if (returnDate <= pickupDate) {
        setSubmitError('يجب أن يكون تاريخ الإرجاع بعد تاريخ الاستلام.');
        return;
      }
      nextStep();
      return;
    }

    if (currentStep === 2) {
      if (validateLineEntries()) nextStep();
    }
  };

  const handleInvalidSubmit = (fieldErrors: FieldErrors<ReservationFormValues>) => {
    if (fieldErrors.customerId) {
      goToStep(0);
      focusFirstInvalid();
      return;
    }
    if (fieldErrors.pickupDate || fieldErrors.pickupTime || fieldErrors.returnDate || fieldErrors.returnTime) {
      goToStep(1);
      focusFirstInvalid();
      return;
    }
    goToStep(3);
    focusFirstInvalid();
  };

  const onSubmit = (formValues: ReservationFormValues) => {
    if (!validateLineEntries()) {
      goToStep(2);
      return;
    }

    const validLines = lines.filter((l) => l.dressId);
    const lineInputs: CreateReservationLineInput[] = validLines.map((entry) => {
      const dress = dresses.find((d) => d.id === entry.dressId);
      const rentalPrice = Number(entry.rentalPrice) || dress?.rentalPrice || 0;
      const securityDepositAmount = Number(entry.securityDepositAmount) || 0;
      const bookingAdvanceAmount = Number(entry.bookingAdvanceAmount) || 0;
      return {
        dressId: entry.dressId,
        pickupDate: formValues.pickupDate,
        pickupTime: formValues.pickupTime,
        returnDate: formValues.returnDate,
        returnTime: formValues.returnTime,
        rentalPrice,
        securityDepositAmount,
        bookingAdvanceAmount,
      };
    });

    try {
      const reservation = createReservationCommand({
        customerId: formValues.customerId,
        pickupDate: formValues.pickupDate,
        pickupTime: formValues.pickupTime,
        returnDate: formValues.returnDate,
        returnTime: formValues.returnTime,
        depositAmount: 0, // legacy compat
        securityDepositAmount: securityDepositTotal,
        bookingAdvanceAmount: bookingAdvanceTotal,
        rentalPrice: 0, // Per-line pricing
        notes: formValues.notes,
        lines: lineInputs,
        waitlistEntryId: prefill?.waitlistEntryId,
        idempotencyKey: submissionKey,
      });
      onCreated(reservation);
      closeModal();
    } catch (error: unknown) {
      setSubmitError(error);
    }
  };

  return (
    <>
    <Modal open={open} onClose={closeModal} title="حجز جديد">
      <form onSubmit={handleSubmit(onSubmit, handleInvalidSubmit)} className="space-y-5">
        <Stepper steps={RESERVATION_STEPS} currentStep={currentStep} onStepChange={goToStep} idPrefix={fieldId} />
        {submitError !== null && (
          <UserFacingErrorAlert error={submitError} fallback="تعذر إنشاء الحجز. حاولي مرة أخرى." />
        )}
        <ValidationSummary items={validationItems} />

        {currentStep === 0 && (
          <section id={`${fieldId}-panel-customer`} aria-labelledby={`${fieldId}-step-customer`}>
            <SearchableSelect
              label="العميلة"
              required
              value={watch('customerId')}
              onChange={(customerId) => setValue('customerId', customerId, { shouldValidate: true })}
              options={customerOptions}
              placeholder="اختاري العميلة"
              searchPlaceholder="ابحثي بالاسم أو رقم الهاتف…"
              error={errors.customerId?.message}
              unavailableText="لا توجد عميلات مسجلات بعد."
            />
            {customers.length === 0 && (
              <Button type="button" variant="secondary" className="mt-4 w-full border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100" onClick={() => setShowAddCustomer(true)}>
                إضافة عميلة الآن والعودة للحجز
              </Button>
            )}
          </section>
        )}

        {currentStep === 1 && (
          <section id={`${fieldId}-panel-dates`} aria-labelledby={`${fieldId}-step-dates`} className="space-y-4">
            <fieldset className="grid gap-4 md:grid-cols-2">
              <legend className="sr-only">فترة الحجز وأوقاتها</legend>
              <div>
                <label htmlFor={`${fieldId}-pickup`} className={FORM_LABEL_CLASS_NAME}>تاريخ الاستلام</label>
                <input id={`${fieldId}-pickup`} type="date" min={getTodayISO()} {...register('pickupDate')} className={FORM_FIELD_CLASS_NAME} />
                {errors.pickupDate && <p className={FORM_ERROR_CLASS_NAME}>{errors.pickupDate.message}</p>}
              </div>
              <div>
                <label htmlFor={`${fieldId}-pickup-time`} className={FORM_LABEL_CLASS_NAME}>وقت الاستلام</label>
                <input id={`${fieldId}-pickup-time`} type="time" {...register('pickupTime')} className={FORM_FIELD_CLASS_NAME} />
                {errors.pickupTime && <p className={FORM_ERROR_CLASS_NAME}>{errors.pickupTime.message}</p>}
              </div>
              <div>
                <label htmlFor={`${fieldId}-return`} className={FORM_LABEL_CLASS_NAME}>تاريخ الإرجاع</label>
                <input id={`${fieldId}-return`} type="date" min={getTodayISO()} {...register('returnDate')} className={FORM_FIELD_CLASS_NAME} />
                {errors.returnDate && <p className={FORM_ERROR_CLASS_NAME}>{errors.returnDate.message}</p>}
              </div>
              <div>
                <label htmlFor={`${fieldId}-return-time`} className={FORM_LABEL_CLASS_NAME}>وقت الإرجاع</label>
                <input id={`${fieldId}-return-time`} type="time" {...register('returnTime')} className={FORM_FIELD_CLASS_NAME} />
                {errors.returnTime && <p className={FORM_ERROR_CLASS_NAME}>{errors.returnTime.message}</p>}
              </div>
            </fieldset>

            <p className="rounded-xl bg-stone-50 px-3 py-2 text-xs leading-5 text-slate-600">
              يتم حجز مدة التجهيز قبل التسليم ({bufferDays.preparationDaysBeforePickup} يوم) ومدة التنظيف بعد الإرجاع ({bufferDays.cleaningDaysAfterReturn} يوم) تلقائياً، ولا يمكن حجز نفس العنصر خلالها.
            </p>
          </section>
        )}

        {/* ── Contract Lines ─────────────────────────────────────────────── */}
        {currentStep === 2 && (
          <section id={`${fieldId}-panel-items`} aria-labelledby={`${fieldId}-step-items`} className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800">القطع</h3>
            <Button type="button" size="sm" onClick={addLine}>
              <Plus aria-hidden="true" className="h-3.5 w-3.5" />
              إضافة قطعة
            </Button>
          </div>

          {lines.length === 0 && (
            <p className="rounded-xl border border-dashed border-slate-300 bg-stone-50 p-4 text-center text-sm text-slate-500">
              {dresses.length === 0 ? 'لا توجد قطع مؤهلة للإيجار بعد.' : 'لم يتم إضافة قطع بعد. اضغطي "إضافة قطعة" لبدء العقد.'}
            </p>
          )}
          {dresses.length === 0 && (
            <Button type="button" variant="secondary" className="w-full border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100" onClick={() => setShowAddDress(true)}>
              إضافة قطعة مخزون الآن والعودة للحجز
            </Button>
          )}

          {lines.map((entry) => {
            const selectedDress = dresses.find((d) => d.id === entry.dressId);
            const discount = selectedDress ? Math.max(selectedDress.rentalPrice - (Number(entry.rentalPrice) || 0), 0) : 0;

            return (
              <div key={entry.key} className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <SearchableSelect
                      label="القطعة"
                      required
                      value={entry.dressId}
                      onChange={(dressId) => {
                        const dress = dresses.find((d) => d.id === dressId);
                        updateLine(entry.key, {
                          dressId,
                          rentalPrice: dress ? String(getDressEffectiveRentalPrice(dress)) : '',
                          securityDepositAmount: dress ? String(getDressSecurityDepositAmount(dress)) : '0',
                          bookingAdvanceAmount: '0',
                        });
                      }}
                      options={dressOptions}
                      placeholder="اختاري القطعة"
                      searchPlaceholder="ابحثي بالكود أو الاسم…"
                      unavailableText="لا توجد فساتين مؤهلة للإيجار حالياً."
                    />
                  </div>
                  {lines.length > 1 && (
                    <IconButton
                      type="button"
                      label="حذف القطعة"
                      variant="quiet"
                      onClick={() => removeLine(entry.key)}
                      className="text-slate-500 hover:bg-rose-50 hover:text-rose-700"
                    >
                      <Trash2 aria-hidden="true" className="h-4 w-4" />
                    </IconButton>
                  )}
                </div>

                {selectedDress && (
                  <div className="grid gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm sm:grid-cols-3">
                    <div>
                      <p className="text-xs font-bold text-amber-800">سعر الإيجار</p>
                      <p className="mt-1 font-bold text-slate-950">{formatMoneyOMR(selectedDress.rentalPrice)}</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-amber-800">اللون</p>
                      <p className="mt-1 font-bold text-slate-950">{selectedDress.color}</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-amber-800">المقاس</p>
                      <p className="mt-1 font-bold text-slate-950">{selectedDress.size}</p>
                    </div>
                  </div>
                )}

                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <label className={FORM_LABEL_CLASS_NAME}>قيمة الإيجار المتفق عليها (ر.ع) - المتبقي من الإيجار</label>
                    <input
                      type="number"
                      min={MIN_ZERO_AMOUNT}
                      max={selectedDress?.rentalPrice}
                      step={MONEY_STEP}
                      inputMode="decimal"
                      value={entry.rentalPrice}
                      onChange={(event) => updateLine(entry.key, { rentalPrice: event.target.value })}
                      className={FORM_FIELD_CLASS_NAME}
                    />
                    {discount > 0 && (
                      <p className="mt-1 text-xs font-bold text-amber-700">خصم: {formatMoneyOMR(discount)}</p>
                    )}
                  </div>
                  <div>
                    <label className={FORM_LABEL_CLASS_NAME}>دفعة الحجز (ر.ع)</label>
                    <input
                      type="number"
                      min={MIN_ZERO_AMOUNT}
                      step={MONEY_STEP}
                      inputMode="decimal"
                      value={entry.bookingAdvanceAmount}
                      onChange={(event) => updateLine(entry.key, { bookingAdvanceAmount: event.target.value })}
                      className={FORM_FIELD_CLASS_NAME}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className={FORM_LABEL_CLASS_NAME}>التأمين المسترد (ر.ع)</label>
                    <input
                      type="number"
                      min={MIN_ZERO_AMOUNT}
                      step={MONEY_STEP}
                      inputMode="decimal"
                      value={entry.securityDepositAmount}
                      onChange={(event) => updateLine(entry.key, { securityDepositAmount: event.target.value })}
                      className={FORM_FIELD_CLASS_NAME}
                    />
                  </div>
                </div>
              </div>
            );
          })}
          </section>
        )}

        {currentStep === 3 && (
          <section id={`${fieldId}-panel-summary`} aria-labelledby={`${fieldId}-step-summary`} className="space-y-4">
            <label className={FORM_LABEL_CLASS_NAME}>
              ملاحظات
              <textarea rows={3} maxLength={MAX_NOTES_LENGTH} {...register('notes')} className={FORM_FIELD_CLASS_NAME} placeholder="ملاحظات اختيارية عن التجهيز أو الاستلام" />
              {errors.notes && <p className={FORM_ERROR_CLASS_NAME}>{errors.notes.message}</p>}
            </label>

            {hasSelectedLine && (
              <div className="space-y-2 rounded-xl bg-slate-950 p-4 text-white">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-300">إجمالي الإيجار</span>
                  <span className="font-bold">{formatMoneyOMR(rentalTotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-300">دفعة الحجز</span>
                  <span className="font-bold text-emerald-300">{formatMoneyOMR(bookingAdvanceTotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-300">المتبقي من الإيجار بعد دفعة الحجز</span>
                  <span className="font-bold text-amber-300">{formatMoneyOMR(remainingRentalAfterBooking)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-300">التأمين المسترد (التزام)</span>
                  <span className="font-bold text-violet-300">{formatMoneyOMR(securityDepositTotal)}</span>
                </div>
                <div className="flex justify-between border-t border-white/10 pt-2 text-sm font-extrabold">
                  <span>إجمالي المبلغ النقدي للتحصيل اليوم (إيجار + تأمين)</span>
                  <span className="text-amber-300">{formatMoneyOMR(cashToCollectToday)}</span>
                </div>
                {totalDiscount > 0 && (
                  <span className="block text-xs font-medium text-amber-300">خصم إجمالي: {formatMoneyOMR(totalDiscount)}</span>
                )}
                <p className="text-[11px] leading-4 text-slate-400">التأمين المسترد التزام قابل للاسترداد ولا يُحتسب ضمن الإيراد. دفعة الحجز تقلل المتبقي من الإيجار مرة واحدة ولا تدخل في تسوية التأمين.</p>
              </div>
            )}
          </section>
        )}

        <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={closeModal}>
            إلغاء
          </Button>
          {currentStep > 0 && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setSubmitError(null);
                previousStep();
              }}
            >
              السابق
            </Button>
          )}
          {currentStep < RESERVATION_STEPS.length - 1 ? (
            <Button
              type="button"
              onClick={() => void goToNextStep()}
              disabled={currentStep === 0 && customers.length === 0}
            >
              التالي
            </Button>
          ) : (
            <Button
              type="submit"
              loading={isSubmitting}
              loadingLabel="جارٍ الحفظ..."
              disabled={!hasSelectedLine}
            >
              إنشاء الحجز
            </Button>
          )}
        </div>
      </form>
    </Modal>
    <AddCustomerModal
      open={showAddCustomer}
      onClose={() => setShowAddCustomer(false)}
      onCreated={(customer) => {
        setCustomers(getCustomers());
        setValue('customerId', customer.id, { shouldValidate: true });
        setShowAddCustomer(false);
      }}
    />
    <AddDressModal
      open={showAddDress}
      onClose={() => setShowAddDress(false)}
      onCreated={(dress) => {
        setDresses(getReservableDresses());
        setLines([{ key: nextLineKey(), dressId: dress.id, rentalPrice: String(getDressEffectiveRentalPrice(dress)), securityDepositAmount: String(getDressSecurityDepositAmount(dress)), bookingAdvanceAmount: '0' }]);
        setShowAddDress(false);
      }}
    />
    </>
  );
}
