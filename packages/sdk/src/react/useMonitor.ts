import { createContext, useContext } from 'react';
import type { MonitorClient } from '../core/MonitorClient';

export const MonitorContext = createContext<MonitorClient | null>(null);

export function useMonitor(): MonitorClient {
  const client = useContext(MonitorContext);
  if (!client) {
    throw new Error('useMonitor must be used within a <MonitorProvider>');
  }
  return client;
}
