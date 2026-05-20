import { useEffect, useId } from 'react';

type SimpleModalProps = Readonly<{
  title: string;
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}>;

export function SimpleModal({ title, open, onClose, children, footer, className }: SimpleModalProps) {
  const generatedTitleId = useId();
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-center">
      <button
        type="button"
        aria-label="إغلاق النافذة"
        className="absolute inset-0 bg-[#1F1B18]/40"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={generatedTitleId}
        className={`relative w-full max-w-lg rounded-2xl border border-[#E8DED2] bg-white shadow-xl ${className ?? ''}`}
      >
        <div className="flex items-center justify-between border-b border-[#E8DED2] px-4 py-3">
          <h3 id={generatedTitleId} className="text-lg font-semibold text-[#1F1B18]">{title}</h3>
          <button type="button" className="rounded-lg px-2 py-1 text-sm text-[#7A7168] hover:bg-[#FAF7F2]" onClick={onClose}>إغلاق</button>
        </div>
        <div className="space-y-3 px-4 py-4">{children}</div>
        {footer ? <div className="flex justify-end gap-2 border-t border-[#E8DED2] px-4 py-3">{footer}</div> : null}
      </div>
    </div>
  );
}
