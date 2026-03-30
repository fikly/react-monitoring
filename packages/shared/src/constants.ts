export const DEFAULT_BATCH_SIZE = 20;
export const DEFAULT_FLUSH_INTERVAL_MS = 10_000;
export const DEFAULT_SAMPLE_RATE = 1.0;
export const MAX_STACK_LENGTH = 4096;
export const MAX_TEXT_LENGTH = 200;
export const MAX_URL_LENGTH = 2048;
export const MAX_EVENTS_PER_BATCH = 100;

export const EVENT_TYPES = [
  'page_view',
  'page_exit',
  'click',
  'error',
  'api_call',
  'performance',
  'custom',
] as const;

export const PERFORMANCE_METRICS = [
  'CLS',
  'FID',
  'FCP',
  'LCP',
  'TTFB',
  'INP',
] as const;

export const API_VERSIONS = {
  V1: '/api/v1',
} as const;

export const ENDPOINTS = {
  BATCH_EVENTS: '/api/v1/events/batch',
  PAGE_VIEWS: '/api/v1/analytics/page-views',
  ERRORS: '/api/v1/analytics/errors',
  PERFORMANCE: '/api/v1/analytics/performance',
  API_CALLS: '/api/v1/analytics/api-calls',
  SESSIONS: '/api/v1/analytics/sessions',
  FEATURE_USAGE: '/api/v1/analytics/feature-usage',
  HEALTH: '/api/v1/health',
} as const;
