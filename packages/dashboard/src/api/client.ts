import axios from 'axios';
import type { AnalyticsResponse, QueryFilters } from '@/types';
import { supabase } from '@/lib/supabase';

const API_BASE = import.meta.env.VITE_API_BASE || '/api/v1';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT to every request
api.interceptors.request.use(async (config) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`;
  }
  return config;
});

// Handle 401 (expired token)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && !error.config._retry) {
      error.config._retry = true;
      const { error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError) {
        window.location.href = '/login';
        return Promise.reject(error);
      }
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        error.config.headers.Authorization = `Bearer ${session.access_token}`;
      }
      return api.request(error.config);
    }
    return Promise.reject(error);
  }
);

export default api;

function buildParams(filters: QueryFilters): Record<string, string> {
  const params: Record<string, string> = {
    app_id: filters.app_id,
    from: filters.from,
    to: filters.to,
  };
  if (filters.group_by) params.group_by = filters.group_by;
  if (filters.path) params.path = filters.path;
  if (filters.event_type) params.event_type = filters.event_type;
  if (filters.limit) params.limit = String(filters.limit);
  if (filters.offset) params.offset = String(filters.offset);
  return params;
}

export async function fetchPageViews(filters: QueryFilters): Promise<AnalyticsResponse> {
  const { data } = await api.get('/d/page-views', { params: buildParams(filters) });
  return data;
}

export async function fetchErrors(filters: QueryFilters): Promise<AnalyticsResponse> {
  const { data } = await api.get('/d/errors', { params: buildParams(filters) });
  return data;
}

export async function fetchPerformance(filters: QueryFilters): Promise<AnalyticsResponse> {
  const { data } = await api.get('/d/performance', { params: buildParams(filters) });
  return data;
}

export async function fetchApiCalls(filters: QueryFilters): Promise<AnalyticsResponse> {
  const { data } = await api.get('/d/api-calls', { params: buildParams(filters) });
  return data;
}

export async function fetchSessions(filters: QueryFilters): Promise<AnalyticsResponse> {
  const { data } = await api.get('/d/sessions', { params: buildParams(filters) });
  return data;
}

export async function fetchFeatureUsage(filters: QueryFilters): Promise<AnalyticsResponse> {
  const { data } = await api.get('/d/feature-usage', { params: buildParams(filters) });
  return data;
}

export interface RawEventsResponse {
  data: RawEventRecord[];
  total: number;
  query: QueryFilters;
}

export interface RawEventRecord {
  id: string;
  app_id: string;
  event_type: string;
  session_id: string;
  user_id?: string;
  path: string;
  url: string;
  properties: Record<string, unknown>;
  metadata: Record<string, string>;
  user_agent?: string;
  screen_resolution?: string;
  viewport_size?: string;
  client_timestamp: string;
  created_at: string;
}

export async function fetchRawEvents(filters: QueryFilters & { event_type?: string }): Promise<RawEventsResponse> {
  const { data } = await api.get('/d/records', { params: buildParams(filters) });
  return data;
}

export async function fetchHealth(): Promise<{ status: string; uptime: number }> {
  const { data } = await api.get('/health');
  return data;
}
