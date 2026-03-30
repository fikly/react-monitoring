import type { VercelRequest, VercelResponse } from '@vercel/node';
import { cors } from '../../_lib/cors';
import { authenticateDashboard } from '../../_lib/dashboardAuth';
import { getSupabase } from '../../_lib/supabase';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (cors(req, res)) return;
  if (req.method !== 'GET') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const user = await authenticateDashboard(req, res);
  if (!user) return;

  const supabase = getSupabase();

  if (user.isSuperadmin) {
    const { data, error } = await supabase
      .from('organizations')
      .select('id, name, slug, created_at')
      .order('created_at', { ascending: false });
    if (error) { res.status(500).json({ error: 'Failed to fetch organizations' }); return; }
    res.json({ data });
    return;
  }

  const { data: memberships } = await supabase
    .from('org_members')
    .select('org_id, role')
    .eq('user_id', user.userId);

  if (!memberships || memberships.length === 0) {
    res.json({ data: [] });
    return;
  }

  const orgIds = memberships.map((m: { org_id: string }) => m.org_id);
  const { data: orgs, error } = await supabase
    .from('organizations')
    .select('id, name, slug, created_at')
    .in('id', orgIds)
    .order('created_at', { ascending: false });

  if (error) { res.status(500).json({ error: 'Failed to fetch organizations' }); return; }

  const result = (orgs ?? []).map((o: Record<string, string>) => {
    const membership = memberships.find((m: { org_id: string }) => m.org_id === o.id);
    return { ...o, role: membership?.role ?? 'member' };
  });

  res.json({ data: result });
}
