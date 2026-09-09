import { generateId, generateNumber, readCollection, writeCollection } from '../../services/localDatabase';
import { getTodayISO, isValidTime } from '../../shared/utils/date';
import { releaseAccessoriesForReservation } from '../accessories/reservationAccessory.service';
import { recordAudit } from '../audit/audit.service';
import { getCustomers } from '../customers/customer.service';
import { getDresses } from '../dresses/dress.service';
import { getDressEffectiveRentalPrice } from '../dresses/dress.types';
import { assertReservationCanBeCancelled } from '../integrity/integrity.service';
import { getAppPreferences } from '../preferences/preferences.service';
import {
  ACTIVE_RESERVATION_STATUSES,
  assertNoConflicts,
  findItemConflicts,
} from './reservationConflicts';
import {
  buildLineFromInput,
  calculateLinesTotal,
  checkLineConflicts,
  assertNoLineConflicts,
  getReservationLines,
  calculateLinesRentalPrice,
  calculateLinesSecurityDeposit,
  calculateLinesBookingAdvance,
} from './contractLineHelpers';
import type {
  AvailabilityCheck,
  Reservation,
  ReservationFilters,
  ReservationSummary,
  CreateReservationInput,
  ContractLine,
} from './reservation.types';
import { createSearchMatcher } from '../../shared/utils/search';
import {
  RESERVATIONS_COLLECTION,
  normalizeTimeInput,
  remaining,
  reservableDressStatuses,
} from './reservationInternal';

const activeStatuses = ACTIVE_RESERVATION_STATUSES;
function hydrateOverdueStatus(reservation: Reservation): Reservation {
  // For multi-item reservations, check if any line has a return date in the past
  // and is still out (delivered but not returned)
  const lines = getReservationLines(reservation);
  const hasOverdueLine = lines.some(
    (line) => line.returnDate < getTodayISO()
      && (line.deliveryStatus === 'delivered'),
  );

  if (hasOverdueLine && ['pending', 'confirmed', 'delivered'].includes(reservation.status)) {
    return { ...reservation, status: 'overdue' };
  }

  // A booking that was never handed over is a no-show candidate, not an
  // overdue return. Keep it pending/confirmed so the operator can cancel it and
  // release the item instead of trapping it in a state that only return can close.
  if (reservation.returnDate < getTodayISO() && reservation.status === 'delivered') {
    return { ...reservation, status: 'overdue' };
  }

  return reservation;
}
export function getReservationBufferDays(): number { return getAppPreferences().reservationBufferDays; }
export function getReservationTimeDefaults(): { pickupTime: string; returnTime: string } { const preferences = getAppPreferences(); return { pickupTime: preferences.defaultPickupTime, returnTime: preferences.defaultReturnTime }; }
/** Effective pickup/return times, filling the configured defaults when unset. */
export function getReservationTimes(reservation: Reservation): { pickupTime: string; returnTime: string } { const defaults = getReservationTimeDefaults(); return { pickupTime: isValidTime(reservation.pickupTime) ? reservation.pickupTime : defaults.pickupTime, returnTime: isValidTime(reservation.returnTime) ? reservation.returnTime : defaults.returnTime }; }
export function getReservations(): Reservation[] { return readCollection<Reservation>(RESERVATIONS_COLLECTION, []).map(hydrateOverdueStatus); }

export function filterReservations(reservations: Reservation[], filters: ReservationFilters): Reservation[] {
  const matchesQuery = createSearchMatcher(filters.search); const today = getTodayISO();
  return reservations.filter((item) => {
    // Search matches across all line items in addition to top-level fields
    const lines = getReservationLines(item);
    const lineCodes = lines.map((line) => line.dressCodeSnapshot);
    const lineNames = lines.map((line) => line.dressNameSnapshot);
    const searchFields = [item.reservationNumber, item.customerName, item.customerPhone, item.dressCode, item.dressName, ...lineCodes, ...lineNames];
    return matchesQuery(searchFields)
      && (filters.status === 'all' || item.status === filters.status)
      && (filters.timing === 'all' || (filters.timing === 'today' && (item.pickupDate === today || item.returnDate === today)) || (filters.timing === 'upcoming' && item.pickupDate > today) || (filters.timing === 'overdue' && item.status === 'overdue'));
  });
}
export function summarizeReservations(reservations: Reservation[]): ReservationSummary { const today = getTodayISO(); return { total: reservations.length, active: reservations.filter((item) => activeStatuses.has(item.status)).length, today: reservations.filter((item) => item.pickupDate === today || item.returnDate === today).length, overdue: reservations.filter((item) => item.status === 'overdue').length }; }
/**
 * Availability is answered by the central conflict module, so the reservation
 * screen, the calendar, the service queue and the write path can never disagree.
 */
