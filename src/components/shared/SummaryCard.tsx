type SummaryCardTone = 'default' | 'positive' | 'warning' | 'danger' | 'accent';

type SummaryCardProps = {
  label: string;
  value: string | number;
  hint?: string;
  tone?: SummaryCardTone;
};

/**
 * Operating tile — one surface, one accent, no pastel sheet.
 * Edges come from the room itself (ring + fill), so a tile is a tile
 * in both night and day without a rainbow of backgrounds.
 */
const toneAccent: Record<SummaryCardTone, string> = {
  default: 'var(--muted)',
  positive: 'var(--ok)',
  warning: 'var(--warn)',
  danger: 'var(--danger)',
  accent: 'var(--gold)',
};

export function SummaryCard({ label, value, hint, tone = 'default' }: SummaryCardProps) {
  const accent = toneAccent[tone];

  return (
    <article
      className="min-w-0 rounded-2xl p-4 ring-1 transition sm:p-5"
      style={{ background: 'var(--surface)', boxShadow: 'none', ['--tw-ring-color' as string]: 'var(--line)' }}
    >
      <div className="mb-3 h-0.5 w-8 rounded-full" style={{ background: accent }} />
      <p className="text-xs font-medium sm:text-sm" style={{ color: 'var(--muted)' }}>
        {label}
      </p>
      {/* Long money strings must shrink rather than overflow a 2-up phone grid. */}
      <p className="mt-1.5 truncate text-xl font-semibold tracking-tight sm:text-2xl" style={{ color: tone === 'default' ? 'var(--ink)' : accent }}>
        {value}
      </p>
      {hint && (
        <p className="mt-1.5 truncate text-xs" style={{ color: 'var(--muted)' }}>
          {hint}
        </p>
      )}
    </article>
  );
}
