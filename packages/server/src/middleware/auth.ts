import { Request, Response, NextFunction } from 'express';
import { supabase } from '../config/database';

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const apiKey = req.headers['x-api-key'] as string | undefined;
  const appId = req.headers['x-app-id'] as string | undefined;

  if (!appId) {
    res.status(400).json({ error: 'Missing X-App-Id header' });
    return;
  }

  // For event ingestion, API key is optional in development
  if (!apiKey && process.env.NODE_ENV === 'production') {
    res.status(401).json({ error: 'Missing X-Api-Key header' });
    return;
  }

  try {
    if (apiKey) {
      const { data, error } = await supabase
        .from('apps')
        .select('app_id, is_active')
        .eq('app_id', appId)
        .eq('api_key', apiKey)
        .single();

      if (error || !data) {
        res.status(401).json({ error: 'Invalid API key or app ID' });
        return;
      }

      if (!data.is_active) {
        res.status(403).json({ error: 'App is deactivated' });
        return;
      }
    } else {
      // Development mode: just verify app exists
      const { data } = await supabase
        .from('apps')
        .select('app_id')
        .eq('app_id', appId)
        .single();

      if (!data) {
        // Auto-register app in development
        await supabase
          .from('apps')
          .upsert({ app_id: appId, name: appId }, { onConflict: 'app_id' });
      }
    }

    (req as Request & { appId: string }).appId = appId;
    next();
  } catch (err) {
    console.error('[Auth] Error:', err);
    res.status(500).json({ error: 'Authentication failed' });
  }
}