export function hasReservationOverlap(check: AvailabilityCheck, reservations: Reservation[]): boolean { return findItemConflicts(check, reservations).length > 0; }

export function createReservation(input: CreateReservationInput): Reservation {
  const customer = getCustomers().find((item) => item.id === input.customerId);
  const today = getTodayISO();
  if (!customer) throw new Error('العميلة المحددة غير موجودة.');
  if (customer.status === 'blocked') throw new Error('لا يمكن إنشاء حجز لعميلة محظورة قبل تسوية حالتها.');

  const pickupTime = normalizeTimeInput(input.pickupTime, 'وقت الاستلام');
  const returnTime = normalizeTimeInput(input.returnTime, 'وقت الإرجاع');

  if (!input.pickupDate || !input.returnDate) throw new Error('حددي تاريخ الاستلام والإرجاع.');
  if (input.pickupDate < today) throw new Error('تاريخ الاستلام لا يمكن أن يكون في الماضي.');
  if (input.returnDate <= input.pickupDate) throw new Error('تاريخ الإرجاع يجب أن يكون بعد تاريخ الاستلام.');

  const reservations = getReservations();

  // ── Multi-item path ──────────────────────────────────────────────────
  if (input.lines && input.lines.length > 0) {
    const defaults = { pickupDate: input.pickupDate, pickupTime, returnDate: input.returnDate, returnTime };
    const lines = input.lines.map((lineInput) => buildLineFromInput(lineInput, defaults));

    // Check conflicts for every line
    const conflictResults = checkLineConflicts(input.lines, defaults, reservations);
    assertNoLineConflicts(conflictResults);

    const totalAmount = calculateLinesTotal(lines);
    const rentalTotal = calculateLinesRentalPrice(lines);
    const securityTotal = calculateLinesSecurityDeposit(lines);
    const bookingAdvanceTotal = calculateLinesBookingAdvance(lines);

    const reservation: Reservation = {
      id: generateId(),
      reservationNumber: generateNumber('RSV'),
      customerId: customer.id,
      customerNameSnapshot: customer.name,
      customerPhoneSnapshot: customer.phone,
      // Top-level fields synced from the first line for backward compatibility
      inventoryItemId: lines[0].inventoryItemId,
      dressCodeSnapshot: lines[0].dressCodeSnapshot,
      dressNameSnapshot: lines[0].dressNameSnapshot,
      customerName: customer.name,
      customerPhone: customer.phone,
      dressCode: lines[0].dressCodeSnapshot,
      dressName: lines[0].dressNameSnapshot,
      pickupDate: input.pickupDate,
      pickupTime,
      returnDate: input.returnDate,
      returnTime,
      status: 'confirmed',
      rentalPrice: lines[0].rentalPrice,
      listRentalPrice: lines[0].listRentalPrice,
      depositAmount: lines[0].securityDepositAmount ?? lines[0].depositAmount, // legacy compat: depositAmount deprecated, use securityDepositAmount
      securityDepositAmount: securityTotal,
      bookingAdvanceAmount: bookingAdvanceTotal,
      bookingAdvanceCollectedAmount: 0,
      rentalCollectedAmount: 0,
      securityDepositCollectedAmount: 0,
      securityDepositRefundedAmount: 0,
      securityDepositRetainedAmount: 0,
      totalAmount,
      paidAmount: 0,
      remainingAmount: rentalTotal, // canonical: rental only
      assessedFeesAmount: 0,
      refundedAmount: 0,
      settledDepositAmount: 0,
      retainedDepositAmount: 0,
      rentalRefundedAmount: 0,
      notes: input.notes?.trim() || undefined,
      lines,
    };

    // Recalculate remaining via canonical logic
    const withRemaining = { ...reservation, remainingAmount: remaining(reservation) };
    writeCollection(RESERVATIONS_COLLECTION, [withRemaining, ...reservations]);
    recordAudit({
      action: 'create',
      entityType: 'reservation',
      entityId: reservation.id,
      summary: `تم إنشاء الحجز ${reservation.reservationNumber} بعدد ${lines.length} بنود.`,
      nextValues: { pickupDate: reservation.pickupDate, returnDate: reservation.returnDate, totalAmount, rentalTotal, securityTotal, lineCount: lines.length, items: lines.map((line) => line.dressCodeSnapshot) },
    });
    return withRemaining;
  }

  // ── Single-item path (backward compatible) ───────────────────────────
  if (!input.dressId) throw new Error('اختاري عنصراً واحداً على الأقل.');

  const dress = getDresses().find((item) => item.id === input.dressId);
  if (!dress) throw new Error('العنصر المحدد غير موجود.');
  if (!dress.isForRent || !reservableDressStatuses.has(dress.status)) throw new Error('العنصر غير مؤهل للإيجار حاليا.');
  if (!Number.isFinite(input.depositAmount) || input.depositAmount < 0) throw new Error('قيمة العربون غير صالحة.'); // legacy compat

  // Central conflict guard
  assertNoConflicts(findItemConflicts({ inventoryItemId: dress.id, dressCode: dress.code, pickupDate: input.pickupDate, returnDate: input.returnDate }, reservations));
  const listRentalPrice = dress.rentalPrice;
  // A piece on sale is rented at its discounted price unless the owner agrees
  // something else with the customer; the contract then prints both numbers.
  const agreedRentalPrice = input.rentalPrice ?? getDressEffectiveRentalPrice(dress);
  if (!Number.isFinite(agreedRentalPrice) || agreedRentalPrice < 0) throw new Error('قيمة الإيجار المتفق عليها غير صالحة.');
  if (agreedRentalPrice > listRentalPrice) throw new Error('قيمة الإيجار المتفق عليها لا يمكن أن تتجاوز السعر المسجل للعنصر.');

  // Canonical handling: securityDepositAmount prefers new field, fallback to legacy depositAmount
  const securityDepositAmount = input.securityDepositAmount ?? input.depositAmount ?? 0; // legacy compat
  const bookingAdvanceAmount = input.bookingAdvanceAmount ?? 0;
  const totalAmount = agreedRentalPrice + securityDepositAmount;

  // Create a single line for consistency
  const line: ContractLine = {
    id: generateId(),
    inventoryItemId: dress.id,
    dressCodeSnapshot: dress.code,
    dressNameSnapshot: dress.name,
    pickupDate: input.pickupDate,
    pickupTime,
    returnDate: input.returnDate,
    returnTime,
    rentalPrice: agreedRentalPrice,
    listRentalPrice,
    depositAmount: securityDepositAmount, // legacy compat
    securityDepositAmount,
    bookingAdvanceAmount,
    legacyDepositAmount: input.depositAmount,
    deliveryStatus: 'pending_delivery',
    lateFee: 0,
    damageFee: 0,
    notes: input.notes?.trim() || undefined,
  };

  const reservation: Reservation = {
    id: generateId(),
    reservationNumber: generateNumber('RSV'),
    customerId: customer.id,
    inventoryItemId: dress.id,
    customerNameSnapshot: customer.name,
    customerPhoneSnapshot: customer.phone,
    dressCodeSnapshot: dress.code,
    dressNameSnapshot: dress.name,
    customerName: customer.name,
    customerPhone: customer.phone,
    dressCode: dress.code,
    dressName: dress.name,
    pickupDate: input.pickupDate,
    pickupTime,
    returnDate: input.returnDate,
    returnTime,
    status: 'confirmed',
    rentalPrice: agreedRentalPrice,
    listRentalPrice,
    depositAmount: securityDepositAmount, // legacy compat
    securityDepositAmount,
    bookingAdvanceAmount,
    bookingAdvanceCollectedAmount: 0,
    rentalCollectedAmount: 0,
    securityDepositCollectedAmount: 0,
    securityDepositRefundedAmount: 0,
    securityDepositRetainedAmount: 0,
    legacyDepositAmount: input.depositAmount,
    totalAmount,
    paidAmount: 0,
    remainingAmount: agreedRentalPrice,
    assessedFeesAmount: 0,
    refundedAmount: 0,
    settledDepositAmount: 0,
    retainedDepositAmount: 0,
    rentalRefundedAmount: 0,
    notes: input.notes?.trim() || undefined,
    lines: [line],
  };

  const withRemaining = { ...reservation, remainingAmount: remaining(reservation) };
  writeCollection(RESERVATIONS_COLLECTION, [withRemaining, ...reservations]);
  recordAudit({ action: 'create', entityType: 'reservation', entityId: reservation.id, summary: `تم إنشاء الحجز ${reservation.reservationNumber} للفستان ${reservation.dressCode}.`, nextValues: { pickupDate: reservation.pickupDate, returnDate: reservation.returnDate, totalAmount, rentalPrice: agreedRentalPrice, securityDepositAmount } });
  return withRemaining;
}

