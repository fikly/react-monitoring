import type { VercelRequest, VercelResponse } from '@vercel/node';
import { cors } from '../_lib/cors';
import { getSupabase } from '../_lib/supabase';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (cors(req, res)) return;

  try {
    const supabase = getSupabase();
    const { error } = await supabase.from('apps').select('app_id').limit(1);
    const dbOk = !error;

    res.json({
      status: dbOk ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      services: {
        database: dbOk ? 'connected' : 'disconnected',
      },
    });
  } catch {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'disconnected',
      },
    });
  }
}
