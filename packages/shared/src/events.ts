export type EventType =
  | 'page_view'
  | 'page_exit'
  | 'click'
  | 'error'
  | 'api_call'
  | 'performance'
  | 'custom';

export interface MonitorEvent {
  id: string;
  type: EventType;
  app_id: string;
  session_id: string;
  user_id?: string;
  timestamp: string;
  url: string;
  path: string;
  user_agent: string;
  screen_resolution?: string;
  viewport_size?: string;
  properties: Record<string, unknown>;
  metadata?: Record<string, string>;
}

export interface PageViewProperties {
  path: string;
  referrer: string;
  title: string;
}

export interface PageExitProperties {
  path: string;
  duration_ms: number;
}

export interface ClickProperties {
  tag: string;
  text: string;
  track_id?: string;
  class_name?: string;
  path: string;
}

export interface ErrorProperties {
  error_type: 'runtime' | 'unhandled_rejection' | 'react_boundary' | 'api';
  message: string;
  stack?: string;
  filename?: string;
  lineno?: number;
  colno?: number;
  component_stack?: string;
}

export interface ApiCallProperties {
  method: string;
  url: string;
  status?: number;
  duration_ms?: number;
  is_error: boolean;
  error_message?: string;
}

export interface PerformanceProperties {
  metric_name: 'CLS' | 'FID' | 'FCP' | 'LCP' | 'TTFB' | 'INP';
  metric_value: number;
  metric_id: string;
  navigation_type?: string;
}

export interface CustomEventProperties {
  action: string;
  category?: string;
  label?: string;
  value?: number;
  [key: string]: unknown;
}

export interface BatchEventPayload {
  events: MonitorEvent[];
}

export interface BatchEventResponse {
  accepted: number;
  rejected: number;
  errors: Array<{ index: number; reason: string }>;
}

export interface AnalyticsQueryParams {
  app_id: string;
  from: string;
  to: string;
  group_by?: 'hour' | 'day' | 'path' | 'message' | 'url' | 'status' | 'track_id';
  path?: string;
  event_type?: EventType;
  limit?: number;
  offset?: number;
}

export interface MetricRow {
  period: string;
  count: number;
  unique_sessions: number;
  unique_users: number;
  avg_value?: number;
  p50_value?: number;
  p95_value?: number;
  p99_value?: number;
}

export interface AnalyticsResponse {
  data: MetricRow[];
  total: number;
  query: AnalyticsQueryParams;
}
