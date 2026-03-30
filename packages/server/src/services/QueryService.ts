import type { AnalyticsQueryParams, AnalyticsResponse } from '@web-monitor/shared';
import { EventRepository } from '../repositories/EventRepository';
import { MetricRepository } from '../repositories/MetricRepository';

export class QueryService {
  private eventRepo = new EventRepository();
  private metricRepo = new MetricRepository();

  async getPageViews(params: AnalyticsQueryParams): Promise<AnalyticsResponse> {
    return this.queryByEventType('page_view', params);
  }

  async getErrors(params: AnalyticsQueryParams): Promise<AnalyticsResponse> {
    return this.queryByEventType('error', params);
  }

  async getPerformance(params: AnalyticsQueryParams): Promise<AnalyticsResponse> {
    return this.queryByEventType('performance', params);
  }

  async getApiCalls(params: AnalyticsQueryParams): Promise<AnalyticsResponse> {
    return this.queryByEventType('api_call', params);
  }

  async getSessions(params: AnalyticsQueryParams): Promise<AnalyticsResponse> {
    const result = await this.eventRepo.queryEvents({
      appId: params.app_id,
      from: params.from,
      to: params.to,
      eventType: 'page_view',
      path: params.path,
      groupBy: params.group_by || 'day',
      limit: params.limit || 100,
      offset: params.offset || 0,
    });

    return {
      data: result.rows.map((row) => ({
        period: String(row.period),
        count: Number(row.count || 0),
        unique_sessions: Number(row.unique_sessions || 0),
        unique_users: Number(row.unique_users || 0),
      })),
      total: result.total,
      query: params,
    };
  }

  async getFeatureUsage(params: AnalyticsQueryParams): Promise<AnalyticsResponse> {
    return this.queryByEventType('click', params);
  }

  async getRawEvents(params: AnalyticsQueryParams): Promise<{
    data: Record<string, unknown>[];
    total: number;
    query: AnalyticsQueryParams;
  }> {
    const result = await this.eventRepo.queryRawEvents({
      appId: params.app_id,
      from: params.from,
      to: params.to,
      eventType: params.event_type,
      path: params.path,
      limit: params.limit || 100,
      offset: params.offset || 0,
    });

    return {
      data: result.rows,
      total: result.total,
      query: params,
    };
  }

  private async queryByEventType(
    eventType: string,
    params: AnalyticsQueryParams,
  ): Promise<AnalyticsResponse> {
    const timeRange = this.getTimeRangeHours(params.from, params.to);
    const groupBy = params.group_by || (timeRange > 24 ? 'day' : 'hour');

    // Try pre-aggregated metrics for larger time ranges, fall back to raw events
    if (timeRange > 24 && (groupBy === 'day' || groupBy === 'hour')) {
      const metricsResult = await this.queryFromMetrics(eventType, params, groupBy);
      if (metricsResult.data.length > 0) {
        return metricsResult;
      }
      // Metrics tables empty — fall through to raw events
    }

    // Query raw events directly
    const result = await this.eventRepo.queryEvents({
      appId: params.app_id,
      from: params.from,
      to: params.to,
      eventType,
      path: params.path,
      groupBy,
      limit: params.limit || 100,
      offset: params.offset || 0,
    });

    return {
      data: result.rows.map((row) => ({
        period: String(row.period || ''),
        count: Number(row.count || 0),
        unique_sessions: Number(row.unique_sessions || 0),
        unique_users: Number(row.unique_users || 0),
        avg_value: row.avg_value ? Number(row.avg_value) : undefined,
        p50_value: row.p50_value ? Number(row.p50_value) : undefined,
        p95_value: row.p95_value ? Number(row.p95_value) : undefined,
        p99_value: row.p99_value ? Number(row.p99_value) : undefined,
      })),
      total: result.total,
      query: params,
    };
  }

  private async queryFromMetrics(
    eventType: string,
    params: AnalyticsQueryParams,
    groupBy: 'day' | 'hour',
  ): Promise<AnalyticsResponse> {
    const repo = this.metricRepo;
    const queryParams = {
      appId: params.app_id,
      from: params.from,
      to: params.to,
      eventType,
      path: params.path,
      limit: params.limit || 100,
      offset: params.offset || 0,
    };

    const result =
      groupBy === 'day'
        ? await repo.queryDaily(queryParams)
        : await repo.queryHourly(queryParams);

    return {
      data: result.rows.map((row) => ({
        period: String(row.period),
        count: Number(row.count || 0),
        unique_sessions: Number(row.unique_sessions || 0),
        unique_users: Number(row.unique_users || 0),
        avg_value: row.avg_value ? Number(row.avg_value) : undefined,
        p50_value: row.p50_value ? Number(row.p50_value) : undefined,
        p95_value: row.p95_value ? Number(row.p95_value) : undefined,
        p99_value: row.p99_value ? Number(row.p99_value) : undefined,
      })),
      total: result.total,
      query: params,
    };
  }

  private getTimeRangeHours(from: string, to: string): number {
    const fromDate = new Date(from);
    const toDate = new Date(to);
    return (toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60);
  }
}
