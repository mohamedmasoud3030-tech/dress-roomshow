type SummaryCardTone = 'default' | 'positive' | 'warning' | 'danger';

type SummaryCardProps = {
  label: string;
  value: string | number;
  hint?: string;
  tone?: SummaryCardTone;
};

const toneStyles: Record<SummaryCardTone, string> = {
  default: 'from-slate-50 to-white text-slate-950 ring-slate-200',
  positive: 'from-emerald-50 to-white text-emerald-700 ring-emerald-100',
  warning: 'from-amber-50 to-white text-amber-700 ring-amber-100',
  danger: 'from-rose-50 to-white text-rose-700 ring-rose-100',
};

export function SummaryCard({ label, value, hint, tone = 'default' }: SummaryCardProps) {
  return (
    <article className={`rounded-3xl bg-gradient-to-br p-5 shadow-sm ring-1 ${toneStyles[tone]}`}>
      <div className="mb-5 h-1.5 w-12 rounded-full bg-current opacity-30" />
      <p className="text-sm font-bold text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-extrabold text-current">{value}</p>
      {hint && <p className="mt-2 text-sm text-slate-500">{hint}</p>}
    </article>
  );
}
