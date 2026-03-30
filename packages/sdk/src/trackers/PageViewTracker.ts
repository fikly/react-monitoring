import type { Tracker, EnrichPageViewData } from '../types';
import type { MonitorClient } from '../core/MonitorClient';

export class PageViewTracker implements Tracker {
  private client: MonitorClient;
  private currentPath = '';
  private entryTime = 0;
  private boundHandleNavigation: (() => void) | null = null;
  private originalPushState: typeof history.pushState | null = null;
  private originalReplaceState: typeof history.replaceState | null = null;

  constructor(client: MonitorClient) {
    this.client = client;
  }

  start(): void {
    this.recordEntry(this.getCurrentPath());

    this.boundHandleNavigation = this.handleNavigation.bind(this);

    // Listen to native events
    window.addEventListener('hashchange', this.boundHandleNavigation);
    window.addEventListener('popstate', this.boundHandleNavigation);

    // Patch pushState/replaceState — React Router v6's createHashRouter
    // uses these internally and does NOT fire hashchange/popstate
    this.originalPushState = history.pushState.bind(history);
    this.originalReplaceState = history.replaceState.bind(history);

    const self = this;

    history.pushState = function (...args: Parameters<typeof history.pushState>) {
      self.originalPushState!(...args);
      self.handleNavigation();
    };

    history.replaceState = function (...args: Parameters<typeof history.replaceState>) {
      self.originalReplaceState!(...args);
      self.handleNavigation();
    };
  }

  stop(): void {
    if (this.boundHandleNavigation) {
      window.removeEventListener('hashchange', this.boundHandleNavigation);
      window.removeEventListener('popstate', this.boundHandleNavigation);
      this.boundHandleNavigation = null;
    }

    // Restore original history methods
    if (this.originalPushState) {
      history.pushState = this.originalPushState;
      this.originalPushState = null;
    }
    if (this.originalReplaceState) {
      history.replaceState = this.originalReplaceState;
      this.originalReplaceState = null;
    }

    this.recordExit();
  }

  enrichCurrentPageView(data: EnrichPageViewData): void {
    if (data.path === this.currentPath) {
      this.client.track({
        type: 'page_view',
        properties: {
          path: data.path,
          search: data.search,
          enriched: true,
          title: document.title,
        },
      });
    }
  }

  private handleNavigation(): void {
    const newPath = this.getCurrentPath();
    if (newPath !== this.currentPath) {
      this.recordExit();
      this.recordEntry(newPath);
    }
  }

  private recordEntry(path: string): void {
    this.currentPath = path;
    this.entryTime = Date.now();

    this.client.track({
      type: 'page_view',
      properties: {
        path,
        referrer: document.referrer,
        title: document.title,
      },
    });
  }

  private recordExit(): void {
    if (this.currentPath && this.entryTime) {
      const duration = Date.now() - this.entryTime;
      this.client.track({
        type: 'page_exit',
        properties: {
          path: this.currentPath,
          duration_ms: duration,
        },
      });
    }
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
}
