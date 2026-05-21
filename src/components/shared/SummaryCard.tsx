import type { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';

type Props = {
  label: string;
  value: string | number;
  icon: LucideIcon;
  color?: 'violet' | 'emerald' | 'amber' | 'rose' | 'blue' | 'slate';
  className?: string;
};

const colorMap = {
  violet: 'bg-violet-50 text-violet-700 border-violet-100',
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  amber: 'bg-amber-50 text-amber-700 border-amber-100',
  rose: 'bg-rose-50 text-rose-700 border-rose-100',
  blue: 'bg-blue-50 text-blue-700 border-blue-100',
  slate: 'bg-slate-50 text-slate-700 border-slate-200',
};

const iconBgMap = {
  violet: 'bg-violet-100 text-violet-600',
  emerald: 'bg-emerald-100 text-emerald-600',
  amber: 'bg-amber-100 text-amber-600',
  rose: 'bg-rose-100 text-rose-600',
  blue: 'bg-blue-100 text-blue-600',
  slate: 'bg-slate-100 text-slate-600',
};

export function SummaryCard({ label, value, icon: Icon, color = 'violet', className }: Props) {
  return (
    <div
      className={cn(
        'rounded-xl border p-4 flex items-center gap-4',
        colorMap[color],
        className,
      )}
    >
      <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center shrink-0', iconBgMap[color])}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-current opacity-70 truncate">{label}</p>
        <p className="text-xl font-bold mt-0.5 leading-tight">{value}</p>
      </div>
    </div>
  );
}
