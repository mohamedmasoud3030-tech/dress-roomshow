import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatOmaniRial(value: number) {
  return new Intl.NumberFormat('ar-OM', {
    style: 'currency',
    currency: 'OMR',
    minimumFractionDigits: 3,
  }).format(value);
}

export function formatDate(value: string | Date) {
  return new Intl.DateTimeFormat('ar-OM', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(value));
}
