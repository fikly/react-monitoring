import type { VercelRequest, VercelResponse } from '@vercel/node';
import { cors } from '../../_lib/cors';
import { authenticateDashboard } from '../../_lib/dashboardAuth';
import { getSupabase } from '../../_lib/supabase';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (cors(req, res)) return;

  const user = await authenticateDashboard(req, res);
  if (!user) return;

  const supabase = getSupabase();
  const orgId = req.query.org_id as string | undefined;

  // --- Organization-level operations (no org_id) ---
  if (!orgId) {
    if (req.method === 'GET') {
      return listOrganizations(user, supabase, res);
    }
    if (req.method === 'POST') {
      return createOrganization(user, supabase, req, res);
    }
    res.status(400).json({ error: 'Missing org_id parameter' });
    return;
  }

  // --- Member-level operations (with org_id) ---
  if (!user.isSuperadmin && !user.orgIds.includes(orgId)) {
    res.status(403).json({ error: 'Access denied to this organization' });
    return;
  }

  if (req.method === 'GET') {
    return listMembers(orgId, supabase, res);
  }
  if (req.method === 'POST') {
    return inviteMember(user, orgId, supabase, req, res);
  }
  if (req.method === 'PUT') {
    return updateOrganization(user, orgId, supabase, req, res);
  }
  if (req.method === 'DELETE') {
    const memberId = req.query.member_id as string | undefined;
    if (memberId) {
      return removeMember(user, orgId, memberId, supabase, res);
    }
    return deleteOrganization(user, orgId, supabase, res);
  }

  res.status(405).json({ error: 'Method not allowed' });
}

// --- Organization handlers ---

async function listOrganizations(
  user: { userId: string; isSuperadmin: boolean },
  supabase: ReturnType<typeof getSupabase>,
  res: VercelResponse,
) {
  let orgs;

  if (user.isSuperadmin) {
    const { data, error } = await supabase
      .from('organizations')
      .select('id, name, slug, created_at')
      .order('created_at', { ascending: true });
    if (error) { res.status(500).json({ error: 'Failed to fetch organizations' }); return; }
    orgs = data ?? [];
  } else {
    const { data: memberships } = await supabase
      .from('org_members')
      .select('org_id, role')
      .eq('user_id', user.userId);

    if (!memberships || memberships.length === 0) {
      res.json({ data: [] });
      return;
    }

    const orgIds = memberships.map((m: { org_id: string }) => m.org_id);
    const { data, error } = await supabase
      .from('organizations')
      .select('id, name, slug, created_at')
      .in('id', orgIds)
      .order('created_at', { ascending: true });
    if (error) { res.status(500).json({ error: 'Failed to fetch organizations' }); return; }

    orgs = (data ?? []).map((o) => {
      const membership = memberships.find((m: { org_id: string }) => m.org_id === o.id);
      return { ...o, role: membership?.role ?? 'member' };
    });
  }

  // Get member counts per org
  const orgIds = orgs.map((o: { id: string }) => o.id);
  const { data: allMembers } = await supabase
    .from('org_members')
    .select('org_id')
    .in('org_id', orgIds);

  const counts: Record<string, number> = {};
  for (const m of allMembers ?? []) {
    counts[m.org_id] = (counts[m.org_id] || 0) + 1;
  }

  const result = orgs.map((o: any) => ({
    ...o,
    role: user.isSuperadmin ? 'superadmin' : o.role,
    member_count: counts[o.id] || 0,
  }));

  res.json({ data: result });
}

async function createOrganization(
  user: { userId: string; isSuperadmin: boolean },
  supabase: ReturnType<typeof getSupabase>,
  req: VercelRequest,
  res: VercelResponse,
) {
  const { name, slug } = req.body as { name?: string; slug?: string };
  if (!name || !slug) {
    res.status(400).json({ error: 'Missing name or slug' });
    return;
  }

  if (!/^[a-z0-9-]+$/.test(slug)) {
    res.status(400).json({ error: 'Slug must be lowercase alphanumeric with hyphens only' });
    return;
  }

  const { data: existing } = await supabase
    .from('organizations')
    .select('id')
    .eq('slug', slug)
    .single();

  if (existing) {
    res.status(409).json({ error: 'An organization with this slug already exists' });
    return;
  }

  const { data: org, error } = await supabase
    .from('organizations')
    .insert({ name, slug })
    .select('id, name, slug, created_at')
    .single();

  if (error || !org) {
    res.status(500).json({ error: 'Failed to create organization' });
    return;
  }

  // Make the creator an owner (unless superadmin — they manage all orgs without membership)
  if (!user.isSuperadmin) {
    await supabase
      .from('org_members')
      .insert({ org_id: org.id, user_id: user.userId, role: 'owner' });
  }

  res.status(201).json({ data: { ...org, role: user.isSuperadmin ? 'superadmin' : 'owner', member_count: user.isSuperadmin ? 0 : 1 } });
}

