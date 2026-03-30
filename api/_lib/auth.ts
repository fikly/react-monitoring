import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabase } from './supabase';

export async function authenticate(
  req: VercelRequest,
  res: VercelResponse,
): Promise<string | null> {
  const appId = req.headers['x-app-id'] as string | undefined;
  const apiKey = req.headers['x-api-key'] as string | undefined;

  if (!appId) {
    res.status(400).json({ error: 'Missing X-App-Id header' });
    return null;
  }

  const supabase = getSupabase();

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
        return null;
      }

      if (!data.is_active) {
        res.status(403).json({ error: 'App is deactivated' });
        return null;
      }
    } else if (process.env.NODE_ENV === 'production') {
      res.status(401).json({ error: 'Missing X-Api-Key header' });
      return null;
    } else {
      // Development mode: auto-register app
      const { data } = await supabase
        .from('apps')
        .select('app_id')
        .eq('app_id', appId)
        .single();

      if (!data) {
        await supabase
          .from('apps')
          .upsert({ app_id: appId, name: appId }, { onConflict: 'app_id' });
      }
    }

    return appId;
  } catch (err) {
    console.error('[Auth] Error:', err);
    res.status(500).json({ error: 'Authentication failed' });
    return null;
  }
}
