import { useQuery } from '@tanstack/react-query';
import {
  fetchPageViews,
  fetchErrors,
  fetchPerformance,
  fetchApiCalls,
  fetchSessions,
  fetchFeatureUsage,
  fetchRawEvents,
} from '@/api/client';
import type { QueryFilters } from '@/types';

const DEFAULT_APP_ID = import.meta.env.VITE_APP_ID || 'my-app';

export function useFilters(
  overrides: Partial<QueryFilters> & { from: string; to: string },
): QueryFilters {
  return {
    app_id: DEFAULT_APP_ID,
    group_by: 'day',
    ...overrides,
  };
}

export function usePageViews(filters: QueryFilters) {
  return useQuery({
    queryKey: ['page-views', filters],
    queryFn: () => fetchPageViews(filters),
  });
}

export function useErrors(filters: QueryFilters) {
  return useQuery({
    queryKey: ['errors', filters],
    queryFn: () => fetchErrors(filters),
  });
}

export function usePerformance(filters: QueryFilters) {
  return useQuery({
    queryKey: ['performance', filters],
    queryFn: () => fetchPerformance(filters),
  });
}

export function useApiCalls(filters: QueryFilters) {
  return useQuery({
    queryKey: ['api-calls', filters],
    queryFn: () => fetchApiCalls(filters),
  });
}

export function useSessions(filters: QueryFilters) {
  return useQuery({
    queryKey: ['sessions', filters],
    queryFn: () => fetchSessions(filters),
  });
}

export function useFeatureUsage(filters: QueryFilters) {
  return useQuery({
    queryKey: ['feature-usage', filters],
    queryFn: () => fetchFeatureUsage(filters),
  });
}

export function useRawEvents(filters: QueryFilters & { event_type?: string }) {
  return useQuery({
    queryKey: ['raw-events', filters],
    queryFn: () => fetchRawEvents(filters),
  });
}
