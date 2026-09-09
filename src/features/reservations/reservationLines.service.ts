/**
 * The lines of a contract: adding a piece, changing it, handing it over,
 * taking it back.
 *
 * A contract is rarely one dress. Each piece carries its own dates and its own
 * money, so the operations that move a single line live here instead of being
 * lost inside the reservation service. Every one of them writes through the
 * shared `persist` helper, so a line change and a contract change cannot
 * disagree about what is still outstanding.
 */

import { getTodayISO } from '../../shared/utils/date';
import { recordAudit } from '../audit/audit.service';
import { getDresses, markDressRented, updateDressStatus } from '../dresses/dress.service';
import { getDressEffectiveRentalPrice, getDressSecurityDepositAmount } from '../dresses/dress.types';
import { assertNoConflicts, findAccessoryConflicts, findItemConflicts } from './reservationConflicts';
import { getReservationAccessories } from '../accessories/reservationAccessory.service';
import {
  buildLineFromInput,
  deriveReservationStatus,
  syncTopLevelFromLines,
} from './contractLineHelpers';
import { getReservationTimeDefaults, getReservations } from './reservation.service';
import {
  allowedReturnItemStatuses,
  assertLineDeliveryPaymentGate,
  assertNoPostedMoneyForContractValueChange,
  normalizeTimeInput,
  persist,
  reservableDressStatuses,
  validateOperationDateTime,
} from './reservationInternal';
import type {
  AddContractLineInput,
  ContractLine,
  LineDeliveryInput,
  CreateReservationLineInput,
  LineReturnInput,
  RemoveContractLineInput,
  Reservation,
  RescheduleReservationInput,
  UpdateContractLineInput,
} from './reservation.types';
import {
  getLineBookingAdvanceAmount,
  getLineSecurityDepositAmount,
  getReservationSecurityDepositAmount,
} from './reservation.types';

/**
 * Adds a line (item) to an existing reservation.
 */
export function addContractLine(input: AddContractLineInput): Reservation {
  const reservations = getReservations();
  const reservation = reservations.find((item) => item.reservationNumber === input.reservationNumber);
  if (!reservation) throw new Error('الحجز المحدد غير موجود.');
  if (reservation.status === 'cancelled' || reservation.status === 'returned') throw new Error('لا يمكن إضافة بنود إلى حجز مغلق.');

  const timeDefaults = getReservationTimeDefaults();
  const defaults = {
    pickupDate: input.pickupDate ?? reservation.pickupDate,
    pickupTime: input.pickupTime ?? timeDefaults.pickupTime,
    returnDate: input.returnDate ?? reservation.returnDate,
    returnTime: input.returnTime ?? timeDefaults.returnTime,
  };

  const lineInput: CreateReservationLineInput = {
    dressId: input.dressId,
    pickupDate: defaults.pickupDate,
    pickupTime: defaults.pickupTime,
    returnDate: defaults.returnDate,
    returnTime: defaults.returnTime,
    rentalPrice: input.rentalPrice,
    depositAmount: input.depositAmount, // legacy compat input
    securityDepositAmount: input.securityDepositAmount,
    bookingAdvanceAmount: input.bookingAdvanceAmount,
    notes: input.notes,
  };

  const line = buildLineFromInput(lineInput, defaults);

  // Check conflicts for the new line
  assertNoConflicts(findItemConflicts({
    inventoryItemId: line.inventoryItemId,
    dressCode: line.dressCodeSnapshot,
    pickupDate: line.pickupDate,
    returnDate: line.returnDate,
    excludeReservationNumber: reservation.reservationNumber,
  }, reservations));

  const existingLines = reservation.lines ?? [];
  const updatedLines = [...existingLines, line];
  const updated = syncTopLevelFromLines({ ...reservation, lines: updatedLines });

  recordAudit({
    action: 'update',
    entityType: 'reservation',
    entityId: reservation.id,
    summary: `تمت إضافة البند ${line.dressCodeSnapshot} إلى الحجز ${reservation.reservationNumber}.`,
    previousValues: { lineCount: existingLines.length },
    nextValues: {
      lineId: line.id,
      dressCode: line.dressCodeSnapshot,
      pickupDate: line.pickupDate,
      returnDate: line.returnDate,
      rentalPrice: line.rentalPrice,
      securityDepositAmount: getLineSecurityDepositAmount(line),
      bookingAdvanceAmount: getLineBookingAdvanceAmount(line),
      lineCount: updatedLines.length,
    },
  });
  return persist(reservations, updated);
}

