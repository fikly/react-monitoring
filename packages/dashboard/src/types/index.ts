export interface DateRange {
  from: string;
  to: string;
}

export interface QueryFilters extends DateRange {
  app_id: string;
  group_by?: 'hour' | 'day' | 'path';
  path?: string;
  event_type?: string;
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
  [key: string]: unknown;
}

export interface AnalyticsResponse {
  data: MetricRow[];
  total: number;
  query: QueryFilters;
}

export interface RawEvent {
  id: string;
  event_type: string;
  session_id: string;
  user_id?: string;
  path: string;
  properties: Record<string, unknown>;
  created_at: string;
}

export interface StatCard {
  title: string;
  value: number | string;
  change?: number;
  suffix?: string;
  icon?: React.ReactNode;
}
