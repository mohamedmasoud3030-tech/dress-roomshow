import type { ReactNode } from 'react';
import { CircleAlert } from 'lucide-react';
import { cn } from '../../lib/utils';

export type ValidationSummaryItem = {
  id: string;
  label: string;
  message: string;
  onSelect?: () => void;
};

type ValidationSummaryProps = {
  items: ValidationSummaryItem[];
  title?: string;
  className?: string;
  footer?: ReactNode;
};

/** Cross-field error index for long forms and wizards; inline errors remain authoritative. */
export function ValidationSummary({
  items,
  title = 'راجعي البيانات المطلوبة قبل المتابعة',
  className,
  footer,
}: ValidationSummaryProps) {
  if (items.length === 0) return null;

  return (
    <div role="alert" className={cn('rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-900', className)}>
      <div className="flex items-start gap-3">
        <CircleAlert aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-rose-700" />
        <div className="min-w-0 flex-1">
          <p className="font-extrabold">{title}</p>
          <ul className="mt-2 space-y-1 text-sm leading-6">
            {items.map((item) => (
              <li key={item.id}>
                {item.onSelect ? (
                  <button
                    type="button"
                    onClick={item.onSelect}
                    className="text-right font-bold underline decoration-rose-300 underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2"
                  >
                    {item.label}: {item.message}
                  </button>
                ) : (
                  <span>{item.label}: {item.message}</span>
                )}
              </li>
            ))}
          </ul>
          {footer}
        </div>
      </div>
    </div>
  );
}