/**
 * Removes a line from an existing reservation.
 *
 * Cannot remove a line that has been delivered or has payments attached.
 */
export function removeContractLine(input: RemoveContractLineInput): Reservation {
  const reservations = getReservations();
  const reservation = reservations.find((item) => item.reservationNumber === input.reservationNumber);
  if (!reservation) throw new Error('الحجز المحدد غير موجود.');
  if (reservation.status === 'cancelled' || reservation.status === 'returned') throw new Error('لا يمكن حذف بنود من حجز مغلق.');

  const lines = reservation.lines ?? [];
  const line = lines.find((l) => l.id === input.lineId);
  if (!line) throw new Error('البند المحدد غير موجود في الحجز.');

  if (line.deliveryStatus === 'delivered' || line.deliveryStatus === 'late') {
    throw new Error('لا يمكن حذف بند تم تسليمه. سجّلي الإرجاع أولاً.');
  }
  assertNoPostedMoneyForContractValueChange(reservation);

  if (lines.length <= 1) {
    throw new Error('لا يمكن حذف البند الأخير. استخدمي إلغاء الحجز بدلاً من ذلك.');
  }

  const updatedLines = lines.filter((l) => l.id !== input.lineId);
  const updated = syncTopLevelFromLines({ ...reservation, lines: updatedLines });

  recordAudit({
    action: 'update',
    entityType: 'reservation',
    entityId: reservation.id,
    summary: `تم حذف البند ${line.dressCodeSnapshot} من الحجز ${reservation.reservationNumber}.`,
    previousValues: { lineId: line.id, dressCode: line.dressCodeSnapshot },
    nextValues: { lineCount: updatedLines.length },
  });

  return persist(reservations, updated);
}

/**
 * Updates a line's dates, pricing, or notes.
 */
