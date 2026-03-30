import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

const eventSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(['page_view', 'page_exit', 'click', 'error', 'api_call', 'performance', 'custom']),
  app_id: z.string().max(64),
  session_id: z.string().max(64),
  user_id: z.string().max(255).optional(),
  timestamp: z.string().datetime(),
  url: z.string().max(2048),
  path: z.string().max(1024),
  user_agent: z.string().max(500).optional(),
  screen_resolution: z.string().max(20).optional(),
  viewport_size: z.string().max(20).optional(),
  properties: z.record(z.unknown()).default({}),
  metadata: z.record(z.string()).optional(),
});

const batchSchema = z.object({
  events: z.array(eventSchema).min(1).max(100),
});

export function validateBatchEvents(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const result = batchSchema.safeParse(req.body);

  if (!result.success) {
    const errors = result.error.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    }));

    res.status(400).json({
      error: 'Validation failed',
      details: errors,
    });
    return;
  }

  req.body = result.data;
  next();
}

const queryParamsSchema = z.object({
  app_id: z.string(),
  from: z.string().datetime(),
  to: z.string().datetime(),
  group_by: z.enum(['hour', 'day', 'path', 'message', 'url', 'status', 'track_id']).optional(),
  path: z.string().optional(),
  event_type: z.enum(['page_view', 'page_exit', 'click', 'error', 'api_call', 'performance', 'custom']).optional(),
  limit: z.coerce.number().int().min(1).max(1000).default(100),
  offset: z.coerce.number().int().min(0).default(0),
});

export function validateQueryParams(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const result = queryParamsSchema.safeParse(req.query);

  if (!result.success) {
    const errors = result.error.issues.map((issue) => ({
      path: issue.path.join('.'),
      message: issue.message,
    }));

    res.status(400).json({
      error: 'Invalid query parameters',
      details: errors,
    });
    return;
  }

  (req as Request & { queryParams: z.infer<typeof queryParamsSchema> }).queryParams = result.data;
  next();
}
