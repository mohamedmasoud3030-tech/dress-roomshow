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
    <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <p className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-1 text-xs font-extrabold text-amber-900 ring-1 ring-amber-200">
          {eyebrow}
        </p>
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">{title}</h1>
        {description ? <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{description}</p> : null}
        {status ? <div className="mt-3">{status}</div> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2 sm:justify-end">{actions}</div> : null}
    </div>
  );
}
