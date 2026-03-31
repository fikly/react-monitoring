import { useCallback } from 'react';
import type { EventType } from '@pirates_coder/web-monitor-shared';
import { useMonitor } from './useMonitor';

export function useTrackEvent() {
  const monitor = useMonitor();

  return useCallback(
    (
      type: EventType,
      properties: Record<string, unknown>,
      metadata?: Record<string, string>,
    ) => {
      monitor.track({ type, properties, metadata });
    },
    [monitor],
  );
}

export function useTrackFeature() {
  const monitor = useMonitor();

  return useCallback(
    (featureName: string, metadata?: Record<string, unknown>) => {
      monitor.track({
        type: 'custom',
        properties: {
          action: 'feature_use',
          feature: featureName,
          ...metadata,
        },
      });
    },
    [monitor],
  );
}
