import { cn } from '../../lib/utils';

type BadgeColor = 'emerald' | 'amber' | 'rose' | 'blue' | 'violet' | 'slate' | 'orange';

const colorMap: Record<BadgeColor, string> = {
  emerald: 'bg-emerald-100 text-emerald-700',
  amber: 'bg-amber-100 text-amber-700',
  rose: 'bg-rose-100 text-rose-700',
  blue: 'bg-blue-100 text-blue-700',
  violet: 'bg-violet-100 text-violet-700',
  slate: 'bg-slate-100 text-slate-700',
  orange: 'bg-orange-100 text-orange-700',
};

type Props = {
  label: string;
  color: BadgeColor;
  className?: string;
};

export function StatusBadge({ label, color, className }: Props) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        colorMap[color],
        className,
      )}
    >
      {label}
    </span>
  );
}

export function dressStatusBadge(status: string): { label: string; color: BadgeColor } {
  const map: Record<string, { label: string; color: BadgeColor }> = {
    available: { label: 'متاح', color: 'emerald' },
    reserved: { label: 'محجوز', color: 'blue' },
    rented: { label: 'مؤجر', color: 'violet' },
    laundry: { label: 'غسيل', color: 'amber' },
    maintenance: { label: 'صيانة', color: 'orange' },
    damaged: { label: 'تالف', color: 'rose' },
    sold: { label: 'مباع', color: 'slate' },
    inactive: { label: 'غير نشط', color: 'slate' },
  };
  return map[status] ?? { label: status, color: 'slate' };
}

export function reservationStatusBadge(status: string): { label: string; color: BadgeColor } {
  const map: Record<string, { label: string; color: BadgeColor }> = {
    pending: { label: 'معلق', color: 'amber' },
    confirmed: { label: 'مؤكد', color: 'blue' },
    delivered: { label: 'سُلِّم', color: 'violet' },
    returned: { label: 'مُسترجع', color: 'emerald' },
    cancelled: { label: 'ملغي', color: 'slate' },
    overdue: { label: 'متأخر', color: 'rose' },
  };
  return map[status] ?? { label: status, color: 'slate' };
}

export function customerStatusBadge(status: string): { label: string; color: BadgeColor } {
  const map: Record<string, { label: string; color: BadgeColor }> = {
    normal: { label: 'عادي', color: 'slate' },
    trusted: { label: 'موثوقة', color: 'emerald' },
    warning: { label: 'تحذير', color: 'amber' },
    blocked: { label: 'محظورة', color: 'rose' },
  };
  return map[status] ?? { label: status, color: 'slate' };
}

export function deliveryStatusBadge(status: string): { label: string; color: BadgeColor } {
  const map: Record<string, { label: string; color: BadgeColor }> = {
    pending_delivery: { label: 'بانتظار التسليم', color: 'amber' },
    delivered: { label: 'مسلَّم', color: 'violet' },
    returned: { label: 'مُسترجع', color: 'emerald' },
    late: { label: 'متأخر', color: 'rose' },
    damaged: { label: 'تالف', color: 'rose' },
  };
  return map[status] ?? { label: status, color: 'slate' };
}
