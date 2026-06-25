import type { DressCategory, DressStatus } from '../../features/dresses/dress.types';

export const DRESS_STATUS_LABELS = {
  available: 'متاح',
  reserved: 'محجوز',
  rented: 'مؤجر',
  laundry: 'في المغسلة',
  maintenance: 'تحت التعديل',
  damaged: 'تالف',
  sold: 'مباع',
  inactive: 'غير نشط',
} satisfies Record<DressStatus, string>;

export const DRESS_STATUS_STYLES = {
  available: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  reserved: 'bg-amber-50 text-amber-700 ring-amber-200',
  rented: 'bg-violet-50 text-violet-700 ring-violet-200',
  laundry: 'bg-sky-50 text-sky-700 ring-sky-200',
  maintenance: 'bg-orange-50 text-orange-700 ring-orange-200',
  damaged: 'bg-rose-50 text-rose-700 ring-rose-200',
  sold: 'bg-slate-100 text-slate-700 ring-slate-200',
  inactive: 'bg-slate-100 text-slate-500 ring-slate-200',
} satisfies Record<DressStatus, string>;

export const DRESS_CATEGORIES: DressCategory[] = ['زفاف', 'خطوبة', 'سهرة', 'أطفال', 'أخرى'];
export const DRESS_STATUS_OPTIONS: DressStatus[] = [
  'available',
  'reserved',
  'rented',
  'laundry',
  'maintenance',
  'damaged',
  'sold',
  'inactive',
];
