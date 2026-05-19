export type DressStatus = 'available' | 'reserved' | 'rented' | 'maintenance';

export type DressRecord = {
  id: string;
  code: string;
  name: string;
  color: string;
  size: string;
  rentalPrice: number;
  status: DressStatus;
};
