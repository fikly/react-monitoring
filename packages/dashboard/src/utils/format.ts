import dayjs from 'dayjs';

export function formatNumber(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return String(value);
}

export function formatMs(ms: number): string {
  if (ms >= 1000) return `${(ms / 1000).toFixed(2)}s`;
  return `${Math.round(ms)}ms`;
}

export function formatDate(date: string, format = 'MMM DD'): string {
  return dayjs(date).format(format);
}

export function formatDateTime(date: string): string {
  return dayjs(date).format('MMM DD, HH:mm');
}

export function getDefaultDateRange() {
  return {
    from: dayjs().subtract(7, 'day').startOf('day').toISOString(),
    to: dayjs().endOf('day').toISOString(),
  };
}

export function getVitalRating(name: string, value: number): 'good' | 'needs-improvement' | 'poor' {
  const thresholds: Record<string, [number, number]> = {
    LCP: [2500, 4000],
    FID: [100, 300],
    CLS: [0.1, 0.25],
    FCP: [1800, 3000],
    TTFB: [800, 1800],
    INP: [200, 500],
  };

  const t = thresholds[name];
  if (!t) return 'good';
  if (value <= t[0]) return 'good';
  if (value <= t[1]) return 'needs-improvement';
  return 'poor';
}

export const VITAL_COLORS = {
  good: '#52c41a',
  'needs-improvement': '#faad14',
  poor: '#ff4d4f',
};
