export type DressStatus =
  | 'available'
  | 'reserved'
  | 'rented'
  | 'inspection'
  | 'laundry'
  | 'maintenance'
  | 'damaged'
  | 'sold'
  | 'inactive';

export type InventoryItemType = 'dress' | 'accessory' | 'bag' | 'shoe' | 'veil' | 'other';

export type DressCategory = 'زفاف' | 'خطوبة' | 'سهرة' | 'أطفال' | 'إكسسوارات' | 'حقائب' | 'أحذية' | 'طرح وشالات' | 'أخرى';

export type Dress = {
  id: string;
  code: string;
  name: string;
  description: string;
  itemType?: InventoryItemType;
  category: DressCategory;
  color: string;
  size: string;
  purchasePrice: number;
  rentalPrice: number;
  salePrice: number;
  /** @deprecated legacy ambiguous field; use defaultSecurityDepositAmount */
  depositAmount: number;
  /** Canonical suggested refundable security deposit for the piece */
  defaultSecurityDepositAmount?: number;
  status: DressStatus;
  isForRent: boolean;
  isForSale: boolean;
  images: string[];
  barcode: string;
  /**
   * Parent design, when the piece belongs to one. Optional: a showroom may own
   * one-off pieces, and every record created before designs existed has none.
   */
  designId?: string;
  /** Historical design-code snapshot, so a printed document stays readable. */
  designCode?: string;
  timesRented: number;
  /** Set when the item is archived instead of deleted; history stays intact. */
  archivedAt?: string;
  notes?: string;
  /**
   * Season discount on this piece, in percent off the list price. Zero or
   * absent means no sale. The listed prices stay the reference: the discount
   * is what expires, not the price list.
   */
  discountPercent?: number;
};

export type AddDressInput = Omit<Dress, 'id' | 'code' | 'timesRented'>;

export type DressFilters = {
  search: string;
  status: 'all' | DressStatus;
  itemType: 'all' | InventoryItemType;
  category: 'all' | DressCategory;
  usage: 'all' | 'rent' | 'sale';
  /** Narrow to the pieces of one design. */
  designId?: string;
  size?: string;
  color?: string;
};

export type DressSummary = {
  total: number;
  available: number;
  rented: number;
  inService: number;
};

export function getDressSecurityDepositAmount(dress: Dress): number {
  return dress.defaultSecurityDepositAmount ?? dress.depositAmount ?? 0;
}

/** The season discount of a piece, clamped to a sane 0-100 range. */
export function getDressDiscountPercent(dress: Dress): number {
  const percent = dress.discountPercent;
  if (typeof percent !== 'number' || !Number.isFinite(percent) || percent <= 0) return 0;
  return Math.min(percent, 100);
}

export function hasDressDiscount(dress: Dress): boolean {
  return getDressDiscountPercent(dress) > 0;
}

/** What the customer actually pays for a rental after the season discount. */
export function getDressEffectiveRentalPrice(dress: Dress): number {
  return roundMoney(dress.rentalPrice * (1 - getDressDiscountPercent(dress) / 100));
}

/** What the customer actually pays to buy the piece after the discount. */
export function getDressEffectiveSalePrice(dress: Dress): number {
  return roundMoney(dress.salePrice * (1 - getDressDiscountPercent(dress) / 100));
}

function roundMoney(value: number): number {
  // OMR is carried to three decimals; anything finer is noise on a receipt.
  return Math.round(value * 1000) / 1000;
}
