import { MAX_TEXT_LENGTH } from '@web-monitor/shared';
import type { Tracker } from '../types';
import type { MonitorClient } from '../core/MonitorClient';

const INTERACTIVE_SELECTORS = 'button, a, [role="button"], input, select, textarea, [data-track]';

export class ClickTracker implements Tracker {
  private client: MonitorClient;
  private boundHandleClick: ((event: MouseEvent) => void) | null = null;

  constructor(client: MonitorClient) {
    this.client = client;
  }

  start(): void {
    this.boundHandleClick = this.handleClick.bind(this);
    document.addEventListener('click', this.boundHandleClick, { capture: true });
  }

  stop(): void {
    if (this.boundHandleClick) {
      document.removeEventListener('click', this.boundHandleClick, { capture: true });
      this.boundHandleClick = null;
    }
  }

  private handleClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target) return;

    const meaningful = target.closest(INTERACTIVE_SELECTORS) as HTMLElement | null;
    if (!meaningful) return;

    const trackId = meaningful.getAttribute('data-track');
    const tag = meaningful.tagName.toLowerCase();
    const text = this.getElementText(meaningful);

    this.client.track({
      type: 'click',
      properties: {
        tag,
        text: text.substring(0, MAX_TEXT_LENGTH),
        track_id: trackId || undefined,
        class_name: this.getClassName(meaningful),
        id: meaningful.id || undefined,
        path: this.getCurrentPath(),
        href: tag === 'a' ? (meaningful as HTMLAnchorElement).href : undefined,
      },
    });
  }

  private getElementText(element: HTMLElement): string {
    // Prefer data-track-label, then aria-label, then innerText
    const trackLabel = element.getAttribute('data-track-label');
    if (trackLabel) return trackLabel;

    const ariaLabel = element.getAttribute('aria-label');
    if (ariaLabel) return ariaLabel;

    const title = element.getAttribute('title');
    if (title) return title;

    // Get text content, but avoid deeply nested content
    const text = element.innerText || element.textContent || '';
    return text.trim().replace(/\s+/g, ' ');
  }

  private getClassName(element: HTMLElement): string | undefined {
    const className = element.className;
    if (!className) return undefined;
    if (typeof className === 'string') {
      return className.substring(0, MAX_TEXT_LENGTH);
    }
    // SVG elements have className as SVGAnimatedString
    return String(className).substring(0, MAX_TEXT_LENGTH);
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
