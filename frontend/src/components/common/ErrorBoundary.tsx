import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallbackTitle?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

/**
 * Class error boundary so a single crashed page does not white-screen the
 * whole SPA. Falls back to a themed panel with a reload action.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, message: error.message || 'Unexpected error' };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('ErrorBoundary caught:', error, info.componentStack);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center px-4 py-16 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-clay/10 text-clay">
          <AlertTriangle className="h-7 w-7" />
        </div>
        <h2 className="mb-2 text-2xl text-ink">{this.props.fallbackTitle || 'Something went wrong'}</h2>
        <p className="mb-1 text-sm text-ink-soft">
          This part of the page failed to load. Your cart and orders are safe.
        </p>
        <p className="mb-6 max-w-md break-words text-xs text-ink-soft">{this.state.message}</p>
        <button onClick={this.handleReload} className="btn btn-primary">
          <RefreshCw className="h-4 w-4" />
          Reload page
        </button>
      </div>
    );
  }
}
