import type { MonitorEvent, EventType } from '@web-monitor/shared';

export interface MonitorConfig {
  appId: string;
  endpoint: string;
  batchSize?: number;
  flushInterval?: number;
  enablePageView?: boolean;
  enableErrors?: boolean;
  enablePerformance?: boolean;
  enableClicks?: boolean;
  enableApiTracking?: boolean;
  sampleRate?: number;
  debug?: boolean;
  sanitize?: (data: Record<string, unknown>) => Record<string, unknown>;
  userId?: string;
  metadata?: Record<string, string>;
}

export interface TrackEventInput {
  type: EventType;
  properties: Record<string, unknown>;
  metadata?: Record<string, string>;
}

export interface Tracker {
  start(): void;
  stop(): void;
}

export interface TransportOptions {
  endpoint: string;
  appId: string;
  headers?: Record<string, string>;
}

export type FlushReason = 'batch_full' | 'timer' | 'unload' | 'manual';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface EnrichPageViewData {
  path: string;
  search?: string;
  state?: unknown;
}

export type { MonitorEvent };
