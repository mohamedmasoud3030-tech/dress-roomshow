import type { ElementType, ReactNode } from 'react';
import { cn } from '../../lib/utils';

export type PageContainerWidth = 'standard' | 'wide' | 'narrow';

type PageContainerProps = {
  children: ReactNode;
  className?: string;
  width?: PageContainerWidth;
  as?: ElementType;
};

const WIDTH_CLASSES: Record<PageContainerWidth, string> = {
  standard: 'max-w-7xl',
  wide: 'max-w-[92rem]',
  narrow: 'max-w-3xl',
};

/**
 * Canonical private-page frame. It owns width, horizontal padding, and the
 * bottom safe-area gap; feature pages own their content and domain rhythm.
 */
export function PageContainer({
  children,
  className,
  width = 'standard',
  as: Component = 'div',
}: PageContainerProps) {
  return (
    <Component className={cn('mx-auto w-full min-w-0 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-6', WIDTH_CLASSES[width], className)}>
      {children}
    </Component>
  );
}
