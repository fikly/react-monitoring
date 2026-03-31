import { MAX_URL_LENGTH } from '@pirates_coder/web-monitor-shared';
import type { Tracker } from '../types';
import type { MonitorClient } from '../core/MonitorClient';

interface AxiosInstance {
  interceptors: {
    request: {
      use: (
        onFulfilled: (config: AxiosRequestConfig) => AxiosRequestConfig,
        onRejected?: (error: unknown) => unknown,
      ) => number;
      eject: (id: number) => void;
    };
    response: {
      use: (
        onFulfilled: (response: AxiosResponse) => AxiosResponse,
        onRejected?: (error: unknown) => unknown,
      ) => number;
      eject: (id: number) => void;
    };
  };
}

interface AxiosRequestConfig {
  url?: string;
  method?: string;
  __monitorStartTime?: number;
  [key: string]: unknown;
}

interface AxiosResponse {
  config: AxiosRequestConfig;
  status: number;
  data?: unknown;
  [key: string]: unknown;
}

interface AxiosError {
  config?: AxiosRequestConfig;
  response?: { status: number };
  message: string;
}

export class ApiTracker implements Tracker {
  private client: MonitorClient;
  private requestInterceptorId: number | null = null;
  private responseInterceptorId: number | null = null;
  private axiosInstance: AxiosInstance | null = null;

  constructor(client: MonitorClient) {
    this.client = client;
  }

  start(): void {
    // No-op: trackers are attached via attachToAxios
  }

  stop(): void {
    if (this.axiosInstance) {
      if (this.requestInterceptorId !== null) {
        this.axiosInstance.interceptors.request.eject(this.requestInterceptorId);
      }
      if (this.responseInterceptorId !== null) {
        this.axiosInstance.interceptors.response.eject(this.responseInterceptorId);
      }
      this.requestInterceptorId = null;
      this.responseInterceptorId = null;
      this.axiosInstance = null;
    }
  }

  attachToAxios(instance: unknown): void {
    const axios = instance as AxiosInstance;
    if (!axios?.interceptors?.request?.use || !axios?.interceptors?.response?.use) {
      if (this.client.getConfig().debug) {
        console.warn('[WebMonitor] Invalid Axios instance provided');
      }
      return;
    }

    this.axiosInstance = axios;

    // Request interceptor: stamp start time
    this.requestInterceptorId = axios.interceptors.request.use(
      (config: AxiosRequestConfig) => {
        config.__monitorStartTime = performance.now();
        return config;
      },
    );

    // Response interceptor: measure duration, track
    this.responseInterceptorId = axios.interceptors.response.use(
      (response: AxiosResponse) => {
        this.trackApiCall(response.config, response.status, false);
        return response;
      },
      (error: unknown) => {
        const axiosError = error as AxiosError;
        if (axiosError?.config) {
          this.trackApiCall(
            axiosError.config,
            axiosError.response?.status,
            true,
            axiosError.message,
          );
        }
        return Promise.reject(error);
      },
    );
  }

  private trackApiCall(
    config: AxiosRequestConfig,
    status: number | undefined,
    isError: boolean,
    errorMessage?: string,
  ): void {
    const url = config.url || '';

    // Skip tracking the monitor's own requests
    if (url.includes(this.client.getTransportEndpoint())) return;

    const duration = config.__monitorStartTime
      ? Math.round(performance.now() - config.__monitorStartTime)
      : undefined;

    this.client.track({
      type: 'api_call',
      properties: {
        method: (config.method || 'GET').toUpperCase(),
        url: this.sanitizeUrl(url),
        status,
        duration_ms: duration,
        is_error: isError,
        error_message: errorMessage,
      },
    });
  }

  private sanitizeUrl(url: string): string {
    try {
      const parsed = new URL(url, window.location.origin);
      // Remove query params that might contain sensitive data
      parsed.search = '';
      const sanitized = parsed.toString();
      return sanitized.substring(0, MAX_URL_LENGTH);
    } catch {
      return url.substring(0, MAX_URL_LENGTH);
    }
  }
}
