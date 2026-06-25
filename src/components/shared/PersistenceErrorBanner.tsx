import type { PersistenceFailureContent } from '../../services/persistenceErrorMessage';

type PersistenceErrorBannerProps = {
  content: PersistenceFailureContent;
  className?: string;
};

export function PersistenceErrorBanner({ content, className = '' }: PersistenceErrorBannerProps) {
  return (
    <div
      role="alert"
      className={`rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 shadow-sm ${className}`}
    >
      <p className="font-extrabold">{content.title}</p>
      <p className="mt-1 font-bold">{content.message}</p>
      <ul className="mt-3 list-disc space-y-1 pr-5 leading-6">
        {content.guidance.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
