import type { MonitorEvent } from '@web-monitor/shared';
import type { TransportOptions } from '../types';

export class Transport {
  private endpoint: string;
  private appId: string;
  private headers: Record<string, string>;

  constructor(options: TransportOptions) {
    this.endpoint = options.endpoint;
    this.appId = options.appId;
    this.headers = {
      'Content-Type': 'application/json',
      'X-App-Id': options.appId,
      ...options.headers,
    };
  }

  async send(events: MonitorEvent[]): Promise<boolean> {
    const payload = JSON.stringify({ events });

    if (document.visibilityState === 'hidden') {
      return this.sendBeacon(payload);
    }

    return this.sendFetch(payload);
  }

  sendOnUnload(events: MonitorEvent[]): void {
    if (events.length === 0) return;
    const payload = JSON.stringify({ events });
    this.sendBeacon(payload);
  }

  private sendBeacon(payload: string): boolean {
    if (typeof navigator.sendBeacon !== 'function') {
      // Fallback to sync fetch if sendBeacon unavailable
      this.sendFetch(payload).catch(() => {});
      return true;
    }

    const blob = new Blob([payload], { type: 'application/json' });
    return navigator.sendBeacon(this.endpoint, blob);
  }

  private async sendFetch(payload: string): Promise<boolean> {
    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: this.headers,
        body: payload,
        keepalive: true,
      });
      return response.ok || response.status === 202;
    } catch {
      return false;
    }
  }

  getEndpoint(): string {
    return this.endpoint;
  }
}
