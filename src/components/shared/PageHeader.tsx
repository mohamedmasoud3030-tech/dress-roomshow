import type { ReactNode } from 'react';

type PageHeaderProps = {
  eyebrow: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  status?: ReactNode;
};

/** Canonical page identity and action hierarchy. */
export function PageHeader({ eyebrow, title, description, actions, status }: PageHeaderProps) {
  return (
    <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <p className="text-[11px] font-bold tracking-[0.18em]" style={{ color: 'var(--gold)' }}>
          {eyebrow}
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
        {description ? (
          <p className="mt-2 max-w-2xl text-sm leading-6" style={{ color: 'var(--muted)' }}>
            {description}
          </p>
        ) : null}
        {status ? <div className="mt-3">{status}</div> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">{actions}</div> : null}
    </div>
  );
}
