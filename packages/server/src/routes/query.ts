import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { validateQueryParams } from '../middleware/validate';
import { QueryService } from '../services/QueryService';
import { AggregationService } from '../services/AggregationService';
import type { AnalyticsQueryParams } from '@web-monitor/shared';

const router = Router();
const queryService = new QueryService();
const aggregationService = new AggregationService();

type AuthenticatedRequest = Request & {
  appId: string;
  queryParams: AnalyticsQueryParams;
};

router.get(
  '/d/page-views',
  authMiddleware,
  validateQueryParams,
  async (req: Request, res: Response) => {
    try {
      const { queryParams } = req as AuthenticatedRequest;
      const result = await queryService.getPageViews(queryParams);
      res.json(result);
    } catch (err) {
      console.error('[Query] Error:', err);
      res.status(500).json({ error: 'Query failed' });
    }
  },
);

router.get(
  '/d/errors',
  authMiddleware,
  validateQueryParams,
  async (req: Request, res: Response) => {
    try {
      const { queryParams } = req as AuthenticatedRequest;
      const result = await queryService.getErrors(queryParams);
      res.json(result);
    } catch (err) {
      console.error('[Query] Error:', err);
      res.status(500).json({ error: 'Query failed' });
    }
  },
);

router.get(
  '/d/performance',
  authMiddleware,
  validateQueryParams,
  async (req: Request, res: Response) => {
    try {
      const { queryParams } = req as AuthenticatedRequest;
      const result = await queryService.getPerformance(queryParams);
      res.json(result);
    } catch (err) {
      console.error('[Query] Error:', err);
      res.status(500).json({ error: 'Query failed' });
    }
  },
);

router.get(
  '/d/api-calls',
  authMiddleware,
  validateQueryParams,
  async (req: Request, res: Response) => {
    try {
      const { queryParams } = req as AuthenticatedRequest;
      const result = await queryService.getApiCalls(queryParams);
      res.json(result);
    } catch (err) {
      console.error('[Query] Error:', err);
      res.status(500).json({ error: 'Query failed' });
    }
  },
);

router.get(
  '/d/sessions',
  authMiddleware,
  validateQueryParams,
  async (req: Request, res: Response) => {
    try {
      const { queryParams } = req as AuthenticatedRequest;
      const result = await queryService.getSessions(queryParams);
      res.json(result);
    } catch (err) {
      console.error('[Query] Error:', err);
      res.status(500).json({ error: 'Query failed' });
    }
  },
);

router.get(
  '/d/feature-usage',
  authMiddleware,
  validateQueryParams,
  async (req: Request, res: Response) => {
    try {
      const { queryParams } = req as AuthenticatedRequest;
      const result = await queryService.getFeatureUsage(queryParams);
      res.json(result);
    } catch (err) {
      console.error('[Query] Error:', err);
      res.status(500).json({ error: 'Query failed' });
    }
  },
);

// Raw events with full properties and metadata
router.get(
  '/d/records',
  authMiddleware,
  validateQueryParams,
  async (req: Request, res: Response) => {
    try {
      const { queryParams } = req as AuthenticatedRequest;
      const result = await queryService.getRawEvents(queryParams);
      res.json(result);
    } catch (err) {
      console.error('[Query] Error:', err);
      res.status(500).json({ error: 'Query failed' });
    }
  },
);

// Manual aggregation trigger
router.post(
  '/d/aggregate',
  authMiddleware,
  async (_req: Request, res: Response) => {
    try {
      await aggregationService.aggregateHourly();
      await aggregationService.aggregateDaily();
      res.json({ status: 'ok', message: 'Aggregation completed' });
    } catch (err) {
      console.error('[Aggregation] Error:', err);
      res.status(500).json({ error: 'Aggregation failed' });
    }
  },
);

export default router;
