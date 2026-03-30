import type { VercelRequest, VercelResponse } from '@vercel/node';
import { cors } from '../../_lib/cors';
import { authenticate } from '../../_lib/auth';
import { queryRawEvents } from '../../_lib/query';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (cors(req, res)) return;
  if (req.method !== 'GET') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const appId = await authenticate(req, res);
  if (!appId) return;

  return queryRawEvents(req, res);
}
