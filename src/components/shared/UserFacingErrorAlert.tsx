import { getPersistenceFailureContent, getUserFacingErrorMessage } from '../../services/persistenceErrorMessage';
import { PersistenceErrorBanner } from './PersistenceErrorBanner';

type UserFacingErrorAlertProps = {
  error: unknown;
  fallback: string;
  className?: string;
};

export function UserFacingErrorAlert({ error, fallback, className = '' }: UserFacingErrorAlertProps) {
  const persistenceContent = getPersistenceFailureContent(error);

  if (persistenceContent) {
    return <PersistenceErrorBanner content={persistenceContent} className={className} />;
  }

  return (
    <div role="alert" className={`rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-800 ${className}`}>
      {getUserFacingErrorMessage(error, fallback)}
    </div>
  );
}
