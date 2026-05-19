type SummaryCardProps = {
  label: string;
  value: string | number;
  hint?: string;
  tone?: 'default' | 'success' | 'warning' | 'danger' | 'info';
};

const toneClass = {
  default: 'text-slate-950',
  success: 'text-emerald-700',
  warning: 'text-amber-700',
  danger: 'text-red-700',
  info: 'text-sky-700',
};

export function SummaryCard({ label, value, hint, tone = 'default' }: SummaryCardProps) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`mt-2 text-3xl font-bold ${toneClass[tone]}`}>{value}</p>
      {hint ? <p className="mt-2 text-sm text-slate-500">{hint}</p> : null}
    </article>
  );
}
