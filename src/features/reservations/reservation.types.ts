export type ReservationStatus = 'confirmed' | 'pickup_today' | 'returned';

export type ReservationRecord = {
  id: string;
  reservationNumber: string;
  customerName: string;
  dressCode: string;
  eventDate: string;
  status: ReservationStatus;
};
