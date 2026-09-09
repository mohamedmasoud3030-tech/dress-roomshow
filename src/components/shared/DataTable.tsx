import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';
import { AMBER_FOCUS_RING_CLASS_NAME } from '../../shared/domain/formConstants';

export type DataTableColumn<Row> = {
  key: string;
  header: ReactNode;
  render: (row: Row) => ReactNode;
  /** Primary fields lead the phone card; optional fields stay desktop-only. */
  priority?: 'primary' | 'secondary' | 'optional';
  className?: string;
};

type DataTableProps<Row> = {
  rows: Row[];
  columns: DataTableColumn<Row>[];
  rowKey: (row: Row) => string;
  caption?: string;
  emptyState?: ReactNode;
  className?: string;
};

/**
 * Comparison table with an intentional phone transformation.
 *
 * Desktop keeps aligned columns for comparison; phones show the same row as a
 * labelled card instead of forcing a narrow horizontal table. Domain labels
 * and actions stay with the feature through column renderers.
 */
export function DataTable<Row>({ rows, columns, rowKey, caption, emptyState, className }: DataTableProps<Row>) {
  if (rows.length === 0) {
    return emptyState ? <>{emptyState}</> : null;
  }

  const phoneColumns = columns.filter((column) => column.priority !== 'optional');

  return (
    <div className={cn('min-w-0', className)}>
      <div className="hidden overflow-x-auto rounded-2xl border border-slate-200 md:block">
        <table className="w-full min-w-[40rem] text-right text-sm">
          {caption ? <caption className="sr-only">{caption}</caption> : null}
          <thead className="bg-stone-50 text-xs text-slate-600">
            <tr>
              {columns.map((column) => (
                <th key={column.key} scope="col" className={cn('whitespace-nowrap px-3 py-3 font-extrabold', column.className)}>
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {rows.map((row) => (
              <tr key={rowKey(row)} className="align-top transition hover:bg-stone-50">
                {columns.map((column) => (
                  <td key={column.key} className={cn('px-3 py-3 text-slate-700', column.className)}>
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="space-y-3 md:hidden" aria-label={caption}>
        {rows.map((row) => (
          <li key={rowKey(row)} className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-sm ${AMBER_FOCUS_RING_CLASS_NAME}`}>
            <dl className="grid gap-3 sm:grid-cols-2">
              {phoneColumns.map((column) => (
                <div key={column.key} className={column.priority === 'primary' ? 'sm:col-span-2' : undefined}>
                  <dt className="text-xs font-bold text-slate-500">{column.header}</dt>
                  <dd className="mt-1 min-w-0 text-sm text-slate-900">{column.render(row)}</dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>
    </div>
  );
}

export type KeyValueItem = {
  label: ReactNode;
  value: ReactNode;
};

/** Label/value layout for details that should not become a compressed table. */
export function KeyValueList({ items, className }: { items: KeyValueItem[]; className?: string }) {
  return (
    <dl className={cn('grid gap-3 sm:grid-cols-2', className)}>
      {items.map((item, index) => (
        <div key={index} className="min-w-0 rounded-xl bg-stone-50 p-3">
          <dt className="text-xs font-bold text-slate-500">{item.label}</dt>
          <dd className="mt-1 min-w-0 break-words text-sm font-semibold text-slate-900">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
