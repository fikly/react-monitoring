import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { validateBatchEvents } from '../middleware/validate';
import { apiRateLimit } from '../middleware/rateLimit';
import { EventService } from '../services/EventService';
import type { BatchEventPayload } from '@web-monitor/shared';

const router = Router();
const eventService = new EventService();

router.post(
  '/events/batch',
  apiRateLimit,
  authMiddleware,
  validateBatchEvents,
  async (req: Request, res: Response) => {
    try {
      const payload = req.body as BatchEventPayload;
      const appId = (req as Request & { appId: string }).appId;

      const result = await eventService.ingestBatch(appId, payload.events);

      res.status(202).json(result);
    } catch (err) {
      console.error('[Ingest] Error:', err);
      res.status(500).json({ error: 'Failed to process events' });
    }
  },
);

export default router;
