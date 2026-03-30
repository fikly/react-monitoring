import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { cors } from '../../_lib/cors';
import { authenticate } from '../../_lib/auth';
import { getSupabase } from '../../_lib/supabase';

const eventSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(['page_view', 'page_exit', 'click', 'error', 'api_call', 'performance', 'custom']),
  app_id: z.string().max(64),
  session_id: z.string().max(64),
  user_id: z.string().max(255).optional(),
  timestamp: z.string().datetime(),
  url: z.string().max(2048),
  path: z.string().max(1024),
  user_agent: z.string().max(500).optional(),
  screen_resolution: z.string().max(20).optional(),
  viewport_size: z.string().max(20).optional(),
  properties: z.record(z.unknown()).default({}),
  metadata: z.record(z.string()).optional(),
});

const batchSchema = z.object({
  events: z.array(eventSchema).min(1).max(100),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (cors(req, res)) return;

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const appId = await authenticate(req, res);
  if (!appId) return;

  // Validate
  const validation = batchSchema.safeParse(req.body);
  if (!validation.success) {
    const errors = validation.error.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    }));
    res.status(400).json({ error: 'Validation failed', details: errors });
    return;
  }

  try {
    const supabase = getSupabase();
    const events = validation.data.events;

    const rows = events.map((event) => ({
      id: event.id,
      app_id: appId,
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
    }));

    const { error } = await supabase.from('events').insert(rows);

    if (error) {
      console.error('[Ingest] Error:', error);
      res.status(500).json({ error: 'Failed to process events' });
      return;
    }

    // Update sessions asynchronously (best effort)
    const sessionMap = new Map<string, typeof events[0]>();
    for (const event of events) {
      const existing = sessionMap.get(event.session_id);
      if (!existing || event.timestamp > existing.timestamp) {
        sessionMap.set(event.session_id, event);
      }
    }

    for (const event of sessionMap.values()) {
      const { data: existingSession } = await supabase
        .from('sessions')
        .select('session_id, event_count, page_count')
        .eq('session_id', event.session_id)
        .single();

      if (existingSession) {
        await supabase
          .from('sessions')
          .update({
            last_activity: event.timestamp,
            event_count: (existingSession.event_count || 0) + 1,
            page_count: event.type === 'page_view'
              ? (existingSession.page_count || 0) + 1
              : existingSession.page_count,
            is_active: true,
          })
          .eq('session_id', event.session_id);
      } else {
        await supabase
          .from('sessions')
          .insert({
            session_id: event.session_id,
            app_id: appId,
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

    res.status(202).json({
      accepted: rows.length,
      rejected: 0,
      errors: [],
    });
  } catch (err) {
    console.error('[Ingest] Error:', err);
    res.status(500).json({ error: 'Failed to process events' });
  }
}
