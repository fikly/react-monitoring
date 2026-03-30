import type { VercelRequest, VercelResponse } from '@vercel/node';
import { cors } from '../../_lib/cors';
import { authenticateDashboard } from '../../_lib/dashboardAuth';
import { getSupabase } from '../../_lib/supabase';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (cors(req, res)) return;

  const user = await authenticateDashboard(req, res);
  if (!user) return;

  const supabase = getSupabase();
  const orgId = req.query.org_id as string;

  if (!orgId) {
    res.status(400).json({ error: 'Missing org_id parameter' });
    return;
  }

  // Check access to org
  if (!user.isSuperadmin && !user.orgIds.includes(orgId)) {
    res.status(403).json({ error: 'Access denied to this organization' });
    return;
  }

  if (req.method === 'GET') {
    const { data: members, error } = await supabase
      .from('org_members')
      .select('id, user_id, role, created_at')
      .eq('org_id', orgId)
      .order('created_at', { ascending: true });

    if (error) { res.status(500).json({ error: 'Failed to fetch members' }); return; }

    // Get user emails from profiles
    const userIds = (members ?? []).map((m: { user_id: string }) => m.user_id);
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('user_id, display_name')
      .in('user_id', userIds);

    // Get emails from auth (using admin API via service role)
    const enrichedMembers = await Promise.all(
      (members ?? []).map(async (m: { id: string; user_id: string; role: string; created_at: string }) => {
        const profile = (profiles ?? []).find((p: { user_id: string }) => p.user_id === m.user_id);
        const { data: { user: authUser } } = await supabase.auth.admin.getUserById(m.user_id);
        return {
          ...m,
          email: authUser?.email ?? '',
          display_name: profile?.display_name ?? '',
        };
      })
    );

    res.json({ data: enrichedMembers });
    return;
  }

  if (req.method === 'POST') {
    // Invite user: create auth user + org_members entry
    const { email, role = 'member' } = req.body as { email?: string; role?: string };
    if (!email) { res.status(400).json({ error: 'Missing email' }); return; }
    if (!['owner', 'admin', 'member'].includes(role)) {
      res.status(400).json({ error: 'Invalid role' });
      return;
    }

    // Check requester is owner/admin
    if (!user.isSuperadmin) {
      const { data: membership } = await supabase
        .from('org_members')
        .select('role')
        .eq('org_id', orgId)
        .eq('user_id', user.userId)
        .single();
      if (!membership || !['owner', 'admin'].includes(membership.role)) {
        res.status(403).json({ error: 'Only owners and admins can invite members' });
        return;
      }
    }

    // Check if user already exists in auth
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === email);

    let targetUserId: string;

    if (existingUser) {
      targetUserId = existingUser.id;
      // Check if already a member
      const { data: existing } = await supabase
        .from('org_members')
        .select('id')
        .eq('org_id', orgId)
        .eq('user_id', targetUserId)
        .single();
      if (existing) {
        res.status(409).json({ error: 'User is already a member of this organization' });
        return;
      }
    } else {
      // Create new auth user with a random password (they'll need to reset)
      const tempPassword = crypto.randomUUID() + 'A1!';
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
      });
      if (createError || !newUser.user) {
        res.status(500).json({ error: 'Failed to create user: ' + (createError?.message ?? 'Unknown error') });
        return;
      }
      targetUserId = newUser.user.id;
    }

    // Add to org
    const { error: memberError } = await supabase
      .from('org_members')
      .insert({ org_id: orgId, user_id: targetUserId, role });

    if (memberError) {
      res.status(500).json({ error: 'Failed to add member' });
      return;
    }

    res.status(201).json({ message: 'Member invited successfully' });
    return;
  }

  if (req.method === 'DELETE') {
    const memberId = req.query.member_id as string;
    if (!memberId) { res.status(400).json({ error: 'Missing member_id parameter' }); return; }

    // Check requester is owner/admin
    if (!user.isSuperadmin) {
      const { data: membership } = await supabase
        .from('org_members')
        .select('role')
        .eq('org_id', orgId)
        .eq('user_id', user.userId)
        .single();
      if (!membership || !['owner', 'admin'].includes(membership.role)) {
        res.status(403).json({ error: 'Only owners and admins can remove members' });
        return;
      }
    }

    const { error } = await supabase
      .from('org_members')
      .delete()
      .eq('id', memberId)
      .eq('org_id', orgId);

    if (error) { res.status(500).json({ error: 'Failed to remove member' }); return; }

    res.json({ message: 'Member removed' });
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
}
