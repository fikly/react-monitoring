import type { VercelRequest, VercelResponse } from '@vercel/node';
import { cors } from '../../_lib/cors';
import { authenticate } from '../../_lib/auth';
import { getSupabase } from '../../_lib/supabase';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (cors(req, res)) return;
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const appId = await authenticate(req, res);
  if (!appId) return;

  const supabase = getSupabase();

  try {
    // Hourly aggregation for the last hour
    const hour = new Date();
    hour.setMinutes(0, 0, 0);
    const prevHour = new Date(hour.getTime() - 60 * 60 * 1000);

    const { data: hourlyData, error: hourlyError } = await supabase.rpc('aggregate_hourly_metrics', {
      p_from: prevHour.toISOString(),
      p_to: hour.toISOString(),
    });

    if (hourlyError) {
      console.error('[Aggregation] Hourly error:', hourlyError);
    }

    for (const row of (hourlyData || [])) {
      await supabase.from('metrics_hourly').upsert({
        app_id: row.app_id,
        hour: prevHour.toISOString(),
        event_type: row.event_type,
        path: row.path,
        count: row.count,
        unique_sessions: row.unique_sessions,
        unique_users: row.unique_users,
        avg_value: row.avg_value,
        p50_value: row.p50_value,
        p95_value: row.p95_value,
        p99_value: row.p99_value,
      }, { onConflict: 'app_id,hour,event_type,path' });
    }

    // Daily aggregation for yesterday
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

    const { data: dailyData, error: dailyError } = await supabase.rpc('aggregate_daily_metrics', {
      p_from: yesterday.toISOString(),
      p_to: today.toISOString(),
    });

    if (dailyError) {
      console.error('[Aggregation] Daily error:', dailyError);
    }

    for (const row of (dailyData || [])) {
      await supabase.from('metrics_daily').upsert({
        app_id: row.app_id,
        day: yesterday.toISOString().split('T')[0],
        event_type: row.event_type,
        path: row.path,
        count: row.count,
        unique_sessions: row.unique_sessions,
        unique_users: row.unique_users,
        avg_value: row.avg_value,
        p50_value: row.p50_value,
        p95_value: row.p95_value,
        p99_value: row.p99_value,
      }, { onConflict: 'app_id,day,event_type,path' });
    }

    res.json({ status: 'ok', message: 'Aggregation completed' });
  } catch (err) {
    console.error('[Aggregation] Error:', err);
    res.status(500).json({ error: 'Aggregation failed' });
  }
}
