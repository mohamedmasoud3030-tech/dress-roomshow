type SummaryCardTone = 'default' | 'positive' | 'warning' | 'danger';

type SummaryCardProps = {
  label: string;
  value: string | number;
  hint?: string;
  tone?: SummaryCardTone;
};

const valueToneStyles: Record<SummaryCardTone, string> = {
  default: 'text-slate-950',
  positive: 'text-emerald-700',
  warning: 'text-amber-700',
  danger: 'text-rose-700',
};

export function SummaryCard({ label, value, hint, tone = 'default' }: SummaryCardProps) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className={`mt-2 text-3xl font-bold ${valueToneStyles[tone]}`}>{value}</p>
      {hint && <p className="mt-2 text-sm text-slate-500">{hint}</p>}
    </article>
  );
}
