type SummaryCardProps = {
  label: string;
  value: string | number;
  hint?: string;
  valueClassName?: string;
};

export function SummaryCard({ label, value, hint, valueClassName }: SummaryCardProps) {
  return (
    <article className="rounded-2xl border border-[#E8DED2] bg-white p-5 shadow-sm">
      <p className="text-sm text-[#7A7168]">{label}</p>
      <p className={`mt-2 text-3xl font-bold text-[#1F1B18] ${valueClassName ?? ''}`}>{value}</p>
      {hint ? <p className="mt-1 text-xs text-[#7A7168]">{hint}</p> : null}
    </article>
  );
}
