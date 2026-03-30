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

export function usePageViews(filters: QueryFilters) {
  return useQuery({
    queryKey: ['page-views', filters],
    queryFn: () => fetchPageViews(filters),
    enabled: !!filters.app_id,
  });
}

export function useErrors(filters: QueryFilters) {
  return useQuery({
    queryKey: ['errors', filters],
    queryFn: () => fetchErrors(filters),
    enabled: !!filters.app_id,
  });
}

export function usePerformance(filters: QueryFilters) {
  return useQuery({
    queryKey: ['performance', filters],
    queryFn: () => fetchPerformance(filters),
    enabled: !!filters.app_id,
  });
}

export function useApiCalls(filters: QueryFilters) {
  return useQuery({
    queryKey: ['api-calls', filters],
    queryFn: () => fetchApiCalls(filters),
    enabled: !!filters.app_id,
  });
}

export function useSessions(filters: QueryFilters) {
  return useQuery({
    queryKey: ['sessions', filters],
    queryFn: () => fetchSessions(filters),
    enabled: !!filters.app_id,
  });
}

export function useFeatureUsage(filters: QueryFilters) {
  return useQuery({
    queryKey: ['feature-usage', filters],
    queryFn: () => fetchFeatureUsage(filters),
    enabled: !!filters.app_id,
  });
}

export function useRawEvents(filters: QueryFilters & { event_type?: string }) {
  return useQuery({
    queryKey: ['raw-events', filters],
    queryFn: () => fetchRawEvents(filters),
    enabled: !!filters.app_id,
  });
}
