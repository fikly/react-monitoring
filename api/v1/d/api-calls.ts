import type { VercelRequest, VercelResponse } from '@vercel/node';
import { cors } from '../../_lib/cors';
import { authenticateDashboard, authorizeAppAccess } from '../../_lib/dashboardAuth';
import { queryAnalytics } from '../../_lib/query';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (cors(req, res)) return;
  if (req.method !== 'GET') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const user = await authenticateDashboard(req, res);
  if (!user) return;
  if (!authorizeAppAccess(user, req.query.app_id as string, res)) return;

  return queryAnalytics(req, res, 'api_call');
}
