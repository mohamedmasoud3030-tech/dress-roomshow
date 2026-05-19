import type { ReactNode } from 'react';

type FilterPanelProps = {
  children: ReactNode;
  columns?: string;
};

export function FilterPanel({ children, columns = 'lg:grid-cols-3' }: FilterPanelProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className={`grid gap-3 ${columns}`}>{children}</div>
    </div>
  );
}