export function updateContractLine(input: UpdateContractLineInput): Reservation {
  const reservations = getReservations();
  const reservation = reservations.find((item) => item.reservationNumber === input.reservationNumber);
  if (!reservation) throw new Error('الحجز المحدد غير موجود.');
  if (reservation.status === 'cancelled' || reservation.status === 'returned') throw new Error('لا يمكن تعديل بنود حجز مغلق.');

  const lines = reservation.lines ?? [];
  const lineIndex = lines.findIndex((l) => l.id === input.lineId);
  if (lineIndex === -1) throw new Error('البند المحدد غير موجود في الحجز.');

  const line = lines[lineIndex];

  // If the line is delivered, only allow date/notes changes, not pricing
  if ((line.deliveryStatus === 'delivered' || line.deliveryStatus === 'late') && (input.rentalPrice !== undefined || input.depositAmount !== undefined || input.securityDepositAmount !== undefined || input.bookingAdvanceAmount !== undefined)) { // legacy compat check
    throw new Error('لا يمكن تعديل تسعير بند تم تسليمه.');
  }
  if (input.rentalPrice !== undefined || input.depositAmount !== undefined || input.securityDepositAmount !== undefined || input.bookingAdvanceAmount !== undefined) { // legacy compat check

    assertNoPostedMoneyForContractValueChange(reservation);
  }

  const updatedLine: ContractLine = {
    ...line,
    ...(input.pickupDate !== undefined && { pickupDate: input.pickupDate }),
    ...(input.pickupTime !== undefined && { pickupTime: normalizeTimeInput(input.pickupTime, 'وقت الاستلام') }),
    ...(input.returnDate !== undefined && { returnDate: input.returnDate }),
    ...(input.returnTime !== undefined && { returnTime: normalizeTimeInput(input.returnTime, 'وقت الإرجاع') }),
    ...(input.rentalPrice !== undefined && { rentalPrice: input.rentalPrice }),
    ...(input.depositAmount !== undefined && { depositAmount: input.depositAmount, securityDepositAmount: input.depositAmount }), // legacy compat mapping

    ...(input.securityDepositAmount !== undefined && { securityDepositAmount: input.securityDepositAmount, depositAmount: input.securityDepositAmount }), // legacy compat mapping

    ...(input.bookingAdvanceAmount !== undefined && { bookingAdvanceAmount: input.bookingAdvanceAmount }),
    ...(input.notes !== undefined && { notes: input.notes?.trim() || undefined }),
  };

  if (!updatedLine.pickupDate || !updatedLine.returnDate) throw new Error('حددي تاريخ الاستلام والإرجاع.');
  if (updatedLine.pickupDate < getTodayISO()) throw new Error('تاريخ الاستلام لا يمكن أن يكون في الماضي.');
  if (updatedLine.returnDate <= updatedLine.pickupDate) throw new Error('تاريخ الإرجاع يجب أن يكون بعد تاريخ الاستلام.');
  if (!Number.isFinite(updatedLine.rentalPrice) || updatedLine.rentalPrice < 0) {
    throw new Error('قيمة الإيجار المتفق عليها غير صالحة.');
  }
  if (updatedLine.rentalPrice > (updatedLine.listRentalPrice ?? line.rentalPrice)) {
    throw new Error('قيمة الإيجار المتفق عليها لا يمكن أن تتجاوز السعر المسجل للعنصر.');
  }
  const secDep = getLineSecurityDepositAmount(updatedLine);
  if (!Number.isFinite(secDep) || secDep < 0) {
    throw new Error('قيمة التأمين المسترد غير صالحة.');
  }
  const bookAdv = getLineBookingAdvanceAmount(updatedLine);
  if (!Number.isFinite(bookAdv) || bookAdv < 0) {
    throw new Error('قيمة دفعة الحجز غير صالحة.');
  }

  // If dates changed, re-check conflicts for this line
  if (input.pickupDate !== undefined || input.returnDate !== undefined) {
    assertNoConflicts(findItemConflicts({
      inventoryItemId: updatedLine.inventoryItemId,
      dressCode: updatedLine.dressCodeSnapshot,
      pickupDate: updatedLine.pickupDate,
      returnDate: updatedLine.returnDate,
      excludeReservationNumber: reservation.reservationNumber,
    }, reservations));
  }

  const updatedLines = lines.map((l, i) => i === lineIndex ? updatedLine : l);
  const updated = syncTopLevelFromLines({ ...reservation, lines: updatedLines });

  recordAudit({
    action: 'update',
    entityType: 'reservation',
    entityId: reservation.id,
    summary: `تم تعديل البند ${line.dressCodeSnapshot} في الحجز ${reservation.reservationNumber}.`,
    previousValues: {
      pickupDate: line.pickupDate,
      returnDate: line.returnDate,
      rentalPrice: line.rentalPrice,
      depositAmount: getLineSecurityDepositAmount(line), // legacy compat
      securityDepositAmount: getLineSecurityDepositAmount(line),
      bookingAdvanceAmount: getLineBookingAdvanceAmount(line),
    },
    nextValues: {
      pickupDate: updatedLine.pickupDate,
      returnDate: updatedLine.returnDate,
      rentalPrice: updatedLine.rentalPrice,
      depositAmount: getLineSecurityDepositAmount(updatedLine), // legacy compat
      securityDepositAmount: getLineSecurityDepositAmount(updatedLine),
      bookingAdvanceAmount: getLineBookingAdvanceAmount(updatedLine),
    },
  });
  return persist(reservations, updated);
}

/**
 * Moves a reservation to a new period, optionally onto a different item, and
 * re-checks every attached accessory against the new dates.
 *
 * Extending the rental is the same operation with a later return date, so the
 * conflict rule is applied identically for a move, a swap and an extension.
 */
