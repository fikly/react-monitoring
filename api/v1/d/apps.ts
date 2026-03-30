import type { VercelRequest, VercelResponse } from '@vercel/node';
import { cors } from '../../_lib/cors';
import { authenticateDashboard } from '../../_lib/dashboardAuth';
import { getSupabase } from '../../_lib/supabase';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (cors(req, res)) return;

  const user = await authenticateDashboard(req, res);
  if (!user) return;

  const supabase = getSupabase();

  if (req.method === 'GET') {
    let apps;
    if (user.isSuperadmin) {
      const { data, error } = await supabase
        .from('apps')
        .select('id, app_id, name, api_key, org_id, is_active, created_at')
        .order('created_at', { ascending: false });
      if (error) { res.status(500).json({ error: 'Failed to fetch apps' }); return; }
      apps = data;
    } else {
      const { data, error } = await supabase
        .from('apps')
        .select('id, app_id, name, api_key, org_id, is_active, created_at')
        .in('org_id', user.orgIds)
        .order('created_at', { ascending: false });
      if (error) { res.status(500).json({ error: 'Failed to fetch apps' }); return; }
      apps = data;
    }
    res.json({ data: apps });
    return;
  }

  if (req.method === 'POST') {
    const { org_id, app_id, name } = req.body as { org_id?: string; app_id?: string; name?: string };
    if (!org_id || !app_id || !name) {
      res.status(400).json({ error: 'Missing org_id, app_id, or name' });
      return;
    }

    // Check user has owner/admin role in this org (or is superadmin)
    if (!user.isSuperadmin) {
      if (!user.orgIds.includes(org_id)) {
        res.status(403).json({ error: 'Access denied to this organization' });
        return;
      }
      const { data: membership } = await supabase
        .from('org_members')
        .select('role')
        .eq('org_id', org_id)
        .eq('user_id', user.userId)
        .single();
      if (!membership || !['owner', 'admin'].includes(membership.role)) {
        res.status(403).json({ error: 'Only owners and admins can create apps' });
        return;
      }
    }

    const { data, error } = await supabase
      .from('apps')
      .insert({ app_id, name, org_id })
      .select('id, app_id, name, api_key, org_id, is_active, created_at')
      .single();

    if (error) {
      if (error.code === '23505') {
        res.status(409).json({ error: 'App ID already exists' });
        return;
      }
      res.status(500).json({ error: 'Failed to create app' });
      return;
    }

    res.status(201).json({ data });
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
}
