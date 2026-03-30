import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabase } from './supabase';

export interface DashboardUser {
  userId: string;
  email: string;
  isSuperadmin: boolean;
  orgIds: string[];
  allowedAppIds: string[];
}

export async function authenticateDashboard(
  req: VercelRequest,
  res: VercelResponse,
): Promise<DashboardUser | null> {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid Authorization header' });
    return null;
  }

  const token = authHeader.slice(7);
  const supabase = getSupabase();

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return null;
  }

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('is_superadmin')
    .eq('user_id', user.id)
    .single();

  const isSuperadmin = profile?.is_superadmin ?? false;

  if (isSuperadmin) {
    const { data: allApps } = await supabase.from('apps').select('app_id');
    return {
      userId: user.id,
      email: user.email!,
      isSuperadmin: true,
      orgIds: [],
      allowedAppIds: (allApps ?? []).map((a: { app_id: string }) => a.app_id),
    };
  }

  const { data: memberships } = await supabase
    .from('org_members')
    .select('org_id')
    .eq('user_id', user.id);

  if (!memberships || memberships.length === 0) {
    res.status(403).json({ error: 'User does not belong to any organization' });
    return null;
  }

  const orgIds = memberships.map((m: { org_id: string }) => m.org_id);

  const { data: apps } = await supabase
    .from('apps')
    .select('app_id')
    .in('org_id', orgIds);

  return {
    userId: user.id,
    email: user.email!,
    isSuperadmin: false,
    orgIds,
    allowedAppIds: (apps ?? []).map((a: { app_id: string }) => a.app_id),
  };
}

export function authorizeAppAccess(
  user: DashboardUser,
  requestedAppId: string,
  res: VercelResponse,
): boolean {
  if (user.isSuperadmin) return true;
  if (user.allowedAppIds.includes(requestedAppId)) return true;
  res.status(403).json({ error: 'Access denied to this app' });
  return false;
}
