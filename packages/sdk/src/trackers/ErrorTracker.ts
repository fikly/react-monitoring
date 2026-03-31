import { MAX_STACK_LENGTH } from '@pirates_coder/web-monitor-shared';
import type { Tracker } from '../types';
import type { MonitorClient } from '../core/MonitorClient';

export class ErrorTracker implements Tracker {
  private client: MonitorClient;
  private boundHandleError: ((event: ErrorEvent) => void) | null = null;
  private boundHandleRejection: ((event: PromiseRejectionEvent) => void) | null = null;

  constructor(client: MonitorClient) {
    this.client = client;
  }

  start(): void {
    this.boundHandleError = this.handleError.bind(this);
    this.boundHandleRejection = this.handleRejection.bind(this);

    window.addEventListener('error', this.boundHandleError);
    window.addEventListener('unhandledrejection', this.boundHandleRejection);
  }

  stop(): void {
    if (this.boundHandleError) {
      window.removeEventListener('error', this.boundHandleError);
      this.boundHandleError = null;
    }
    if (this.boundHandleRejection) {
      window.removeEventListener('unhandledrejection', this.boundHandleRejection);
      this.boundHandleRejection = null;
    }
  }

  trackReactError(error: Error, componentStack?: string): void {
    this.client.track({
      type: 'error',
      properties: {
        error_type: 'react_boundary',
        message: error.message,
        stack: this.truncateStack(error.stack),
        component_stack: componentStack
          ? componentStack.substring(0, MAX_STACK_LENGTH)
          : undefined,
      },
    });
  }

  trackApiError(
    method: string,
    url: string,
    status: number | undefined,
    errorMessage: string,
  ): void {
    this.client.track({
      type: 'error',
      properties: {
        error_type: 'api',
        message: errorMessage,
        method: method.toUpperCase(),
        url,
        status,
      },
    });
  }

  private handleError(event: ErrorEvent): void {
    // Ignore errors from the monitoring SDK itself
    if (event.filename?.includes(this.client.getTransportEndpoint())) return;

    this.client.track({
      type: 'error',
      properties: {
        error_type: 'runtime',
        message: event.message || 'Unknown error',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: this.truncateStack(event.error?.stack),
      },
    });
  }

  private handleRejection(event: PromiseRejectionEvent): void {
    const reason = event.reason;
    const message =
      reason instanceof Error
        ? reason.message
        : typeof reason === 'string'
          ? reason
          : 'Unhandled promise rejection';

    const stack = reason instanceof Error ? reason.stack : undefined;

    this.client.track({
      type: 'error',
      properties: {
        error_type: 'unhandled_rejection',
        message,
        stack: this.truncateStack(stack),
      },
    });
  }

  private truncateStack(stack: string | undefined): string | undefined {
    if (!stack) return undefined;
    return stack.substring(0, MAX_STACK_LENGTH);
  }
}
