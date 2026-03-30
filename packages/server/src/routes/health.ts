import { Router, Request, Response } from 'express';
import { supabase } from '../config/database';

const router = Router();

router.get('/health', async (_req: Request, res: Response) => {
  try {
    const { error } = await supabase.from('apps').select('app_id').limit(1);
    const dbOk = !error;

    res.json({
      status: dbOk ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      services: {
        database: dbOk ? 'connected' : 'disconnected',
      },
      uptime: process.uptime(),
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
});

export default router;
