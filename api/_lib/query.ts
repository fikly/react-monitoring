import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { getSupabase } from './supabase';

const queryParamsSchema = z.object({
  app_id: z.string(),
  from: z.string().datetime(),
  to: z.string().datetime(),
  group_by: z.enum(['hour', 'day', 'path', 'message', 'url', 'status', 'track_id']).optional(),
  path: z.string().optional(),
  event_type: z.enum(['page_view', 'page_exit', 'click', 'error', 'api_call', 'performance', 'custom']).optional(),
  limit: z.coerce.number().int().min(1).max(1000).default(100),
  offset: z.coerce.number().int().min(0).default(0),
});

export async function queryAnalytics(
  req: VercelRequest,
  res: VercelResponse,
  eventType: string,
) {
  const validation = queryParamsSchema.safeParse(req.query);
  if (!validation.success) {
    const errors = validation.error.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    }));
    res.status(400).json({ error: 'Invalid query parameters', details: errors });
    return;
  }

  const params = validation.data;
  const supabase = getSupabase();

  try {
    const timeRangeHours = (new Date(params.to).getTime() - new Date(params.from).getTime()) / (1000 * 60 * 60);
    const groupBy = params.group_by || (timeRangeHours > 24 ? 'day' : 'hour');

    // Try pre-aggregated metrics for larger time ranges
    if (timeRangeHours > 24 && (groupBy === 'day' || groupBy === 'hour')) {
      const table = groupBy === 'day' ? 'metrics_daily' : 'metrics_hourly';
      const timeCol = groupBy === 'day' ? 'day' : 'hour';

      let query = supabase
        .from(table)
        .select(`${timeCol}, count, unique_sessions, unique_users, avg_value, p50_value, p95_value, p99_value`, { count: 'exact' })
        .eq('app_id', params.app_id)
        .eq('event_type', eventType)
        .gte(timeCol, params.from)
        .lte(timeCol, params.to)
        .order(timeCol, { ascending: false })
        .range(params.offset, params.offset + params.limit - 1);

      if (params.path) {
        query = query.ilike('path', params.path.replace('*', '%'));
      }

      const { data, count, error } = await query;

      if (!error && data && data.length > 0) {
        res.json({
          data: data.map((row: Record<string, unknown>) => ({
            period: String(row[timeCol]),
            count: Number(row.count || 0),
            unique_sessions: Number(row.unique_sessions || 0),
            unique_users: Number(row.unique_users || 0),
            avg_value: row.avg_value ? Number(row.avg_value) : undefined,
            p50_value: row.p50_value ? Number(row.p50_value) : undefined,
            p95_value: row.p95_value ? Number(row.p95_value) : undefined,
            p99_value: row.p99_value ? Number(row.p99_value) : undefined,
          })),
          total: count || 0,
          query: params,
        });
        return;
      }
    }

    // Fall back to raw events with RPC for grouped queries
    if (groupBy === 'day' || groupBy === 'hour' || groupBy === 'path') {
      const { data, error } = await supabase.rpc('query_events_grouped', {
        p_app_id: params.app_id,
        p_from: params.from,
        p_to: params.to,
        p_event_type: eventType,
        p_path: params.path || null,
        p_group_by: groupBy,
        p_limit: params.limit,
        p_offset: params.offset,
      });

      if (error) {
        console.error('[Query] RPC error:', error);
        res.status(500).json({ error: 'Query failed' });
        return;
      }

      // Get total
      let countQuery = supabase
        .from('events')
        .select('*', { count: 'exact', head: true })
        .eq('app_id', params.app_id)
        .eq('event_type', eventType)
        .gte('created_at', params.from)
        .lte('created_at', params.to);

      if (params.path) {
        countQuery = countQuery.ilike('path', params.path.replace('*', '%'));
      }

      const { count } = await countQuery;

      res.json({
        data: (data || []).map((row: Record<string, unknown>) => ({
          period: String(row.period || ''),
          count: Number(row.count || 0),
          unique_sessions: Number(row.unique_sessions || 0),
          unique_users: Number(row.unique_users || 0),
          avg_value: row.avg_value ? Number(row.avg_value) : undefined,
          p50_value: row.p50_value ? Number(row.p50_value) : undefined,
          p95_value: row.p95_value ? Number(row.p95_value) : undefined,
          p99_value: row.p99_value ? Number(row.p99_value) : undefined,
        })),
        total: count || 0,
        query: params,
      });
      return;
    }

    // Ungrouped: list raw events
    let query = supabase
      .from('events')
      .select('id, event_type, session_id, user_id, path, url, properties, metadata, user_agent, client_timestamp, created_at', { count: 'exact' })
      .eq('app_id', params.app_id)
      .eq('event_type', eventType)
      .gte('created_at', params.from)
      .lte('created_at', params.to)
      .order('created_at', { ascending: false })
      .range(params.offset, params.offset + params.limit - 1);

    if (params.path) {
      query = query.ilike('path', params.path.replace('*', '%'));
    }

    const { data, count, error } = await query;

    if (error) {
      console.error('[Query] Error:', error);
      res.status(500).json({ error: 'Query failed' });
      return;
    }

    res.json({
      data: (data || []).map((row: Record<string, unknown>) => ({
        period: String(row.created_at || ''),
        count: 1,
        unique_sessions: 1,
        unique_users: row.user_id ? 1 : 0,
      })),
      total: count || 0,
      query: params,
    });
  } catch (err) {
    console.error('[Query] Error:', err);
    res.status(500).json({ error: 'Query failed' });
  }
}

export async function queryRawEvents(
  req: VercelRequest,
  res: VercelResponse,
) {
  const validation = queryParamsSchema.safeParse(req.query);
  if (!validation.success) {
    res.status(400).json({ error: 'Invalid query parameters', details: validation.error.issues });
    return;
  }

  const params = validation.data;
  const supabase = getSupabase();

  let query = supabase
    .from('events')
    .select('id, app_id, event_type, session_id, user_id, path, url, properties, metadata, user_agent, screen_resolution, viewport_size, client_timestamp, created_at', { count: 'exact' })
    .eq('app_id', params.app_id)
    .gte('created_at', params.from)
    .lte('created_at', params.to)
    .order('created_at', { ascending: false })
    .range(params.offset, params.offset + params.limit - 1);

  if (params.event_type) {
    query = query.eq('event_type', params.event_type);
  }
  if (params.path) {
    query = query.ilike('path', params.path.replace('*', '%'));
  }

  const { data, count, error } = await query;

  if (error) {
    console.error('[Query] Raw events error:', error);
    res.status(500).json({ error: 'Query failed' });
    return;
  }

  res.json({
    data: data || [],
    total: count || 0,
    query: params,
  });
}
