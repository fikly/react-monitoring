import type { Tracker } from '../types';
import type { MonitorClient } from '../core/MonitorClient';

interface WebVitalMetric {
  value: number;
  id: string;
  navigationType?: string;
}

type WebVitalCallback = (metric: WebVitalMetric) => void;

interface WebVitalsModule {
  getCLS: (cb: WebVitalCallback) => void;
  getFID: (cb: WebVitalCallback) => void;
  getFCP: (cb: WebVitalCallback) => void;
  getLCP: (cb: WebVitalCallback) => void;
  getTTFB: (cb: WebVitalCallback) => void;
  getINP?: (cb: WebVitalCallback) => void;
}

export class PerformanceTracker implements Tracker {
  private client: MonitorClient;
  private started = false;

  constructor(client: MonitorClient) {
    this.client = client;
  }

  start(): void {
    if (this.started) return;
    this.started = true;

    this.loadWebVitals();
    this.trackNavigationTiming();
  }

  stop(): void {
    this.started = false;
  }

  private async loadWebVitals(): Promise<void> {
    try {
      const webVitals: WebVitalsModule = await import('web-vitals');

      webVitals.getCLS((metric) => this.reportVital('CLS', metric));
      webVitals.getFID((metric) => this.reportVital('FID', metric));
      webVitals.getFCP((metric) => this.reportVital('FCP', metric));
      webVitals.getLCP((metric) => this.reportVital('LCP', metric));
      webVitals.getTTFB((metric) => this.reportVital('TTFB', metric));

      // INP is available in web-vitals v3+
      if (webVitals.getINP) {
        webVitals.getINP((metric) => this.reportVital('INP', metric));
      }
    } catch {
      // web-vitals not installed - gracefully degrade
      if (this.client.getConfig().debug) {
        console.warn('[WebMonitor] web-vitals not available, skipping performance metrics');
      }
    }
  }

  private reportVital(name: string, metric: WebVitalMetric): void {
    if (!this.started) return;

    this.client.track({
      type: 'performance',
      properties: {
        metric_name: name,
        metric_value: metric.value,
        metric_id: metric.id,
        navigation_type: metric.navigationType || this.getNavigationType(),
      },
    });
  }

  private trackNavigationTiming(): void {
    // Wait for the page to fully load before capturing navigation timing
    if (document.readyState === 'complete') {
      this.captureNavigationTiming();
    } else {
      window.addEventListener('load', () => {
        // Small delay to ensure all timing data is available
        setTimeout(() => this.captureNavigationTiming(), 0);
      });
    }
  }

  private captureNavigationTiming(): void {
    if (!this.started) return;

    const entries = performance.getEntriesByType('navigation');
    if (entries.length === 0) return;

    const nav = entries[0] as PerformanceNavigationTiming;

    this.client.track({
      type: 'performance',
      properties: {
        metric_name: 'navigation_timing',
        dns_ms: Math.round(nav.domainLookupEnd - nav.domainLookupStart),
        tcp_ms: Math.round(nav.connectEnd - nav.connectStart),
        ttfb_ms: Math.round(nav.responseStart - nav.requestStart),
        download_ms: Math.round(nav.responseEnd - nav.responseStart),
        dom_interactive_ms: Math.round(nav.domInteractive - nav.fetchStart),
        dom_complete_ms: Math.round(nav.domComplete - nav.fetchStart),
        load_event_ms: Math.round(nav.loadEventEnd - nav.fetchStart),
      },
    });
  }

  private getNavigationType(): string {
    const entries = performance.getEntriesByType('navigation');
    if (entries.length > 0) {
      return (entries[0] as PerformanceNavigationTiming).type || 'navigate';
    }
    return 'navigate';
  }
}
