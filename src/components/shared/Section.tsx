import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

/**
 * The standard card that every page section lives in.
 *
 * One surface, one rhythm. No orange title bar, no white sheet.
 */
export function Section({
  title,
  description,
  action,
  children,
  className,
  contentClassName,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <section
      aria-label={title}
      className={cn('min-w-0 rounded-2xl border p-4 sm:p-5', className)}
      style={{ background: 'var(--surface)', borderColor: 'var(--line)' }}
    >
      {(title || action) && (
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            {title && <h2 className="text-base font-semibold tracking-tight sm:text-lg">{title}</h2>}
            {description && (
              <p className="mt-1 text-xs leading-5" style={{ color: 'var(--muted)' }}>
                {description}
              </p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      <div className={cn('min-w-0', contentClassName)}>{children}</div>
    </section>
  );
}

/**
 * A horizontally scrollable wrapper for wide content.
 *
 * Tables were widening the whole page on phones instead of scrolling
 * themselves; `min-w-0` on the parent plus this wrapper keeps the page pinned.
 */
export function ScrollArea({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('-mx-1 overflow-x-auto px-1', className)}>{children}</div>;
}