async function updateOrganization(
  user: { userId: string; isSuperadmin: boolean },
  orgId: string,
  supabase: ReturnType<typeof getSupabase>,
  req: VercelRequest,
  res: VercelResponse,
) {
  // Check requester is owner/admin
  if (!user.isSuperadmin) {
    const { data: membership } = await supabase
      .from('org_members')
      .select('role')
      .eq('org_id', orgId)
      .eq('user_id', user.userId)
      .single();
    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      res.status(403).json({ error: 'Only owners and admins can update organizations' });
      return;
    }
  }

  const { name, slug } = req.body as { name?: string; slug?: string };
  const updates: Record<string, string> = {};
  if (name) updates.name = name;
  if (slug) {
    if (!/^[a-z0-9-]+$/.test(slug)) {
      res.status(400).json({ error: 'Slug must be lowercase alphanumeric with hyphens only' });
      return;
    }
    const { data: existing } = await supabase
      .from('organizations')
      .select('id')
      .eq('slug', slug)
      .neq('id', orgId)
      .single();
    if (existing) {
      res.status(409).json({ error: 'An organization with this slug already exists' });
      return;
    }
    updates.slug = slug;
  }

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: 'Nothing to update' });
    return;
  }

  const { data: org, error } = await supabase
    .from('organizations')
    .update(updates)
    .eq('id', orgId)
    .select('id, name, slug, created_at')
    .single();

  if (error) {
    res.status(500).json({ error: 'Failed to update organization' });
    return;
  }

  res.json({ data: org });
}

async function deleteOrganization(
  user: { userId: string; isSuperadmin: boolean },
  orgId: string,
  supabase: ReturnType<typeof getSupabase>,
  res: VercelResponse,
) {
  // Check requester is owner
  if (!user.isSuperadmin) {
    const { data: membership } = await supabase
      .from('org_members')
      .select('role')
      .eq('org_id', orgId)
      .eq('user_id', user.userId)
      .single();
    if (!membership || membership.role !== 'owner') {
      res.status(403).json({ error: 'Only owners can delete organizations' });
      return;
    }
  }

  // Check no apps are linked
  const { data: apps } = await supabase
    .from('apps')
    .select('id')
    .eq('org_id', orgId)
    .limit(1);

  if (apps && apps.length > 0) {
    res.status(400).json({ error: 'Cannot delete organization with apps. Remove or reassign apps first.' });
    return;
  }

  // Delete members first, then org
  await supabase.from('org_members').delete().eq('org_id', orgId);
  const { error } = await supabase.from('organizations').delete().eq('id', orgId);

  if (error) {
    res.status(500).json({ error: 'Failed to delete organization' });
    return;
  }

  res.json({ message: 'Organization deleted' });
}

// --- Member handlers ---

async function listMembers(
  orgId: string,
  supabase: ReturnType<typeof getSupabase>,
  res: VercelResponse,
) {
  const { data: members, error } = await supabase
    .from('org_members')
    .select('id, user_id, role, created_at')
    .eq('org_id', orgId)
    .order('created_at', { ascending: true });

  if (error) { res.status(500).json({ error: 'Failed to fetch members' }); return; }

  const userIds = (members ?? []).map((m: { user_id: string }) => m.user_id);
  const { data: profiles } = await supabase
    .from('user_profiles')
    .select('user_id, display_name')
    .in('user_id', userIds);

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
}

async function inviteMember(
  user: { userId: string; isSuperadmin: boolean },
  orgId: string,
  supabase: ReturnType<typeof getSupabase>,
  req: VercelRequest,
  res: VercelResponse,
) {
  const { email, role = 'member', password } = req.body as { email?: string; role?: string; password?: string };
  if (!email) { res.status(400).json({ error: 'Missing email' }); return; }
  if (!['owner', 'admin', 'member'].includes(role)) {
    res.status(400).json({ error: 'Invalid role' });
    return;
  }

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

  const { data: existingUsers } = await supabase.auth.admin.listUsers();
  const existingUser = existingUsers?.users?.find(u => u.email === email);

  let targetUserId: string;

  if (existingUser) {
    targetUserId = existingUser.id;
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
    if (!password || password.length < 6) {
      res.status(400).json({ error: 'Password is required (min 6 characters) for new users' });
      return;
    }
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (createError || !newUser.user) {
      res.status(500).json({ error: 'Failed to create user: ' + (createError?.message ?? 'Unknown error') });
      return;
    }
    targetUserId = newUser.user.id;

    // Mark user as needing password change on first login
    await supabase
      .from('user_profiles')
      .upsert({ user_id: targetUserId, must_change_password: true }, { onConflict: 'user_id' });
  }

  const { error: memberError } = await supabase
    .from('org_members')
    .insert({ org_id: orgId, user_id: targetUserId, role });

  if (memberError) {
    res.status(500).json({ error: 'Failed to add member' });
    return;
  }

  res.status(201).json({ message: 'Member invited successfully' });
}

async function removeMember(
  user: { userId: string; isSuperadmin: boolean },
  orgId: string,
  memberId: string,
  supabase: ReturnType<typeof getSupabase>,
  res: VercelResponse,
) {
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
}
