import React from 'react';
import type { MonitorClient } from '../core/MonitorClient';
import { ErrorTracker } from '../trackers/ErrorTracker';

interface MonitorErrorBoundaryProps {
  monitor: MonitorClient;
  fallback?: React.ReactNode;
  onError?: (error: Error, componentStack: string) => void;
  children: React.ReactNode;
}

interface MonitorErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class MonitorErrorBoundary extends React.Component<
  MonitorErrorBoundaryProps,
  MonitorErrorBoundaryState
> {
  constructor(props: MonitorErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): MonitorErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    const componentStack = errorInfo.componentStack || '';

    // Access the ErrorTracker through the monitor's internal tracking
    // We create a temporary ErrorTracker just to use its trackReactError method
    const errorTracker = new ErrorTracker(this.props.monitor);
    errorTracker.trackReactError(error, componentStack);

    this.props.onError?.(error, componentStack);
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          style={{
            padding: '20px',
            textAlign: 'center',
            fontFamily: 'sans-serif',
          }}
        >
          <h2>Something went wrong</h2>
          <p>An unexpected error occurred. Please try refreshing the page.</p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{
              padding: '8px 16px',
              cursor: 'pointer',
              borderRadius: '4px',
              border: '1px solid #ccc',
              background: '#fff',
            }}
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
