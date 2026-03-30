import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from './env';

export const supabase: SupabaseClient = createClient(
  config.supabase.url,
  config.supabase.serviceRoleKey,
);

export async function testConnection(): Promise<boolean> {
  try {
    const { error } = await supabase.from('apps').select('app_id').limit(1);
    if (error) throw error;
    console.log('[Database] Connected to Supabase successfully');
    return true;
  } catch (err) {
    console.error('[Database] Connection failed:', err);
    return false;
  }
}
