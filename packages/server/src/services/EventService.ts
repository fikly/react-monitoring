import type { MonitorEvent, BatchEventResponse } from '@web-monitor/shared';
import { EventRepository } from '../repositories/EventRepository';

export class EventService {
  private eventRepo = new EventRepository();

  async ingestBatch(appId: string, events: MonitorEvent[]): Promise<BatchEventResponse> {
    // Override app_id from the authenticated header to prevent spoofing
    const sanitizedEvents = events.map((event) => ({
      ...event,
      app_id: appId,
    }));

    const { inserted, errors } = await this.eventRepo.insertBatch(sanitizedEvents);

    // Update session data asynchronously (non-blocking)
    this.updateSessions(sanitizedEvents).catch((err) =>
      console.error('[EventService] Session update error:', err),
    );

    return {
      accepted: inserted,
      rejected: errors.length,
      errors,
    };
  }

  private async updateSessions(events: MonitorEvent[]): Promise<void> {
    // Group events by session to batch updates
    const sessionMap = new Map<string, MonitorEvent>();
    for (const event of events) {
      // Keep the latest event per session
      const existing = sessionMap.get(event.session_id);
      if (!existing || event.timestamp > existing.timestamp) {
        sessionMap.set(event.session_id, event);
      }
    }

    for (const event of sessionMap.values()) {
      try {
        await this.eventRepo.upsertSession(event);
      } catch (err) {
        console.error('[EventService] Failed to upsert session:', err);
      }
    }
  }
}
