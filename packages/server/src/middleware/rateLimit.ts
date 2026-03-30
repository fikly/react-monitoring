import rateLimit from 'express-rate-limit';
import { config } from '../config/env';

export const apiRateLimit = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  keyGenerator: (req) => {
    // Rate limit per app_id
    return (req.headers['x-app-id'] as string) || req.ip || 'unknown';
  },
  message: {
    error: 'Too many requests, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
