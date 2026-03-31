import type { MonitorEvent } from '@pirates_coder/web-monitor-shared';
import { DEFAULT_BATCH_SIZE, DEFAULT_FLUSH_INTERVAL_MS } from '@pirates_coder/web-monitor-shared';
import { Transport } from './Transport';
import type { FlushReason } from '../types';

const MAX_RETRY_COUNT = 3;
const MAX_QUEUE_SIZE = 500;

type QueuedEvent = MonitorEvent & { __retryCount?: number };

export class EventQueue {
  private queue: QueuedEvent[] = [];
  private transport: Transport;
  private batchSize: number;
  private flushInterval: number;
  private timer: ReturnType<typeof setInterval> | null = null;
  private debug: boolean;

  constructor(
    transport: Transport,
    options?: {
      batchSize?: number;
      flushInterval?: number;
      debug?: boolean;
    },
  ) {
    this.transport = transport;
    this.batchSize = options?.batchSize ?? DEFAULT_BATCH_SIZE;
    this.flushInterval = options?.flushInterval ?? DEFAULT_FLUSH_INTERVAL_MS;
    this.debug = options?.debug ?? false;
  }

  start(): void {
    this.timer = setInterval(() => this.flush('timer'), this.flushInterval);
    this.setupUnloadHandlers();
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.flush('manual');
  }

  push(event: MonitorEvent): void {
    if (this.queue.length >= MAX_QUEUE_SIZE) {
      if (this.debug) {
        console.warn('[WebMonitor] Queue full, dropping oldest event');
      }
      this.queue.shift();
    }

    this.queue.push(event);

    if (this.queue.length >= this.batchSize) {
      this.flush('batch_full');
    }
  }

  async flush(reason: FlushReason): Promise<void> {
    if (this.queue.length === 0) return;

    const batch = this.queue.splice(0, this.batchSize);

    if (this.debug) {
      console.log(`[WebMonitor] Flushing ${batch.length} events (${reason})`);
    }

    if (reason === 'unload') {
      this.transport.sendOnUnload(batch);
      return;
    }

    const success = await this.transport.send(batch);

    if (!success) {
      // Re-queue failed events if under retry limit
      const retryable = batch.filter((e) => {
        const retryCount = e.__retryCount ?? 0;
        if (retryCount < MAX_RETRY_COUNT) {
          e.__retryCount = retryCount + 1;
          return true;
        }
        return false;
      });

      if (retryable.length > 0) {
        this.queue.unshift(...retryable);
        if (this.debug) {
          console.warn(`[WebMonitor] Re-queued ${retryable.length} events for retry`);
        }
      }
    }
  }

  getQueueSize(): number {
    return this.queue.length;
  }

  private setupUnloadHandlers(): void {
    const handleUnload = () => {
      this.flush('unload');
    };

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        handleUnload();
      }
    });

    window.addEventListener('pagehide', handleUnload);
  }
}
