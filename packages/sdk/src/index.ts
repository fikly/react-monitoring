export { MonitorClient } from './core/MonitorClient';
export { EventQueue } from './core/EventQueue';
export { Transport } from './core/Transport';
export { SessionManager } from './core/SessionManager';

export type {
  MonitorConfig,
  TrackEventInput,
  Tracker,
  EnrichPageViewData,
} from './types';

export type {
  MonitorEvent,
  EventType,
  PageViewProperties,
  PageExitProperties,
  ClickProperties,
  ErrorProperties,
  ApiCallProperties,
  PerformanceProperties,
  CustomEventProperties,
} from '@web-monitor/shared';