export type CancelReservationInput = {
  id: string;
  cancellationReason?: string;
  cancellationPolicyAck?: boolean;
};

export function cancelReservation(idOrInput: string | CancelReservationInput): void {
  const input = typeof idOrInput === 'string' ? { id: idOrInput } : idOrInput;
  const id = input.id;
  const reservations = getReservations(); 
  const reservation = reservations.find((item) => item.id === id);
  if (!reservation) throw new Error('الحجز غير موجود.');
  if (reservation.status === 'cancelled') return;
  assertReservationCanBeCancelled(reservation);
  
  // Cancellation policy: booking advance is non-refundable unless documented policy with approval
  // If cancellation reason contains policy acknowledgment, allow but booking advance remains as revenue
  const now = new Date().toISOString();
  const reason = input.cancellationReason?.trim();
  const policyAck = input.cancellationPolicyAck ?? false;
  const collectedBookingAdvance = reservation.bookingAdvanceCollectedAmount ?? 0;
  if (collectedBookingAdvance > 0) {
    if (!reason) throw new Error('سبب الإلغاء مطلوب عند وجود دفعة حجز محصلة.');
    if (!policyAck) {
      throw new Error('يجب الإقرار بسياسة دفعة الحجز غير المستردة قبل إلغاء هذا الحجز.');
    }
  }

  // The approved default policy keeps a collected booking advance as recognised
  // rental revenue. No refund movement is invented by cancellation.
  const nextReservation: Reservation = {
    ...reservation,
    status: 'cancelled' as const,
    cancellationReason: reason,
    cancelledAt: now,
    cancellationPolicyAck: policyAck,
  };

  writeCollection(RESERVATIONS_COLLECTION, reservations.map((item) => item.id === id ? nextReservation : item));
  // A cancelled reservation releases its item and every accessory that never left the showroom.
  releaseAccessoriesForReservation(reservation.reservationNumber);
  recordAudit({ 
    action: 'cancel', 
    entityType: 'reservation', 
    entityId: reservation.id, 
    summary: `تم إلغاء الحجز ${reservation.reservationNumber}. السبب: ${reason || 'غير محدد'}. سياسة دفعة الحجز غير مستردة: ${policyAck ? 'تم الإقرار' : 'غير مقر'}.`, 
    previousValues: { status: reservation.status }, 
    nextValues: { status: 'cancelled', cancellationReason: reason, cancellationPolicyAck: policyAck, cancelledAt: now } 
  });

}

export function getReservationsNeedingFinancialClassification(): Reservation[] {
  return getReservations().filter((r) => r.needsFinancialClassification);
}
