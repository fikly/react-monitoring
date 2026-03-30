import cron from 'node-cron';
import { supabase } from '../config/database';
import { MetricRepository } from '../repositories/MetricRepository';

export class AggregationService {
  private metricRepo = new MetricRepository();
  private hourlyTask: cron.ScheduledTask | null = null;
  private dailyTask: cron.ScheduledTask | null = null;

  startCronJobs(): void {
    // Run hourly aggregation every hour at minute 5
    this.hourlyTask = cron.schedule('5 * * * *', async () => {
      console.log('[Aggregation] Running hourly aggregation...');
      try {
        await this.aggregateHourly();
        console.log('[Aggregation] Hourly aggregation complete');
      } catch (err) {
        console.error('[Aggregation] Hourly aggregation failed:', err);
      }
    });

    // Run daily aggregation every day at 00:15
    this.dailyTask = cron.schedule('15 0 * * *', async () => {
      console.log('[Aggregation] Running daily aggregation...');
      try {
        await this.aggregateDaily();
        console.log('[Aggregation] Daily aggregation complete');
      } catch (err) {
        console.error('[Aggregation] Daily aggregation failed:', err);
      }
    });

    console.log('[Aggregation] Cron jobs started');
  }

  stopCronJobs(): void {
    this.hourlyTask?.stop();
    this.dailyTask?.stop();
    console.log('[Aggregation] Cron jobs stopped');
  }

  async aggregateHourly(): Promise<void> {
    const hour = new Date();
    hour.setMinutes(0, 0, 0);
    const prevHour = new Date(hour.getTime() - 60 * 60 * 1000);

    // Use Supabase RPC to run the aggregation query
    const { data, error } = await supabase.rpc('aggregate_hourly_metrics', {
      p_from: prevHour.toISOString(),
      p_to: hour.toISOString(),
    });

    if (error) {
      console.error('[Aggregation] Hourly RPC error:', error);
      return;
    }

    for (const row of (data || [])) {
      await this.metricRepo.upsertHourlyMetric({
        appId: row.app_id,
        hour: prevHour,
        eventType: row.event_type,
        path: row.path,
        count: parseInt(row.count, 10),
        uniqueSessions: parseInt(row.unique_sessions, 10),
        uniqueUsers: parseInt(row.unique_users, 10),
        avgValue: row.avg_value ? parseFloat(row.avg_value) : undefined,
        p50Value: row.p50_value ? parseFloat(row.p50_value) : undefined,
        p95Value: row.p95_value ? parseFloat(row.p95_value) : undefined,
        p99Value: row.p99_value ? parseFloat(row.p99_value) : undefined,
      });
    }
  }

  async aggregateDaily(): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

    const { data, error } = await supabase.rpc('aggregate_daily_metrics', {
      p_from: yesterday.toISOString(),
      p_to: today.toISOString(),
    });

    if (error) {
      console.error('[Aggregation] Daily RPC error:', error);
      return;
    }

    for (const row of (data || [])) {
      await this.metricRepo.upsertDailyMetric({
        appId: row.app_id,
        day: yesterday,
        eventType: row.event_type,
        path: row.path,
        count: parseInt(row.count, 10),
        uniqueSessions: parseInt(row.unique_sessions, 10),
        uniqueUsers: parseInt(row.unique_users, 10),
        avgValue: row.avg_value ? parseFloat(row.avg_value) : undefined,
        p50Value: row.p50_value ? parseFloat(row.p50_value) : undefined,
        p95Value: row.p95_value ? parseFloat(row.p95_value) : undefined,
        p99Value: row.p99_value ? parseFloat(row.p99_value) : undefined,
      });
    }
  }
}
