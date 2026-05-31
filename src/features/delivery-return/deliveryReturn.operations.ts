import { generateId, readCollection, writeCollection } from '../../services/localDatabase';
import { updateDressStatus } from '../dresses/dress.service';
import { getReservations } from '../reservations/reservation.service';
import type { Reservation } from '../reservations/reservation.types';
import { calculateDepositRefund, getDeliveryReturnRecords, saveDeliveryReturnRecord } from './deliveryReturn.service';
import type { DeliveryReturnRecord } from './deliveryReturn.types';

const RESERVATION_COLLECTION = 'reservations';

type CompleteDeliveryInput = { reservationNumber: string; deliveryDateTime: string; deliveryCondition?: string; notes?: string };
type CompleteReturnInput = { reservationNumber: string; returnDateTime: string; returnCondition?: string; lateFee: number; damageFee: number; nextDressStatus: 'available' | 'laundry' | 'maintenance' | 'damaged'; notes?: string };

function updateReservationStatus(reservationNumber: string, status: Reservation['status']): Reservation {
  const reservations = getReservations();
  const reservation = reservations.find((item) => item.reservationNumber === reservationNumber);
  if (!reservation) throw new Error('الحجز المحدد غير موجود.');
  const updated = { ...reservation, status };
  writeCollection(RESERVATION_COLLECTION, reservations.map((item) => item.id === reservation.id ? updated : item));
  return updated;
}

function getBaseRecord(reservation: Reservation): DeliveryReturnRecord {
  return getDeliveryReturnRecords().find((item) => item.reservationNumber === reservation.reservationNumber) ?? {
    id: generateId(), reservationNumber: reservation.reservationNumber, customerName: reservation.customerName,
    customerPhone: reservation.customerPhone, dressCode: reservation.dressCode, dressName: reservation.dressName,
    status: 'pending_delivery', depositAmount: reservation.depositAmount, lateFee: 0, damageFee: 0,
    depositRefundAmount: reservation.depositAmount,
  };
}

export function completeDelivery(input: CompleteDeliveryInput): DeliveryReturnRecord {
  const reservation = getReservations().find((item) => item.reservationNumber === input.reservationNumber);
  if (!reservation) throw new Error('الحجز المحدد غير موجود.');
  if (!['pending', 'confirmed'].includes(reservation.status)) throw new Error('الحجز غير مؤهل للتسليم حالياً.');
  if (!input.deliveryDateTime) throw new Error('تاريخ ووقت التسليم مطلوبان.');
  const record = saveDeliveryReturnRecord({ ...getBaseRecord(reservation), status: 'delivered', deliveryDateTime: input.deliveryDateTime, deliveryCondition: input.deliveryCondition?.trim() || undefined, notes: input.notes?.trim() || undefined });
  updateReservationStatus(reservation.reservationNumber, 'delivered');
  updateDressStatus(reservation.dressCode, 'rented');
  return record;
}

export function completeReturn(input: CompleteReturnInput): DeliveryReturnRecord {
  const reservation = getReservations().find((item) => item.reservationNumber === input.reservationNumber);
  if (!reservation) throw new Error('الحجز المحدد غير موجود.');
  if (!['delivered', 'overdue'].includes(reservation.status)) throw new Error('الحجز غير مؤهل للاسترجاع حالياً.');
  if (!input.returnDateTime) throw new Error('تاريخ ووقت الاسترجاع مطلوبان.');
  if (![input.lateFee, input.damageFee].every((amount) => Number.isFinite(amount) && amount >= 0)) throw new Error('رسوم التأخير أو الضرر غير صالحة.');
  const status = input.damageFee > 0 || input.nextDressStatus === 'damaged' ? 'damaged' : input.lateFee > 0 ? 'late' : 'returned';
  const record = saveDeliveryReturnRecord({ ...getBaseRecord(reservation), status, returnDateTime: input.returnDateTime, returnCondition: input.returnCondition?.trim() || undefined, lateFee: input.lateFee, damageFee: input.damageFee, depositRefundAmount: calculateDepositRefund(reservation.depositAmount, input.lateFee, input.damageFee), notes: input.notes?.trim() || undefined });
  updateReservationStatus(reservation.reservationNumber, 'returned');
  updateDressStatus(reservation.dressCode, input.nextDressStatus);
  return record;
}
