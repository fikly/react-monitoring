import { supabase } from '../config/database';

export class MetricRepository {
  async upsertHourlyMetric(params: {
    appId: string;
    hour: Date;
    eventType: string;
    path: string | null;
    count: number;
    uniqueSessions: number;
    uniqueUsers: number;
    avgValue?: number;
    p50Value?: number;
    p95Value?: number;
    p99Value?: number;
  }): Promise<void> {
    const { error } = await supabase
      .from('metrics_hourly')
      .upsert(
        {
          app_id: params.appId,
          hour: params.hour.toISOString(),
          event_type: params.eventType,
          path: params.path,
          count: params.count,
          unique_sessions: params.uniqueSessions,
          unique_users: params.uniqueUsers,
          avg_value: params.avgValue ?? null,
          p50_value: params.p50Value ?? null,
          p95_value: params.p95Value ?? null,
          p99_value: params.p99Value ?? null,
        },
        { onConflict: 'app_id,hour,event_type,path' },
      );

    if (error) {
      console.error('[MetricRepository] Hourly upsert error:', error);
      throw error;
    }
  }

  async upsertDailyMetric(params: {
    appId: string;
    day: Date;
    eventType: string;
    path: string | null;
    count: number;
    uniqueSessions: number;
    uniqueUsers: number;
    avgValue?: number;
    p50Value?: number;
    p95Value?: number;
    p99Value?: number;
  }): Promise<void> {
    const { error } = await supabase
      .from('metrics_daily')
      .upsert(
        {
          app_id: params.appId,
          day: params.day.toISOString().split('T')[0],
          event_type: params.eventType,
          path: params.path,
          count: params.count,
          unique_sessions: params.uniqueSessions,
          unique_users: params.uniqueUsers,
          avg_value: params.avgValue ?? null,
          p50_value: params.p50Value ?? null,
          p95_value: params.p95Value ?? null,
          p99_value: params.p99Value ?? null,
        },
        { onConflict: 'app_id,day,event_type,path' },
      );

    if (error) {
      console.error('[MetricRepository] Daily upsert error:', error);
      throw error;
    }
  }

  async queryHourly(params: {
    appId: string;
    from: string;
    to: string;
    eventType: string;
    path?: string;
    limit: number;
    offset: number;
  }): Promise<{ rows: Record<string, unknown>[]; total: number }> {
    let query = supabase
      .from('metrics_hourly')
      .select('hour, count, unique_sessions, unique_users, avg_value, p50_value, p95_value, p99_value', { count: 'exact' })
      .eq('app_id', params.appId)
      .eq('event_type', params.eventType)
      .gte('hour', params.from)
      .lte('hour', params.to)
      .order('hour', { ascending: false })
      .range(params.offset, params.offset + params.limit - 1);

    if (params.path) {
      query = query.ilike('path', params.path.replace('*', '%'));
    }

    const { data, count, error } = await query;

    if (error) {
      console.error('[MetricRepository] Hourly query error:', error);
      return { rows: [], total: 0 };
    }

    return {
      rows: (data || []).map((row) => ({ ...row, period: row.hour })),
      total: count || 0,
    };
  }

  async queryDaily(params: {
    appId: string;
    from: string;
    to: string;
    eventType: string;
    path?: string;
    limit: number;
    offset: number;
  }): Promise<{ rows: Record<string, unknown>[]; total: number }> {
    let query = supabase
      .from('metrics_daily')
      .select('day, count, unique_sessions, unique_users, avg_value, p50_value, p95_value, p99_value', { count: 'exact' })
      .eq('app_id', params.appId)
      .eq('event_type', params.eventType)
      .gte('day', params.from)
      .lte('day', params.to)
      .order('day', { ascending: false })
      .range(params.offset, params.offset + params.limit - 1);

    if (params.path) {
      query = query.ilike('path', params.path.replace('*', '%'));
    }

    const { data, count, error } = await query;

    if (error) {
      console.error('[MetricRepository] Daily query error:', error);
      return { rows: [], total: 0 };
    }

    return {
      rows: (data || []).map((row) => ({ ...row, period: row.day })),
      total: count || 0,
    };
  }
}