export function rescheduleReservation(input: RescheduleReservationInput): Reservation {
  const reservations = getReservations();
  const reservation = reservations.find((item) => item.reservationNumber === input.reservationNumber);
  if (!reservation) throw new Error('الحجز المحدد غير موجود.');
  if (reservation.status === 'cancelled' || reservation.status === 'returned') throw new Error('لا يمكن تعديل موعد حجز مغلق.');
  if (!input.pickupDate || !input.returnDate) throw new Error('حددي تاريخ الاستلام والإرجاع.');
  if (input.returnDate <= input.pickupDate) throw new Error('تاريخ الإرجاع يجب أن يكون بعد تاريخ الاستلام.');

  const pickupTime = normalizeTimeInput(input.pickupTime, 'وقت الاستلام');
  const returnTime = normalizeTimeInput(input.returnTime, 'وقت الإرجاع');

  // For multi-item reservations, update all lines' dates
  const lines = reservation.lines ?? [];
  if (lines.length > 0) {
    let updatedLines = lines.map((line) => {
      if (line.deliveryStatus === 'delivered' || line.deliveryStatus === 'late') {
        // Don't change dates for already-delivered lines
        return line;
      }
      return { ...line, pickupDate: input.pickupDate, pickupTime, returnDate: input.returnDate, returnTime };
    });

    // Handle dress swap for single-line reservations
    if (input.dressId && input.dressId !== reservation.inventoryItemId) {
      if (reservation.status === 'delivered' || reservation.status === 'overdue') throw new Error('لا يمكن تغيير العنصر بعد التسليم.');
      const dress = getDresses().find((item) => item.id === input.dressId);
      if (!dress) throw new Error('العنصر المحدد غير موجود.');
      if (!dress.isForRent || !reservableDressStatuses.has(dress.status)) throw new Error('العنصر غير مؤهل للإيجار حالياً.');

      // Update the first pending line to the new item
      const pendingIndex = updatedLines.findIndex((l) => l.deliveryStatus === 'pending_delivery');
      if (pendingIndex >= 0) {
        updatedLines = updatedLines.map((l, i) => i === pendingIndex ? {
          ...l,
          inventoryItemId: dress.id,
          dressCodeSnapshot: dress.code,
          dressNameSnapshot: dress.name,
          rentalPrice: getDressEffectiveRentalPrice(dress),
          listRentalPrice: dress.rentalPrice,
          securityDepositAmount: getDressSecurityDepositAmount(dress),
          depositAmount: getDressSecurityDepositAmount(dress), // legacy compat

        } : l);
      }
    }

    // Check conflicts for each pending line
    updatedLines
      .filter((line) => line.deliveryStatus === 'pending_delivery')
      .forEach((line) => {
        assertNoConflicts(findItemConflicts({
          inventoryItemId: line.inventoryItemId,
          dressCode: line.dressCodeSnapshot,
          pickupDate: line.pickupDate,
          returnDate: line.returnDate,
          excludeReservationNumber: reservation.reservationNumber,
        }, reservations));
      });

    // Also re-check attached accessories against the new dates
    const accessoryLinks = getReservationAccessories();
    accessoryLinks
      .filter((link) => link.reservationNumber === reservation.reservationNumber)
      .forEach((link) => assertNoConflicts(findAccessoryConflicts({
        accessoryId: link.accessoryId,
        pickupDate: input.pickupDate,
        returnDate: input.returnDate,
        excludeReservationNumber: reservation.reservationNumber,
      }, accessoryLinks, reservations)));

    const updated = syncTopLevelFromLines({ ...reservation, lines: updatedLines, pickupDate: input.pickupDate, pickupTime, returnDate: input.returnDate, returnTime });
    recordAudit({ action: 'update', entityType: 'reservation', entityId: reservation.id, summary: `تم تعديل موعد الحجز ${reservation.reservationNumber}.`, previousValues: { pickupDate: reservation.pickupDate, returnDate: reservation.returnDate }, nextValues: { pickupDate: updated.pickupDate, returnDate: updated.returnDate } });
    return persist(reservations, updated);
  }

  // Legacy single-item path
  let nextItem = { inventoryItemId: reservation.inventoryItemId, dressCode: reservation.dressCode, dressName: reservation.dressName, rentalPrice: reservation.rentalPrice, listRentalPrice: reservation.listRentalPrice ?? reservation.rentalPrice };
  if (input.dressId && input.dressId !== reservation.inventoryItemId) {
    if (reservation.status === 'delivered' || reservation.status === 'overdue') throw new Error('لا يمكن تغيير العنصر بعد التسليم.');
    const dress = getDresses().find((item) => item.id === input.dressId);
    if (!dress) throw new Error('العنصر المحدد غير موجود.');
    if (!dress.isForRent || !reservableDressStatuses.has(dress.status)) throw new Error('العنصر غير مؤهل للإيجار حالياً.');
    nextItem = { inventoryItemId: dress.id, dressCode: dress.code, dressName: dress.name, rentalPrice: dress.rentalPrice, listRentalPrice: dress.rentalPrice };
  }

  assertNoConflicts(findItemConflicts({
    inventoryItemId: nextItem.inventoryItemId,
    dressCode: nextItem.dressCode,
    pickupDate: input.pickupDate,
    returnDate: input.returnDate,
    excludeReservationNumber: reservation.reservationNumber,
  }, reservations));

  const accessoryLinks = getReservationAccessories();
  accessoryLinks
    .filter((link) => link.reservationNumber === reservation.reservationNumber)
    .forEach((link) => assertNoConflicts(findAccessoryConflicts({
      accessoryId: link.accessoryId,
      pickupDate: input.pickupDate,
      returnDate: input.returnDate,
      excludeReservationNumber: reservation.reservationNumber,
    }, accessoryLinks, reservations)));

  const totalAmount = nextItem.rentalPrice + getReservationSecurityDepositAmount(reservation);
  const updated = persist(reservations, {
    ...reservation,
    ...nextItem,
    pickupDate: input.pickupDate,
    pickupTime,
    returnDate: input.returnDate,
    returnTime,
    totalAmount,
  });

  recordAudit({
    action: 'update',
    entityType: 'reservation',
    entityId: reservation.id,
    summary: `تم تعديل موعد الحجز ${reservation.reservationNumber}.`,
    previousValues: { pickupDate: reservation.pickupDate, returnDate: reservation.returnDate, dressCode: reservation.dressCode },
    nextValues: { pickupDate: updated.pickupDate, returnDate: updated.returnDate, dressCode: updated.dressCode },
  });
  return updated;
}

