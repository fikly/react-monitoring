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

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('display_name, is_superadmin')
    .eq('user_id', user.userId)
    .single();

  // Get orgs with role
  const { data: memberships } = await supabase
    .from('org_members')
    .select('org_id, role')
    .eq('user_id', user.userId);

  let orgs: Array<{ id: string; name: string; slug: string; role: string }> = [];
  if (user.isSuperadmin) {
    const { data } = await supabase.from('organizations').select('id, name, slug');
    orgs = (data ?? []).map((o: Record<string, string>) => ({ ...o, role: 'superadmin' }));
  } else if (memberships && memberships.length > 0) {
    const orgIds = memberships.map((m: { org_id: string }) => m.org_id);
    const { data } = await supabase.from('organizations').select('id, name, slug').in('id', orgIds);
    orgs = (data ?? []).map((o: Record<string, string>) => {
      const membership = memberships.find((m: { org_id: string }) => m.org_id === o.id);
      return { ...o, role: membership?.role ?? 'member' };
    });
  }

  // Get apps
  let apps: Array<{ app_id: string; name: string; org_id: string; is_active: boolean }> = [];
  if (user.isSuperadmin) {
    const { data } = await supabase.from('apps').select('app_id, name, org_id, is_active');
    apps = data ?? [];
  } else {
    const orgIds = orgs.map(o => o.id);
    if (orgIds.length > 0) {
      const { data } = await supabase.from('apps').select('app_id, name, org_id, is_active').in('org_id', orgIds);
      apps = data ?? [];
    }
  }

  res.json({
    user: {
      id: user.userId,
      email: user.email,
      display_name: profile?.display_name ?? user.email,
      is_superadmin: user.isSuperadmin,
    },
    orgs,
    apps,
  });
}
