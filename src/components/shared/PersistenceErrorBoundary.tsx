import { Component, type ErrorInfo, type ReactNode } from 'react';
import { getPersistenceFailureContent } from '../../services/persistenceErrorMessage';
import { PersistenceErrorBanner } from './PersistenceErrorBanner';

type PersistenceErrorBoundaryProps = {
  children: ReactNode;
};

type PersistenceErrorBoundaryState = {
  error: unknown;
};

export class PersistenceErrorBoundary extends Component<PersistenceErrorBoundaryProps, PersistenceErrorBoundaryState> {
  state: PersistenceErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: unknown): PersistenceErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: unknown, errorInfo: ErrorInfo) {
    if (!getPersistenceFailureContent(error)) {
      console.error(error, errorInfo);
    }
  }

  render() {
    const content = getPersistenceFailureContent(this.state.error);

    if (content) {
      return (
        <PersistenceErrorBanner
          content={content}
          className="mb-4"
        />
      );
    }

    if (this.state.error) {
      throw this.state.error;
    }

    return this.props.children;
  }
}