/**
 * Per-line delivery: marks one line as delivered and updates the item status.
 */
export function deliverContractLine(input: LineDeliveryInput): Reservation {
  const reservations = getReservations();
  const reservation = reservations.find((item) => item.reservationNumber === input.reservationNumber);
  if (!reservation) throw new Error('الحجز المحدد غير موجود.');

  const lines = reservation.lines ?? [];
  const lineIndex = lines.findIndex((l) => l.id === input.lineId);
  if (lineIndex === -1) throw new Error('البند المحدد غير موجود في الحجز.');

  const line = lines[lineIndex];
  if (line.deliveryStatus !== 'pending_delivery') {
    throw new Error('هذا البند تم تسليمه بالفعل.');
  }
  const paymentOverrideReason = assertLineDeliveryPaymentGate(reservation, input.paymentOverrideReason);
  validateOperationDateTime(input.deliveryDateTime, 'تاريخ ووقت التسليم');

  const updatedLine: ContractLine = {
    ...line,
    deliveryStatus: 'delivered',
    deliveryDateTime: input.deliveryDateTime,
    deliveryCondition: input.deliveryCondition?.trim() || undefined,
    deliveryPhotos: input.deliveryPhotos,
    notes: input.notes?.trim() || line.notes,
  };

  const updatedLines = lines.map((l, i) => i === lineIndex ? updatedLine : l);
  const newStatus = deriveReservationStatus(updatedLines, reservation.status);
  let updated: Reservation = { ...reservation, lines: updatedLines, status: newStatus };
  updated = syncTopLevelFromLines(updated);

  // Update the dress status
  const dress = getDresses().find((d) => d.id === line.inventoryItemId);
  if (dress) {
    markDressRented(line.dressCodeSnapshot);
  }

  recordAudit({
    action: 'deliver',
    entityType: 'reservation',
    entityId: reservation.id,
    summary: `تم تسليم البند ${line.dressCodeSnapshot} من الحجز ${reservation.reservationNumber}.`,
    nextValues: {
      lineId: line.id,
      deliveryStatus: 'delivered',
      deliveryDateTime: input.deliveryDateTime,
      paymentOverrideReason,
    },
  });

  return persist(reservations, updated);
}

