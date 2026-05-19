export type ReservationStatus = 'pending' | 'confirmed' | 'delivered' | 'returned' | 'cancelled' | 'overdue';

export type Reservation = {
  id: string;
  reservationNumber: string;
  customerName: string;
  customerPhone: string;
  dressCode: string;
  dressName: string;
  pickupDate: string;
  returnDate: string;
  status: ReservationStatus;
  rentalPrice: number;
  depositAmount: number;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  notes?: string;
};

export type ReservationFilters = {
  search: string;
  status: 'all' | ReservationStatus;
  timing: 'all' | 'today' | 'upcoming' | 'overdue';
};

export type ReservationSummary = {
  total: number;
  active: number;
  today: number;
  overdue: number;
};

export type AvailabilityCheck = {
  dressCode: string;
  pickupDate: string;
  returnDate: string;
};
