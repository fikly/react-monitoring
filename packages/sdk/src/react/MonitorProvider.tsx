import React from 'react';
import type { MonitorClient } from '../core/MonitorClient';
import { MonitorContext } from './useMonitor';

interface MonitorProviderProps {
  monitor: MonitorClient;
  children: React.ReactNode;
}

export const MonitorProvider: React.FC<MonitorProviderProps> = ({
  monitor,
  children,
}) => {
  return (
    <MonitorContext.Provider value={monitor}>
      {children}
    </MonitorContext.Provider>
  );
};