/**
 * Per-line return: marks one line as returned and updates the item status.
 */
export function returnContractLine(input: LineReturnInput): Reservation {
  const reservations = getReservations();
  const reservation = reservations.find((item) => item.reservationNumber === input.reservationNumber);
  if (!reservation) throw new Error('الحجز المحدد غير موجود.');

  const lines = reservation.lines ?? [];
  const lineIndex = lines.findIndex((l) => l.id === input.lineId);
  if (lineIndex === -1) throw new Error('البند المحدد غير موجود في الحجز.');

  const line = lines[lineIndex];
  if (line.deliveryStatus === 'returned') {
    throw new Error('تم استرجاع هذا البند بالفعل.');
  }
  if (line.deliveryStatus !== 'delivered' && line.deliveryStatus !== 'late') {
    throw new Error('هذا البند لم يتم تسليمه بعد.');
  }
  if (!allowedReturnItemStatuses.has(input.nextItemStatus)) {
    throw new Error('العنصر المسترجع يجب أن ينتقل إلى الفحص أو الغسيل أو الصيانة أو التالف، ولا يصبح متاحاً مباشرة.');
  }
  const returnTimestamp = validateOperationDateTime(input.returnDateTime, 'تاريخ ووقت الاسترجاع');
  if (line.deliveryDateTime && returnTimestamp < new Date(line.deliveryDateTime).getTime()) {
    throw new Error('وقت الاسترجاع لا يمكن أن يسبق وقت التسليم.');
  }
  if (![input.lateFee, input.damageFee].every((amount) => Number.isFinite(amount) && amount >= 0)) {
    throw new Error('رسوم التأخير أو الضرر غير صالحة.');
  }

  const updatedLine: ContractLine = {
    ...line,
    deliveryStatus: 'returned',
    returnDateTime: input.returnDateTime,
    returnCondition: input.returnCondition?.trim() || undefined,
    returnPhotos: input.returnPhotos,
    lateFee: input.lateFee,
    damageFee: input.damageFee,
    notes: input.notes?.trim() || line.notes,
  };

  const updatedLines = lines.map((l, i) => i === lineIndex ? updatedLine : l);
  const newStatus = deriveReservationStatus(updatedLines, reservation.status);

  // Update assessed fees
  const additionalFees = input.lateFee + input.damageFee;
  let updated: Reservation = {
    ...reservation,
    lines: updatedLines,
    status: newStatus,
    assessedFeesAmount: (reservation.assessedFeesAmount ?? 0) + additionalFees,
  };
  updated = syncTopLevelFromLines(updated);

  // Update the dress status
  updateDressStatus(line.dressCodeSnapshot, input.nextItemStatus);

  recordAudit({
    action: 'return',
    entityType: 'reservation',
    entityId: reservation.id,
    summary: `تم استرجاع البند ${line.dressCodeSnapshot} من الحجز ${reservation.reservationNumber}.`,
    nextValues: {
      lineId: line.id,
      deliveryStatus: updatedLine.deliveryStatus,
      returnDateTime: input.returnDateTime,
      lateFee: input.lateFee,
      damageFee: input.damageFee,
    },
  });

  return persist(reservations, updated);
}
