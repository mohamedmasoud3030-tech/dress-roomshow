export type DressStatus =
  | 'available'
  | 'reserved'
  | 'rented'
  | 'laundry'
  | 'maintenance'
  | 'damaged'
  | 'sold'
  | 'inactive';

export type DressCategory = 'زفاف' | 'خطوبة' | 'سهرة' | 'أطفال' | 'أخرى';

export type Dress = {
  id: string;
  code: string;
  name: string;
  description: string;
  category: DressCategory;
  color: string;
  size: string;
  purchasePrice: number;
  rentalPrice: number;
  salePrice: number;
  depositAmount: number;
  status: DressStatus;
  isForRent: boolean;
  isForSale: boolean;
  images: string[];
  barcode: string;
  timesRented: number;
  notes?: string;
};

export type AddDressInput = Omit<Dress, 'id' | 'code' | 'timesRented'>;

export type DressFilters = {
  search: string;
  status: 'all' | DressStatus;
  category: 'all' | DressCategory;
  usage: 'all' | 'rent' | 'sale';
};

export type DressSummary = {
  total: number;
  available: number;
  rented: number;
  inService: number;
};
