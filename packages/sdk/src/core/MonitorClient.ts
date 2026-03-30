import type { MonitorEvent, EventType } from '@web-monitor/shared';
import { DEFAULT_SAMPLE_RATE } from '@web-monitor/shared';
import type { MonitorConfig, TrackEventInput, EnrichPageViewData } from '../types';
import { SessionManager } from './SessionManager';
import { EventQueue } from './EventQueue';
import { Transport } from './Transport';
import { PageViewTracker } from '../trackers/PageViewTracker';
import { ErrorTracker } from '../trackers/ErrorTracker';
import { PerformanceTracker } from '../trackers/PerformanceTracker';
import { ClickTracker } from '../trackers/ClickTracker';
import { ApiTracker } from '../trackers/ApiTracker';

export class MonitorClient {
  private static instance: MonitorClient | null = null;

  private config: Required<
    Pick<MonitorConfig, 'appId' | 'endpoint' | 'batchSize' | 'flushInterval' | 'sampleRate' | 'debug'>
  > &
    MonitorConfig;
  private session: SessionManager;
  private queue: EventQueue;
  private transport: Transport;

  private pageViewTracker: PageViewTracker | null = null;
  private errorTracker: ErrorTracker | null = null;
  private performanceTracker: PerformanceTracker | null = null;
  private clickTracker: ClickTracker | null = null;
  private apiTracker: ApiTracker;

  private constructor(config: MonitorConfig) {
    this.config = {
      batchSize: 20,
      flushInterval: 10_000,
      sampleRate: DEFAULT_SAMPLE_RATE,
      debug: false,
      enablePageView: true,
      enableErrors: true,
      enablePerformance: true,
      enableClicks: true,
      enableApiTracking: true,
      ...config,
    };

    this.session = new SessionManager(config.userId);

    this.transport = new Transport({
      endpoint: this.config.endpoint,
      appId: this.config.appId,
    });

    this.queue = new EventQueue(this.transport, {
      batchSize: this.config.batchSize,
      flushInterval: this.config.flushInterval,
      debug: this.config.debug,
    });

    this.apiTracker = new ApiTracker(this);
    this.initialize();
  }

  static init(config: MonitorConfig): MonitorClient {
    if (MonitorClient.instance) {
      if (config.debug) {
        console.warn('[WebMonitor] Already initialized, returning existing instance');
      }
      return MonitorClient.instance;
    }

    MonitorClient.instance = new MonitorClient(config);
    return MonitorClient.instance;
  }

  static getInstance(): MonitorClient | null {
    return MonitorClient.instance;
  }

  private initialize(): void {
    this.queue.start();

    if (this.config.enablePageView) {
      this.pageViewTracker = new PageViewTracker(this);
      this.pageViewTracker.start();
    }

    if (this.config.enableErrors) {
      this.errorTracker = new ErrorTracker(this);
      this.errorTracker.start();
    }

    if (this.config.enablePerformance) {
      this.performanceTracker = new PerformanceTracker(this);
      this.performanceTracker.start();
    }

    if (this.config.enableClicks) {
      this.clickTracker = new ClickTracker(this);
      this.clickTracker.start();
    }

    if (this.config.debug) {
      console.log('[WebMonitor] Initialized', {
        appId: this.config.appId,
        endpoint: this.config.endpoint,
        trackers: {
          pageView: this.config.enablePageView,
          errors: this.config.enableErrors,
          performance: this.config.enablePerformance,
          clicks: this.config.enableClicks,
          apiTracking: this.config.enableApiTracking,
        },
      });
    }
  }

  track(input: TrackEventInput): void {
    if (!this.shouldSample()) return;

    let properties = input.properties;
    if (this.config.sanitize) {
      properties = this.config.sanitize(properties);
    }

    const event: MonitorEvent = {
      id: this.generateId(),
      type: input.type,
      app_id: this.config.appId,
      session_id: this.session.getSessionId(),
      user_id: this.session.getUserId(),
      timestamp: new Date().toISOString(),
      url: window.location.href,
      path: this.getCurrentPath(),
      user_agent: navigator.userAgent,
      screen_resolution: `${screen.width}x${screen.height}`,
      viewport_size: `${window.innerWidth}x${window.innerHeight}`,
      properties,
      metadata: { ...this.config.metadata, ...input.metadata },
    };

    this.queue.push(event);

    if (this.config.debug) {
      console.log('[WebMonitor] Event tracked:', event.type, properties);
    }
  }

  identify(userId: string, traits?: Record<string, string>): void {
    this.session.setUserId(userId);

    if (traits) {
      this.config.metadata = { ...this.config.metadata, ...traits };
    }

    if (this.config.debug) {
      console.log('[WebMonitor] User identified:', userId);
    }
  }

  trackAxios(axiosInstance: unknown): void {
    if (!this.config.enableApiTracking) return;
    this.apiTracker.attachToAxios(axiosInstance);

    if (this.config.debug) {
      console.log('[WebMonitor] Axios tracking attached');
    }
  }

  enrichPageView(data: EnrichPageViewData): void {
    this.pageViewTracker?.enrichCurrentPageView(data);
  }

  flush(): void {
    this.queue.flush('manual');
  }

  destroy(): void {
    this.pageViewTracker?.stop();
    this.errorTracker?.stop();
    this.performanceTracker?.stop();
    this.clickTracker?.stop();
    this.apiTracker.stop();
    this.queue.stop();
    MonitorClient.instance = null;
  }

  getConfig(): MonitorConfig {
    return this.config;
  }

  getTransportEndpoint(): string {
    return this.transport.getEndpoint();
  }

  private shouldSample(): boolean {
    return Math.random() < this.config.sampleRate;
  }

  private getCurrentPath(): string {
    const hash = window.location.hash;
    if (hash.startsWith('#')) {
      const pathPart = hash.slice(1);
      const queryIndex = pathPart.indexOf('?');
      return queryIndex >= 0 ? pathPart.slice(0, queryIndex) : pathPart;
    }
    return window.location.pathname;
  }

  private generateId(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}
