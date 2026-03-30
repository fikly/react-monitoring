import { supabase } from '../config/database';
import type { MonitorEvent } from '@web-monitor/shared';

export class EventRepository {
  async insertBatch(
    events: MonitorEvent[],
  ): Promise<{ inserted: number; errors: Array<{ index: number; reason: string }> }> {
    const errors: Array<{ index: number; reason: string }> = [];
    let inserted = 0;

    const rows = events.map((event, i) => {
      try {
        return {
          id: event.id,
          app_id: event.app_id,
          session_id: event.session_id,
          user_id: event.user_id || null,
          event_type: event.type,
          url: event.url,
          path: event.path,
          user_agent: event.user_agent || null,
          screen_resolution: event.screen_resolution || null,
          viewport_size: event.viewport_size || null,
          properties: event.properties,
          metadata: event.metadata || {},
          client_timestamp: event.timestamp,
        };
      } catch (err) {
        errors.push({
          index: i,
          reason: err instanceof Error ? err.message : 'Unknown error',
        });
        return null;
      }
    }).filter(Boolean);

    if (rows.length > 0) {
      const { error, count } = await supabase
        .from('events')
        .insert(rows);

      if (error) {
        console.error('[EventRepository] Batch insert error:', error);
        // Try inserting one by one to identify individual failures
        for (let i = 0; i < rows.length; i++) {
          const { error: rowError } = await supabase
            .from('events')
            .insert(rows[i]!);
          if (rowError) {
            errors.push({ index: i, reason: rowError.message });
          } else {
            inserted++;
          }
        }
      } else {
        inserted = rows.length;
      }
    }

    return { inserted, errors };
  }

  async upsertSession(event: MonitorEvent): Promise<void> {
    // Try to get existing session
    const { data: existing } = await supabase
      .from('sessions')
      .select('session_id, event_count, page_count')
      .eq('session_id', event.session_id)
      .single();

    if (existing) {
      await supabase
        .from('sessions')
        .update({
          last_activity: event.timestamp,
          user_id: event.user_id || existing.session_id ? undefined : null,
          event_count: (existing.event_count || 0) + 1,
          page_count: event.type === 'page_view'
            ? (existing.page_count || 0) + 1
            : existing.page_count,
          is_active: true,
        })
        .eq('session_id', event.session_id);
    } else {
      await supabase
        .from('sessions')
        .insert({
          session_id: event.session_id,
          app_id: event.app_id,
          user_id: event.user_id || null,
          started_at: event.timestamp,
          last_activity: event.timestamp,
          user_agent: event.user_agent || null,
          screen_resolution: event.screen_resolution || null,
          page_count: event.type === 'page_view' ? 1 : 0,
          event_count: 1,
        });
    }
  }

  async queryEvents(params: {
    appId: string;
    from: string;
    to: string;
    eventType?: string;
    path?: string;
    groupBy?: string;
    limit: number;
    offset: number;
  }): Promise<{ rows: Record<string, unknown>[]; total: number }> {
    // For grouped queries, use Supabase RPC (database functions)
    // For ungrouped, use standard queries
    if (params.groupBy === 'day' || params.groupBy === 'hour' || params.groupBy === 'path') {
      const { data, error } = await supabase.rpc('query_events_grouped', {
        p_app_id: params.appId,
        p_from: params.from,
        p_to: params.to,
        p_event_type: params.eventType || null,
        p_path: params.path || null,
        p_group_by: params.groupBy,
        p_limit: params.limit,
        p_offset: params.offset,
      });

      if (error) {
        console.error('[EventRepository] Query error:', error);
        return { rows: [], total: 0 };
      }

      // Get total count
      const { count } = await supabase
        .from('events')
        .select('*', { count: 'exact', head: true })
        .eq('app_id', params.appId)
        .gte('created_at', params.from)
        .lte('created_at', params.to)
        .then((res) => {
          if (params.eventType) {
            return supabase
              .from('events')
              .select('*', { count: 'exact', head: true })
              .eq('app_id', params.appId)
              .eq('event_type', params.eventType)
              .gte('created_at', params.from)
              .lte('created_at', params.to);
          }
          return res;
        });

      return { rows: data || [], total: count || 0 };
    }

    // Ungrouped query - list raw events
    let query = supabase
      .from('events')
      .select('id, event_type, session_id, user_id, path, url, properties, metadata, user_agent, client_timestamp, created_at', { count: 'exact' })
      .eq('app_id', params.appId)
      .gte('created_at', params.from)
      .lte('created_at', params.to)
      .order('created_at', { ascending: false })
      .range(params.offset, params.offset + params.limit - 1);

    if (params.eventType) {
      query = query.eq('event_type', params.eventType);
    }
    if (params.path) {
      query = query.ilike('path', params.path.replace('*', '%'));
    }

    const { data, count, error } = await query;

    if (error) {
      console.error('[EventRepository] Query error:', error);
      return { rows: [], total: 0 };
    }

    return { rows: data || [], total: count || 0 };
  }

  async queryRawEvents(params: {
    appId: string;
    from: string;
    to: string;
    eventType?: string;
    path?: string;
    limit: number;
    offset: number;
  }): Promise<{ rows: Record<string, unknown>[]; total: number }> {
    let query = supabase
      .from('events')
      .select('id, app_id, event_type, session_id, user_id, path, url, properties, metadata, user_agent, screen_resolution, viewport_size, client_timestamp, created_at', { count: 'exact' })
      .eq('app_id', params.appId)
      .gte('created_at', params.from)
      .lte('created_at', params.to)
      .order('created_at', { ascending: false })
      .range(params.offset, params.offset + params.limit - 1);

    if (params.eventType) {
      query = query.eq('event_type', params.eventType);
    }
    if (params.path) {
      query = query.ilike('path', params.path.replace('*', '%'));
    }

    const { data, count, error } = await query;

    if (error) {
      console.error('[EventRepository] Raw query error:', error);
      return { rows: [], total: 0 };
    }

    return { rows: data || [], total: count || 0 };
  }
}
